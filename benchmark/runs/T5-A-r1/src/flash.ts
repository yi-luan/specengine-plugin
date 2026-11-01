// 限量搶購（flash sale）。
//
// 多台伺服器只共用一個 Store（類 Redis），每個 Store 操作本身原子，但沒有交易。
// 設計原則：
//   - 「能不能搶到」的決策點是 incrBy：先加再檢查，超過就減回去。這樣在任何並發下都不會超賣。
//   - 同一個 requestId 的重送一律收斂到同一張保留：holdId 由 saleId+requestId 決定，
//     保留紀錄與最終結果都用 set nx 寫入，寫不進去的一方回滾自己加過的件數，然後沿用已存在的那張。
//   - 保留狀態的轉移（HELD → PAID / EXPIRED）用 claim key 的 set nx 決定贏家，
//     付款通知重送、多台伺服器同時 sweep、付款與 sweep 互相競爭都只會成功轉移一次。
//   - 伺服器中途當機留下的半成品，由下一次重送（接手保留紀錄）或 sweep（完成未寫完的狀態轉移）收尾。

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean>;
  del(key: string): Promise<boolean>;
  incrBy(key: string, n: number): Promise<number>;
  sAdd(key: string, member: string): Promise<boolean>;
  sRem(key: string, member: string): Promise<boolean>;
  sMembers(key: string): Promise<string[]>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
export type SaleInput = { saleId: string; quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
export type GrabInput = { saleId: string; customerId: string; qty: number; requestId: string };
export type HoldStatus = 'HELD' | 'PAID' | 'EXPIRED';
export type Hold = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string; status: HoldStatus };

export interface FlashSale {
  openSale(input: SaleInput): Promise<Result<null>>;
  grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>>;
  pay(holdId: string): Promise<Result<null>>;
  sweep(): Promise<void>;
  getRemaining(saleId: string): Promise<number>;
  getHold(holdId: string): Promise<Hold | null>;
}

export const HOLD_TTL_MS = 10 * 60 * 1000;

export const Reasons = {
  INVALID_INPUT: 'INVALID_INPUT',
  SALE_EXISTS: 'SALE_EXISTS',
  SALE_NOT_FOUND: 'SALE_NOT_FOUND',
  NOT_STARTED: 'NOT_STARTED',
  ENDED: 'ENDED',
  INVALID_QTY: 'INVALID_QTY',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  SOLD_OUT: 'SOLD_OUT',
  HOLD_NOT_FOUND: 'HOLD_NOT_FOUND',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
} as const;

const keys = {
  sales: () => 'sales',
  sale: (saleId: string) => `sale:${saleId}`,
  reserved: (saleId: string) => `reserved:${saleId}`,
  customer: (saleId: string, customerId: string) => `cust:${saleId}:${customerId}`,
  active: (saleId: string) => `active:${saleId}`,
  hold: (holdId: string) => `hold:${holdId}`,
  claim: (holdId: string) => `claim:${holdId}`,
  final: (saleId: string, requestId: string) => `final:${saleId}:${requestId}`,
};

type GrabValue = { holdId: string; expiresAt: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });

