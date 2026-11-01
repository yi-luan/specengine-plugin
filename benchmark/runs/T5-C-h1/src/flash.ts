// 限量搶購（FLASH_SALE）產品代碼。
// 規格：.specengine/spec/features/限量搶購.feature；矩陣：.specengine/sdd/matrix/FLASH_SALE.json
// 決策見 .specengine/sdd/resolved/ 下各檔（限購計算、剩餘不足、空窗期回收、付款重送、重送回應、時間邊界）。
// 伺服器之間不共用記憶體，所有狀態經 Store 讀寫；時間一律由 now() 取得。

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

const HOLD_MS = 10 * 60 * 1000; // 保留 10 分鐘（決策：搶到時間加 10 分鐘，到期時刻（含）即到期）

// 內部紀錄。status 另有 PENDING：請求已登記、件數尚未全部套用，對外不可見。
type SaleRec = { quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
type HoldRec = {
  holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string;
  status: HoldStatus | 'PENDING'; fp: string;
  applied?: { cust?: boolean; rem?: boolean; released?: boolean };
};

// 時間格式與輸入一致：ISO 8601，秒以下為 0 時省略毫秒（例如 2026-06-15T12:00:00Z）
function fmt(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

function isPosInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function fail<T = never>(reason: string): Result<T> {
  return { ok: false, reason };
}

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = () => Date.parse(now());

  // 鍵名
  const saleKey = (s: string) => `sale:${s}`;
  const remKey = (s: string) => `sale:${s}:remaining`;          // 剩餘可搶件數（可能短暫為負，讀取時夾到 0）
  const custKey = (s: string, c: string) => `sale:${s}:cust:${c}`; // 已計入限購的件數（保留中＋已成交）
  const heldKey = (s: string) => `held:${s}`;                  // 保留中（未付款、未釋放）的保留編號集合
  const holdKey = (id: string) => `hold:${id}`;
  const claimKey = (id: string) => `claim:${id}`;              // 付款與釋放的互斥標記：'PAY' 或 'REL'，nx 寫入，先寫入者贏

  async function readSale(s: string): Promise<SaleRec | null> {
    const raw = await store.get(saleKey(s));
    return raw ? (JSON.parse(raw) as SaleRec) : null;
  }

  async function readHold(id: string): Promise<HoldRec | null> {
    const raw = await store.get(holdKey(id));
    return raw ? (JSON.parse(raw) as HoldRec) : null;
  }

  async function writeHold(rec: HoldRec): Promise<void> {
    await store.set(holdKey(rec.holdId), JSON.stringify(rec));
  }

  // 釋放單一保留。只在現在時間 ≥ 到期時間、且狀態為 HELD 時動作；
  // 多台伺服器同時呼叫時靠 claim 的 nx 寫入只有一方完成件數歸還；
  // 中途當機者由後續呼叫依 applied 標記續做，不會重複歸還。
  async function releaseHold(id: string): Promise<void> {
    const rec = await readHold(id);
    if (!rec || rec.status !== 'HELD') return;
    if (nowMs() < Date.parse(rec.expiresAt)) return;

    const won = await store.set(claimKey(id), 'REL', { nx: true });
    if (!won) {
      const cur = await store.get(claimKey(id));
      if (cur !== 'REL') return; // 已被付款認領，保留成交，不釋放
    }

    const cur = await readHold(id);
    if (!cur || cur.status !== 'HELD') return;
    if (!cur.applied?.released) {
      await store.incrBy(remKey(cur.saleId), cur.qty);
      await store.incrBy(custKey(cur.saleId, cur.customerId), -cur.qty);
      cur.applied = { ...cur.applied, released: true };
      await writeHold(cur);
    }
    await store.sRem(heldKey(cur.saleId), id);
    cur.status = 'EXPIRED';
    await writeHold(cur);
  }

  // 搶購前先回收同一檔中已到期但尚未被排程釋放的保留（決策：空窗期件數視為可搶）
  async function reclaim(saleId: string): Promise<void> {
    for (const id of await store.sMembers(heldKey(saleId))) {
      await releaseHold(id);
    }
  }

  return {
    async openSale(input: SaleInput): Promise<Result<null>> {
      const { saleId, quantity, perCustomerLimit, startsAt, endsAt } = input;
      if (!saleId || !isPosInt(quantity) || !isPosInt(perCustomerLimit) || perCustomerLimit > quantity) {
        return fail('INVALID_INPUT');
      }
      const s = Date.parse(startsAt);
      const e = Date.parse(endsAt);
      if (Number.isNaN(s) || Number.isNaN(e) || s >= e) return fail('INVALID_INPUT');

      const rec: SaleRec = { quantity, perCustomerLimit, startsAt, endsAt };
      const created = await store.set(saleKey(saleId), JSON.stringify(rec), { nx: true });
      if (!created) return fail('DUPLICATE_SALE');
      await store.set(remKey(saleId), String(quantity));
      await store.sAdd('sales', saleId);
      return ok(null);
    },

    async grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>> {
      const { saleId, customerId, qty, requestId } = input;
      if (!saleId || !customerId || !requestId || !isPosInt(qty)) return fail('INVALID_INPUT');
      const sale = await readSale(saleId);
      if (!sale) return fail('INVALID_INPUT');

      // 同一請求編號：holdId 由請求編號決定，重送會落在同一筆紀錄上
      const holdId = `${saleId}#${requestId}`;
      const fp = `${saleId}|${customerId}|${qty}`;

      let rec = await readHold(holdId);
      if (!rec) {
        const t = nowMs();
        if (t < Date.parse(sale.startsAt)) return fail('NOT_STARTED');
        if (t >= Date.parse(sale.endsAt)) return fail('ENDED');
        if (qty > sale.perCustomerLimit) return fail('LIMIT_EXCEEDED');
        await reclaim(saleId);

        const pending: HoldRec = {
          holdId, saleId, customerId, qty, expiresAt: fmt(t + HOLD_MS),
          status: 'PENDING', fp, applied: {},
        };
        const created = await store.set(holdKey(holdId), JSON.stringify(pending), { nx: true });
        rec = created ? pending : await readHold(holdId);
        if (!rec) return fail('INVALID_INPUT');
      }

      if (rec.fp !== fp) return fail('REQUEST_CONFLICT');
      // 前一次已成功（含之後已成交或已釋放）：回同一張保留，不重複佔用、不重算
      if (rec.status !== 'PENDING') return ok({ holdId, expiresAt: rec.expiresAt });

      // 續做登記中的請求：限購計入 → 剩餘扣減，每一步套用後才寫入標記
      if (!rec.applied?.cust) {
        const c = await store.incrBy(custKey(saleId, customerId), qty);
        if (c > sale.perCustomerLimit) {
          await store.incrBy(custKey(saleId, customerId), -qty);
          await store.del(holdKey(holdId));
          return fail('LIMIT_EXCEEDED');
        }
        rec.applied = { ...rec.applied, cust: true };
        await writeHold(rec);
      }
      if (!rec.applied?.rem) {
        const n = await store.incrBy(remKey(saleId), -qty);
        if (n < 0) {
          // 剩餘不足：整筆拒絕，不部分保留（決策 A）
          await store.incrBy(remKey(saleId), qty);
          await store.incrBy(custKey(saleId, customerId), -qty);
          await store.del(holdKey(holdId));
          return fail('SOLD_OUT');
        }
        rec.applied = { ...rec.applied, rem: true };
        await writeHold(rec);
      }

      rec.status = 'HELD';
      await writeHold(rec);
      await store.sAdd(heldKey(saleId), holdId);
      return ok({ holdId, expiresAt: rec.expiresAt });
    },

    async pay(holdId: string): Promise<Result<null>> {
      const rec = await readHold(holdId);
      if (!rec || rec.status === 'PENDING') return fail('HOLD_NOT_FOUND');
      if (rec.status === 'PAID') return ok(null);                 // 重複付款通知：回成功、不改任何東西
      if (rec.status === 'EXPIRED') return fail('HOLD_EXPIRED');
      if (nowMs() >= Date.parse(rec.expiresAt)) return fail('HOLD_EXPIRED'); // 到期時刻（含）起拒絕

      const won = await store.set(claimKey(holdId), 'PAY', { nx: true });
      if (!won) {
        const cur = await store.get(claimKey(holdId));
        if (cur !== 'PAY') return fail('HOLD_EXPIRED');           // 已被釋放流程認領
      }
      rec.status = 'PAID';
      await writeHold(rec);
      await store.sRem(heldKey(rec.saleId), holdId);
      return ok(null);
    },

    async sweep(): Promise<void> {
      for (const s of await store.sMembers('sales')) {
        await reclaim(s);
      }
    },

    async getRemaining(saleId: string): Promise<number> {
      await reclaim(saleId);
      const raw = await store.get(remKey(saleId));
      if (raw === null) return 0;
      return Math.max(0, Number(raw));
    },

    async getHold(holdId: string): Promise<Hold | null> {
      const rec = await readHold(holdId);
      if (!rec || rec.status === 'PENDING') return null;
      return {
        holdId: rec.holdId,
        saleId: rec.saleId,
        customerId: rec.customerId,
        qty: rec.qty,
        expiresAt: rec.expiresAt,
        status: rec.status,
      };
    },
  };
}
