import { randomUUID } from 'node:crypto';

// 共用儲存，類似 Redis。每個操作本身是原子的，但兩次呼叫之間其他伺服器可能已經改過資料。
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean>; // nx：key 已存在就不寫並回 false；px：存活毫秒數
  del(key: string): Promise<boolean>;                    // 回傳 key 原本是否存在
  incrBy(key: string, n: number): Promise<number>;       // key 不存在視為 0，回傳加完的值
  sAdd(key: string, member: string): Promise<boolean>;   // 集合；回傳是否新加入
  sRem(key: string, member: string): Promise<boolean>;   // 回傳是否真的移除
  sMembers(key: string): Promise<string[]>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
export type SaleInput = { saleId: string; quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
export type GrabInput = { saleId: string; customerId: string; qty: number; requestId: string };
export type HoldStatus = 'HELD' | 'PAID' | 'EXPIRED';   // 保留中／已成交／已釋放
export type Hold = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string; status: HoldStatus };

export interface FlashSale {
  openSale(input: SaleInput): Promise<Result<null>>;
  grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>>;
  pay(holdId: string): Promise<Result<null>>;            // 金流的付款成功通知
  sweep(): Promise<void>;                                // 排程：釋放到期未付款的保留
  getRemaining(saleId: string): Promise<number>;         // 商品頁顯示的剩餘件數
  getHold(holdId: string): Promise<Hold | null>;
}

// ---- 常數與型別（模組層級只有不可變常數，沒有可變狀態） ----

const HOLD_MINUTES = 10;
const HOLD_MS = HOLD_MINUTES * 60_000;
const REPLAY_POLL_LIMIT = 1000;
const CANCELLED_PREFIX = 'CANCELLED:';
/** 搶佔名額時，因其他併發請求暫時佔用槽而不足，最多重試的輪數（見 plan R4）。 */
const CLAIM_ROUNDS = 50;

type SaleRecord = { saleId: string; quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
type HoldRecord = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string };
type RequestRecord = { customerId: string; qty: number; holdId: string };

const enc = (s: string): string => encodeURIComponent(s);

const keys = {
  sale: (saleId: string) => `flash:sale:${enc(saleId)}`,
  sales: 'flash:sales',
  saleHolds: (saleId: string) => `flash:sale-holds:${enc(saleId)}`,
  slot: (saleId: string, i: number) => `flash:slot:${enc(saleId)}:${i}`,
  cslot: (saleId: string, customerId: string, j: number) => `flash:cslot:${enc(saleId)}:${enc(customerId)}:${j}`,
  request: (saleId: string, requestId: string) => `flash:req:${enc(saleId)}:${enc(requestId)}`,
  hold: (holdId: string) => `flash:hold:${holdId}`,
  end: (holdId: string) => `flash:end:${holdId}`,
  confirmed: (holdId: string) => `flash:ok:${holdId}`,
  freed: (holdId: string) => `flash:freed:${holdId}`,
};

// ---- 小工具 ----

function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseTime(iso: unknown): number {
  return typeof iso === 'string' ? Date.parse(iso) : Number.NaN;
}

function formatIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function readJson<T>(store: Store, key: string): Promise<T | null> {
  const raw = await store.get(key);
  return raw === null ? null : (JSON.parse(raw) as T);
}

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = (): number => Date.parse(now());

  async function loadSale(saleId: string): Promise<SaleRecord | null> {
    return readJson<SaleRecord>(store, keys.sale(saleId));
  }

  /** 只刪除值仍等於本 holdId 的槽，避免誤刪其他保留新搶到的槽。 */
  async function releaseOwnSlots(
    holdId: string,
    saleId: string,
    customerId: string,
    slotIdx: number[],
    cslotIdx: number[],
  ): Promise<void> {
    for (const i of slotIdx) {
      const key = keys.slot(saleId, i);
      if ((await store.get(key)) === holdId) await store.del(key);
    }
    for (const j of cslotIdx) {
      const key = keys.cslot(saleId, customerId, j);
      if ((await store.get(key)) === holdId) await store.del(key);
    }
  }

  /**
   * 搶佔 need 個空位（槽由 keyOf(1..max) 指定）。
   * 不足時先回滾自己已搶到的槽，讓出執行權後重試；他人暫時佔用的槽會在他們回滾後釋出，
   * 因此名額足夠時不會因同時搶而失敗。超過輪數仍不足才回 null。
   */
  async function claimUnits(
    holdId: string,
    need: number,
    max: number,
    keyOf: (idx: number) => string,
  ): Promise<number[] | null> {
    if (need > max) return null;
    for (let round = 0; round < CLAIM_ROUNDS; round++) {
      const got: number[] = [];
      for (let idx = 1; idx <= max && got.length < need; idx++) {
        if (await store.set(keyOf(idx), holdId, { nx: true })) got.push(idx);
      }
      if (got.length === need) return got;
      for (const idx of got) {
        const key = keyOf(idx);
        if ((await store.get(key)) === holdId) await store.del(key);
      }
      await Promise.resolve();
    }
    return null;
  }

  async function cancelGrab(
    hold: HoldRecord,
    reason: string,
    slotIdx: number[],
    cslotIdx: number[],
  ): Promise<{ ok: false; reason: string }> {
    await releaseOwnSlots(hold.holdId, hold.saleId, hold.customerId, slotIdx, cslotIdx);
    await store.set(keys.end(hold.holdId), `${CANCELLED_PREFIX}${reason}`, { nx: true });
    return fail(reason);
  }

  /** 同一 requestId 的重送：回傳第一次的結果；內容不同視為衝突。 */
  async function replayGrab(
    saleId: string,
    requestId: string,
    mine: RequestRecord,
  ): Promise<{ ok: true; value: { holdId: string; expiresAt: string } } | { ok: false; reason: string }> {
    const prev = await readJson<RequestRecord>(store, keys.request(saleId, requestId));
    if (!prev) return fail('SOLD_OUT');
    if (prev.customerId !== mine.customerId || prev.qty !== mine.qty) return fail('REQUEST_CONFLICT');

    for (let attempt = 0; attempt < REPLAY_POLL_LIMIT; attempt++) {
      if ((await store.get(keys.confirmed(prev.holdId))) !== null) {
        const hold = await readJson<HoldRecord>(store, keys.hold(prev.holdId));
        if (hold) return ok({ holdId: hold.holdId, expiresAt: hold.expiresAt });
      }
      const end = await store.get(keys.end(prev.holdId));
      if (end !== null) {
        return fail(end.startsWith(CANCELLED_PREFIX) ? end.slice(CANCELLED_PREFIX.length) : 'HOLD_EXPIRED');
      }
      // 第一次請求尚未決定：讓出執行權後再讀（見 plan R2）
      await Promise.resolve();
    }
    // 第一次請求仍未決定（例如該伺服器卡住或已當機）：回 REQUEST_IN_PROGRESS，且不保留任何件數（Q7）
    return fail('REQUEST_IN_PROGRESS');
  }

  /** 排程對單一保留的處理：到期未付款者決定為 RELEASED，並由唯一的釋放者歸還件數。 */
  async function settleHold(holdId: string): Promise<void> {
    const hold = await readJson<HoldRecord>(store, keys.hold(holdId));
    if (!hold) return;

    let end = await store.get(keys.end(holdId));
    if (end === null && nowMs() >= parseTime(hold.expiresAt)) {
      if (await store.set(keys.end(holdId), 'RELEASED', { nx: true })) {
        end = 'RELEASED';
      } else {
        end = await store.get(keys.end(holdId));
      }
    }
    if (end !== 'RELEASED') return;

    // 每個保留只會有一個釋放者（nx 標記）；已取消者在 grab 內已自行歸還
    if (!(await store.set(keys.freed(holdId), 'OK', { nx: true }))) return;

    const sale = await loadSale(hold.saleId);
    if (!sale) return;
    for (let i = 1; i <= sale.quantity; i++) {
      const key = keys.slot(sale.saleId, i);
      if ((await store.get(key)) === holdId) await store.del(key);
    }
    for (let j = 1; j <= sale.perCustomerLimit; j++) {
      const key = keys.cslot(sale.saleId, hold.customerId, j);
      if ((await store.get(key)) === holdId) await store.del(key);
    }
  }

  return {
    async openSale(input: SaleInput): Promise<Result<null>> {
      const { saleId, quantity, perCustomerLimit, startsAt, endsAt } = input;
      const start = parseTime(startsAt);
      const end = parseTime(endsAt);
      if (
        !isNonEmpty(saleId) ||
        !isPositiveInt(quantity) ||
        !isPositiveInt(perCustomerLimit) ||
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start >= end
      ) {
        return fail('INVALID_INPUT');
      }
      const record: SaleRecord = { saleId, quantity, perCustomerLimit, startsAt, endsAt };
      if (!(await store.set(keys.sale(saleId), JSON.stringify(record), { nx: true }))) {
        return fail('DUPLICATE_SALE');
      }
      await store.sAdd(keys.sales, saleId);
      return ok(null);
    },

    async grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>> {
      const { saleId, customerId, qty, requestId } = input;
      if (!isNonEmpty(saleId) || !isNonEmpty(customerId) || !isNonEmpty(requestId) || !isPositiveInt(qty)) {
        return fail('INVALID_INPUT');
      }
      const sale = await loadSale(saleId);
      if (!sale) return fail('SALE_NOT_FOUND');

      const t = nowMs();
      if (t < parseTime(sale.startsAt)) return fail('NOT_STARTED');
      if (t >= parseTime(sale.endsAt)) return fail('ENDED');

      const holdId = randomUUID();
      const mine: RequestRecord = { customerId, qty, holdId };
      if (!(await store.set(keys.request(saleId, requestId), JSON.stringify(mine), { nx: true }))) {
        return replayGrab(saleId, requestId, mine);
      }

      const hold: HoldRecord = { holdId, saleId, customerId, qty, expiresAt: formatIso(t + HOLD_MS) };
      await store.set(keys.hold(holdId), JSON.stringify(hold), { nx: true });
      await store.sAdd(keys.saleHolds(saleId), holdId);

      // 每位顧客的限購額度：搶佔 qty 個限購槽（不足時回滾並重試，見 claimUnits）
      const cslotIdx = await claimUnits(holdId, qty, sale.perCustomerLimit, (j) =>
        keys.cslot(saleId, customerId, j),
      );
      if (!cslotIdx) return cancelGrab(hold, 'LIMIT_EXCEEDED', [], []);

      // 件數：搶佔 qty 個件數槽（不足時回滾並重試，見 claimUnits）
      const slotIdx = await claimUnits(holdId, qty, sale.quantity, (i) => keys.slot(saleId, i));
      if (!slotIdx) return cancelGrab(hold, 'SOLD_OUT', [], cslotIdx);

      // 卡住期間若排程已決定釋放，本次搶到的槽必須自行歸還
      if ((await store.get(keys.end(holdId))) !== null) {
        await releaseOwnSlots(holdId, saleId, customerId, slotIdx, cslotIdx);
        return fail('HOLD_EXPIRED');
      }

      await store.set(keys.confirmed(holdId), 'OK', { nx: true });
      return ok({ holdId, expiresAt: hold.expiresAt });
    },

    async pay(holdId: string): Promise<Result<null>> {
      if (!isNonEmpty(holdId)) return fail('HOLD_NOT_FOUND');
      const hold = await readJson<HoldRecord>(store, keys.hold(holdId));
      if (!hold) return fail('HOLD_NOT_FOUND');
      if (nowMs() >= parseTime(hold.expiresAt)) return fail('HOLD_EXPIRED');

      const end = await store.get(keys.end(holdId));
      if (end === 'PAID') return ok(null);
      if (end !== null) return fail('HOLD_EXPIRED');

      if (await store.set(keys.end(holdId), 'PAID', { nx: true })) return ok(null);
      return (await store.get(keys.end(holdId))) === 'PAID' ? ok(null) : fail('HOLD_EXPIRED');
    },

    async sweep(): Promise<void> {
      const saleIds = await store.sMembers(keys.sales);
      for (const saleId of saleIds) {
        const holdIds = await store.sMembers(keys.saleHolds(saleId));
        for (const holdId of holdIds) {
          await settleHold(holdId);
        }
      }
    },

    async getRemaining(saleId: string): Promise<number> {
      const sale = await loadSale(saleId);
      if (!sale) return 0;
      let taken = 0;
      for (let i = 1; i <= sale.quantity; i++) {
        if ((await store.get(keys.slot(saleId, i))) !== null) taken++;
      }
      return sale.quantity - taken;
    },

    async getHold(holdId: string): Promise<Hold | null> {
      const hold = await readJson<HoldRecord>(store, keys.hold(holdId));
      if (!hold) return null;
      const end = await store.get(keys.end(holdId));
      const status: HoldStatus = end === 'PAID' ? 'PAID' : end === null ? 'HELD' : 'EXPIRED';
      return {
        holdId: hold.holdId,
        saleId: hold.saleId,
        customerId: hold.customerId,
        qty: hold.qty,
        expiresAt: hold.expiresAt,
        status,
      };
    },
  };
}
