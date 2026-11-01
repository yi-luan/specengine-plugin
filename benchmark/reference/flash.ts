// T5 參考實作：限量搶購。只用 Store 的原子操作，不用鎖。
import { randomUUID } from 'node:crypto';

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

const HOLD_MS = 10 * 60 * 1000;
const posInt = (n: unknown) => Number.isInteger(n) && (n as number) > 0;
const nonEmpty = (s: unknown) => typeof s === 'string' && s.length > 0;
const fail = (reason: string) => ({ ok: false as const, reason });

type Sale = SaleInput;
type HoldRec = Omit<Hold, 'status'>;

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const t = () => Date.parse(now());
  const K = {
    sales: 'sales',
    sale: (id: string) => `sale:${id}`,
    stock: (id: string) => `stock:${id}`,
    limit: (id: string, c: string) => `limit:${id}:${c}`,
    pending: (id: string) => `pending:${id}`,
    hold: (id: string) => `hold:${id}`,
    status: (id: string) => `status:${id}`,
    req: (id: string) => `req:${id}`,
  };
  const guard = async <T>(fn: () => Promise<Result<T>>): Promise<Result<T>> => {
    try { return await fn(); } catch { return fail('TRY_AGAIN'); }
  };
  const readSale = async (id: string) => { const s = await store.get(K.sale(id)); return s ? (JSON.parse(s) as Sale) : null; };
  const readHold = async (id: string) => { const s = await store.get(K.hold(id)); return s ? (JSON.parse(s) as HoldRec) : null; };

  return {
    openSale: (input) => guard(async () => {
      const { saleId, quantity, perCustomerLimit, startsAt, endsAt } = input;
      if (!nonEmpty(saleId) || !posInt(quantity) || !posInt(perCustomerLimit)) return fail('INVALID_INPUT');
      if (!(Date.parse(startsAt) < Date.parse(endsAt))) return fail('INVALID_INPUT');
      if (!(await store.set(K.sale(saleId), JSON.stringify(input), { nx: true }))) return fail('DUPLICATE_SALE');
      await store.incrBy(K.stock(saleId), quantity);
      await store.sAdd(K.sales, saleId);
      return { ok: true, value: null };
    }),

    grab: (input) => guard(async () => {
      const { saleId, customerId, qty, requestId } = input;
      if (!nonEmpty(saleId) || !nonEmpty(customerId) || !nonEmpty(requestId) || !posInt(qty)) return fail('INVALID_INPUT');
      const sale = await readSale(saleId);
      if (!sale) return fail('SALE_NOT_FOUND');
      const prior = await store.get(K.req(requestId));
      if (prior) return { ok: true, value: JSON.parse(prior) };
      const at = t();
      if (at < Date.parse(sale.startsAt)) return fail('NOT_STARTED');
      if (at >= Date.parse(sale.endsAt)) return fail('ENDED');

      const used = await store.incrBy(K.limit(saleId, customerId), qty);
      if (used > sale.perCustomerLimit) { await store.incrBy(K.limit(saleId, customerId), -qty); return fail('LIMIT_EXCEEDED'); }
      const left = await store.incrBy(K.stock(saleId), -qty);
      if (left < 0) {
        await store.incrBy(K.stock(saleId), qty);
        await store.incrBy(K.limit(saleId, customerId), -qty);
        return fail('SOLD_OUT');
      }
      const holdId = `${saleId}-${randomUUID()}`;
      const expiresAt = new Date(at + HOLD_MS).toISOString();
      await store.set(K.hold(holdId), JSON.stringify({ holdId, saleId, customerId, qty, expiresAt } satisfies HoldRec));
      await store.sAdd(K.pending(saleId), holdId);
      const value = { holdId, expiresAt };
      await store.set(K.req(requestId), JSON.stringify(value));
      return { ok: true, value };
    }),

    pay: (holdId) => guard(async () => {
      const h = await readHold(holdId);
      if (!h) return fail('HOLD_NOT_FOUND');
      const status = await store.get(K.status(holdId));
      if (status === 'PAID') return { ok: true, value: null };
      if (status === 'EXPIRED' || t() >= Date.parse(h.expiresAt)) return fail('HOLD_EXPIRED');
      // 與排程搶同一張保留：誰先寫下終態誰說了算
      if (!(await store.set(K.status(holdId), 'PAID', { nx: true }))) {
        return (await store.get(K.status(holdId))) === 'PAID' ? { ok: true, value: null } : fail('HOLD_EXPIRED');
      }
      await store.sRem(K.pending(h.saleId), holdId);
      return { ok: true, value: null };
    }),

    async sweep() {
      try {
        for (const saleId of await store.sMembers(K.sales)) {
          for (const holdId of await store.sMembers(K.pending(saleId))) {
            const h = await readHold(holdId);
            if (!h || t() < Date.parse(h.expiresAt)) continue;
            if (!(await store.set(K.status(holdId), 'EXPIRED', { nx: true }))) { await store.sRem(K.pending(saleId), holdId); continue; }
            await store.sRem(K.pending(saleId), holdId);
            await store.incrBy(K.stock(saleId), h.qty);
            await store.incrBy(K.limit(saleId, h.customerId), -h.qty);
          }
        }
      } catch { /* 下一輪排程再處理 */ }
    },

    async getRemaining(saleId) {
      const v = await store.get(K.stock(saleId));
      return Math.max(0, Number(v ?? 0));
    },

    async getHold(holdId) {
      const h = await readHold(holdId);
      if (!h) return null;
      const s = (await store.get(K.status(holdId))) as HoldStatus | null;
      return { ...h, status: s ?? 'HELD' };
    },
  };
}
