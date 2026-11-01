import { createHash } from 'node:crypto';

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

/** 保留的存活時間（10 分鐘）。 */
export const HOLD_TTL_MS = 10 * 60 * 1000;

/**
 * 儲存結構（全部在 Store 內，伺服器本身不保存任何狀態）：
 * - flash:sale:{saleId}                 開賣設定（JSON，只寫一次）
 * - flash:sale:{saleId}:taken           已保留＋已成交的件數（計數器，釋放時扣回）
 * - flash:sale:{saleId}:cust:{custId}   該顧客目前保留＋已成交的件數（計數器）
 * - flash:hold:{holdId}                 保留紀錄（JSON，只寫一次，由 grab 建立）
 * - flash:hold:{holdId}:claim           狀態認領：'PAID' 或 'EXPIRED'，只能由 set nx 寫入一次
 * - flash:holds:open                    尚未結案的保留 holdId 集合，給排程掃描
 *
 * 所有計數器都用 incrBy，因此伺服器之間的增減可以交錯而結果仍正確。
 * 保留是否結案，只由 claim 這一個 key 的第一次 set nx 決定，付款與釋放不會同時成立。
 */
const keys = {
  sale: (saleId: string) => `flash:sale:${enc(saleId)}`,
  taken: (saleId: string) => `flash:sale:${enc(saleId)}:taken`,
  cust: (saleId: string, customerId: string) => `flash:sale:${enc(saleId)}:cust:${enc(customerId)}`,
  hold: (holdId: string) => `flash:hold:${holdId}`,
  claim: (holdId: string) => `flash:hold:${holdId}:claim`,
  open: 'flash:holds:open',
};

type StoredHold = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });

function enc(s: string): string {
  return encodeURIComponent(s);
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function isPosInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
}

function parseIso(v: unknown): number {
  return typeof v === 'string' ? Date.parse(v) : NaN;
}

/** 與 now() 相同的風格輸出 ISO 8601：整秒時省略 .000。 */
function formatIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.000Z$/, 'Z');
}