function parseTime(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`invalid ISO time: ${iso}`);
  return ms;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function parseJson<T>(raw: string | null): T | null {
  return raw === null ? null : (JSON.parse(raw) as T);
}

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = () => parseTime(now());

  async function loadSale(saleId: string): Promise<SaleInput | null> {
    return parseJson<SaleInput>(await store.get(keys.sale(saleId)));
  }

  async function loadHold(holdId: string): Promise<Hold | null> {
    return parseJson<Hold>(await store.get(keys.hold(holdId)));
  }

  async function releaseCounters(hold: Pick<Hold, 'saleId' | 'customerId' | 'qty'>): Promise<void> {
    await store.incrBy(keys.reserved(hold.saleId), -hold.qty);
    await store.incrBy(keys.customer(hold.saleId, hold.customerId), -hold.qty);
  }

  // 把 HELD 的保留轉成終態。多方競爭時只有搶到 claim 的那一方算數，其他人沿用贏家的結果並協助把紀錄寫完。
  async function transition(hold: Hold, desired: 'PAID' | 'EXPIRED'): Promise<HoldStatus> {
    const claimKey = keys.claim(hold.holdId);
    const won = await store.set(claimKey, desired, { nx: true });
    const actual = won ? desired : (((await store.get(claimKey)) as 'PAID' | 'EXPIRED' | null) ?? desired);
    if (won && actual === 'EXPIRED') await releaseCounters(hold);
    await store.set(keys.hold(hold.holdId), JSON.stringify({ ...hold, status: actual }));
    await store.sRem(keys.active(hold.saleId), hold.holdId);
    return actual;
  }

  async function openSale(input: SaleInput): Promise<Result<null>> {
    if (typeof input.saleId !== 'string' || input.saleId.length === 0) return fail(Reasons.INVALID_INPUT);
    if (!isPositiveInt(input.quantity) || !isPositiveInt(input.perCustomerLimit)) return fail(Reasons.INVALID_INPUT);
    let startsAt: number;
    let endsAt: number;
    try {
      startsAt = parseTime(input.startsAt);
      endsAt = parseTime(input.endsAt);
    } catch {
      return fail(Reasons.INVALID_INPUT);
    }
    if (startsAt >= endsAt) return fail(Reasons.INVALID_INPUT);

    const record: SaleInput = {
      saleId: input.saleId,
      quantity: input.quantity,
      perCustomerLimit: input.perCustomerLimit,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    };
    // 先登記進 sales 集合再寫 sale 本體：就算中途當機，sweep 也不會漏掉已存在的搶購。
    await store.sAdd(keys.sales(), input.saleId);
    const created = await store.set(keys.sale(input.saleId), JSON.stringify(record), { nx: true });
    return created ? ok(null) : fail(Reasons.SALE_EXISTS);
  }

  async function grab(input: GrabInput): Promise<Result<GrabValue>> {
    const { saleId, customerId, qty, requestId } = input;
    const finalKey = keys.final(saleId, requestId);

    // 1. 重送的請求直接回同一個答案。
    const done = parseJson<GrabValue>(await store.get(finalKey));
    if (done) return ok(done);

    // 2. 基本檢查。
    const sale = await loadSale(saleId);
    if (!sale) return fail(Reasons.SALE_NOT_FOUND);
    if (!isPositiveInt(qty)) return fail(Reasons.INVALID_QTY);
    const t = nowMs();
    if (t < parseTime(sale.startsAt)) return fail(Reasons.NOT_STARTED);
    if (t >= parseTime(sale.endsAt)) return fail(Reasons.ENDED);
    if (qty > sale.perCustomerLimit) return fail(Reasons.LIMIT_EXCEEDED);

    const holdId = `${saleId}:${requestId}`;
    const holdKey = keys.hold(holdId);

    // 3. 這個請求先前（在別台、或當機前的自己）已經寫下保留紀錄：直接接手，不再扣件數。
    let hold = await loadHold(holdId);

    if (!hold) {
      // 4. 原子決策：先加再檢查，超過就退回。
      const customerKey = keys.customer(saleId, customerId);
      const customerTotal = await store.incrBy(customerKey, qty);
      if (customerTotal > sale.perCustomerLimit) {
        await store.incrBy(customerKey, -qty);
        return fail(Reasons.LIMIT_EXCEEDED);
      }
      const reservedKey = keys.reserved(saleId);
      const reserved = await store.incrBy(reservedKey, qty);
      if (reserved > sale.quantity) {
        await store.incrBy(reservedKey, -qty);
        await store.incrBy(customerKey, -qty);
        return fail(Reasons.SOLD_OUT);
      }

      // 5. 寫入保留紀錄。寫不進去代表同一個請求的另一次執行已先寫好：退回自己加的件數，沿用對方的。
      const fresh: Hold = {
        holdId,
        saleId,
        customerId,
        qty,
        expiresAt: new Date(t + HOLD_TTL_MS).toISOString(),
        status: 'HELD',
      };
      // 先登記進 active 集合再寫紀錄：寫完紀錄才當機的話，sweep 仍找得到這張保留。
      await store.sAdd(keys.active(saleId), holdId);
      const written = await store.set(holdKey, JSON.stringify(fresh), { nx: true });
      if (written) {
        hold = fresh;
      } else {
        await releaseCounters(fresh);
        hold = await loadHold(holdId);
        if (!hold) return fail(Reasons.SOLD_OUT); // 理論上不會發生：保留紀錄從不刪除。
      }
    }

    // 6. 固定這個請求的最終答案（誰先寫到都一樣，內容相同）。
    const value: GrabValue = { holdId: hold.holdId, expiresAt: hold.expiresAt };
    await store.set(finalKey, JSON.stringify(value), { nx: true });
    return ok(value);
  }

  async function pay(holdId: string): Promise<Result<null>> {
    const hold = await loadHold(holdId);
    if (!hold) return fail(Reasons.HOLD_NOT_FOUND);
    if (hold.status === 'PAID') return ok(null); // 重複的付款通知
    if (hold.status === 'EXPIRED') return fail(Reasons.HOLD_EXPIRED);

    const expired = nowMs() >= parseTime(hold.expiresAt);
    const actual = await transition(hold, expired ? 'EXPIRED' : 'PAID');
    return actual === 'PAID' ? ok(null) : fail(Reasons.HOLD_EXPIRED);
  }

  async function sweep(): Promise<void> {
    const t = nowMs();
    for (const saleId of await store.sMembers(keys.sales())) {
      for (const holdId of await store.sMembers(keys.active(saleId))) {
        const hold = await loadHold(holdId);
        if (!hold) continue; // 登記了但紀錄還沒寫（寫到一半的伺服器可能稍後補上），先不動
        if (hold.status !== 'HELD') {
          await store.sRem(keys.active(saleId), holdId);
          continue;
        }
        const pending = (await store.get(keys.claim(holdId))) as 'PAID' | 'EXPIRED' | null;
        if (pending) {
          await transition(hold, pending); // 有人轉移到一半當機，幫忙寫完
        } else if (t >= parseTime(hold.expiresAt)) {
          await transition(hold, 'EXPIRED');
        }
      }
    }
  }

  async function getRemaining(saleId: string): Promise<number> {
    const sale = await loadSale(saleId);
    if (!sale) return 0;
    const reserved = Number((await store.get(keys.reserved(saleId))) ?? '0');
    return Math.max(0, Math.min(sale.quantity, sale.quantity - reserved));
  }

  async function getHold(holdId: string): Promise<Hold | null> {
    const hold = await loadHold(holdId);
    if (!hold) return null;
    const { holdId: id, saleId, customerId, qty, expiresAt, status } = hold;
    return { holdId: id, saleId, customerId, qty, expiresAt, status };
  }

  return { openSale, grab, pay, sweep, getRemaining, getHold };
}