/** 同一組 (saleId, customerId, requestId) 永遠得到同一個 holdId，讓重送的請求可以被辨識。 */
function deriveHoldId(saleId: string, customerId: string, requestId: string): string {
  const digest = createHash('sha256').update(JSON.stringify([saleId, customerId, requestId])).digest('hex');
  return `hold_${digest.slice(0, 40)}`;
}

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = () => Date.parse(now());

  const readSale = async (saleId: string): Promise<SaleInput | null> => {
    const raw = await store.get(keys.sale(saleId));
    return raw === null ? null : (JSON.parse(raw) as SaleInput);
  };

  const readStoredHold = async (holdId: string): Promise<StoredHold | null> => {
    const raw = await store.get(keys.hold(holdId));
    return raw === null ? null : (JSON.parse(raw) as StoredHold);
  };

  const readClaim = (holdId: string): Promise<string | null> => store.get(keys.claim(holdId));

  // 狀態以 claim 為準；尚未被認領但已過期的，對外顯示為 EXPIRED（釋放由排程稍後完成）。
  const statusOf = (claim: string | null, expiresAt: string): HoldStatus => {
    if (claim === 'PAID') return 'PAID';
    if (claim === 'EXPIRED') return 'EXPIRED';
    return nowMs() >= Date.parse(expiresAt) ? 'EXPIRED' : 'HELD';
  };

  const toHold = async (s: StoredHold): Promise<Hold> => ({
    ...s,
    status: statusOf(await readClaim(s.holdId), s.expiresAt),
  });

  const replay = async (
    stored: StoredHold,
    qty: number,
  ): Promise<Result<{ holdId: string; expiresAt: string }>> => {
    if (stored.qty !== qty) return fail('REQUEST_MISMATCH');
    const hold = await toHold(stored);
    if (hold.status === 'EXPIRED') return fail('HOLD_EXPIRED');
    return ok({ holdId: stored.holdId, expiresAt: stored.expiresAt });
  };

  return {
    async openSale(input) {
      if (
        !isNonEmpty(input.saleId) ||
        !isPosInt(input.quantity) ||
        !isPosInt(input.perCustomerLimit) ||
        !Number.isFinite(parseIso(input.startsAt)) ||
        !Number.isFinite(parseIso(input.endsAt)) ||
        parseIso(input.startsAt) >= parseIso(input.endsAt)
      ) {
        return fail('INVALID_INPUT');
      }
      const sale: SaleInput = {
        saleId: input.saleId,
        quantity: input.quantity,
        perCustomerLimit: input.perCustomerLimit,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      };
      const created = await store.set(keys.sale(sale.saleId), JSON.stringify(sale), { nx: true });
      return created ? ok(null) : fail('SALE_EXISTS');
    },

    async grab(input) {
      if (
        !isNonEmpty(input.saleId) ||
        !isNonEmpty(input.customerId) ||
        !isNonEmpty(input.requestId) ||
        !isPosInt(input.qty)
      ) {
        return fail('INVALID_INPUT');
      }
      const { saleId, customerId, qty, requestId } = input;

      // 重送：同一請求已經建立過保留，直接回傳原結果，不再扣件數。
      const holdId = deriveHoldId(saleId, customerId, requestId);
      const existing = await readStoredHold(holdId);
      if (existing) return replay(existing, qty);

      const sale = await readSale(saleId);
      if (!sale) return fail('SALE_NOT_FOUND');
      const t = nowMs();
      if (t < parseIso(sale.startsAt)) return fail('SALE_NOT_STARTED');
      if (t >= parseIso(sale.endsAt)) return fail('SALE_ENDED');
      if (qty > sale.perCustomerLimit) return fail('OVER_PER_CUSTOMER_LIMIT');

      // 先扣計數器（原子增加），超過上限就把自己加的數量退回。
      // 退回失敗（伺服器當機於中途）只會造成少賣，不會超賣。
      const custKey = keys.cust(saleId, customerId);
      const takenKey = keys.taken(saleId);

      const custCount = await store.incrBy(custKey, qty);
      if (custCount > sale.perCustomerLimit) {
        await store.incrBy(custKey, -qty);
        return fail('OVER_PER_CUSTOMER_LIMIT');
      }
      const taken = await store.incrBy(takenKey, qty);
      if (taken > sale.quantity) {
        await store.incrBy(takenKey, -qty);
        await store.incrBy(custKey, -qty);
        return fail('SOLD_OUT');
      }

      // 登記為待結案，之後才建立保留紀錄；排程遇到沒有紀錄的 holdId 會略過。
      await store.sAdd(keys.open, holdId);

      const stored: StoredHold = {
        holdId,
        saleId,
        customerId,
        qty,
        expiresAt: formatIso(nowMs() + HOLD_TTL_MS),
      };
      const created = await store.set(keys.hold(holdId), JSON.stringify(stored), { nx: true });
      if (!created) {
        // 同一請求的另一份副本搶先建立了保留：退回本次扣的數量，改回傳既有結果。
        await store.incrBy(takenKey, -qty);
        await store.incrBy(custKey, -qty);
        const winner = await readStoredHold(holdId);
        return winner ? replay(winner, qty) : fail('REQUEST_CONFLICT');
      }
      return ok({ holdId, expiresAt: stored.expiresAt });
    },

    async pay(holdId) {
      const stored = await readStoredHold(holdId);
      if (!stored) return fail('HOLD_NOT_FOUND');

      const claim = await readClaim(holdId);
      if (claim === 'PAID') return ok(null); // 重複的付款通知：冪等
      if (claim === 'EXPIRED') return fail('HOLD_EXPIRED');
      if (nowMs() >= Date.parse(stored.expiresAt)) return fail('HOLD_EXPIRED');

      // 認領 PAID。與排程的 EXPIRED 認領競爭，只有一方會成功。
      const won = await store.set(keys.claim(holdId), 'PAID', { nx: true });
      if (won) return ok(null);
      return (await readClaim(holdId)) === 'PAID' ? ok(null) : fail('HOLD_EXPIRED');
    },

    async sweep() {
      const holdIds = await store.sMembers(keys.open);
      for (const holdId of holdIds) {
        const stored = await readStoredHold(holdId);
        if (!stored) continue; // 尚未建立完成，下一輪再看

        const claim = await readClaim(holdId);
        if (claim === 'PAID' || claim === 'EXPIRED') {
          await store.sRem(keys.open, holdId);
          continue;
        }
        if (nowMs() < Date.parse(stored.expiresAt)) continue; // 還沒到期

        // 認領 EXPIRED：只有認領成功的那一台伺服器會退還件數，即使多台同時掃到也只釋放一次。
        const won = await store.set(keys.claim(holdId), 'EXPIRED', { nx: true });
        if (!won) continue;
        await store.incrBy(keys.taken(stored.saleId), -stored.qty);
        await store.incrBy(keys.cust(stored.saleId, stored.customerId), -stored.qty);
        await store.sRem(keys.open, holdId);
      }
    },

    async getRemaining(saleId) {
      const sale = await readSale(saleId);
      if (!sale) return 0;
      const raw = await store.get(keys.taken(saleId));
      const taken = raw === null ? 0 : Number(raw);
      return Math.max(0, sale.quantity - taken);
    },

    async getHold(holdId) {
      const stored = await readStoredHold(holdId);
      return stored === null ? null : toHold(stored);
    },
  };
}
