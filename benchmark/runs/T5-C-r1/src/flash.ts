// 限量搶購（FLASH_SALE）。規格：.specengine/spec/features/限量搶購.feature；行為矩陣：.specengine/sdd/matrix/FLASH_SALE.json
// 每呼叫一次 createFlashSale 代表一台伺服器；伺服器之間只透過 Store 共用狀態，本模組沒有任何模組層級的可變狀態。
import { randomUUID } from 'node:crypto';
import type { FlashSale, GrabInput, Hold, Result, SaleInput, Store } from './flash-types.js';

export type { FlashSale, GrabInput, Hold, HoldStatus, Result, SaleInput, Store } from './flash-types.js';

/** 保留有效期：10 分鐘（需求第 2 條） */
const HOLD_TTL_MS = 10 * 60 * 1000;

/** 失敗原因代碼，逐字沿用 .specengine/spec/terms.md 固定文案 MSG-001～009 */
const REASON = {
  SOLD_OUT: 'SOLD_OUT',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  NOT_STARTED: 'NOT_STARTED',
  ENDED: 'ENDED',
  INVALID_INPUT: 'INVALID_INPUT',
  SALE_NOT_FOUND: 'SALE_NOT_FOUND',
  DUPLICATE_SALE: 'DUPLICATE_SALE',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  HOLD_NOT_FOUND: 'HOLD_NOT_FOUND',
} as const;

// key 對應 erm.dbml 的邏輯 Table：flash_sales / holds / grab_requests / customer_quotas
const K = {
  sale: (saleId: string) => `flash_sales:${saleId}`,
  remaining: (saleId: string) => `flash_sales:${saleId}:remaining`,
  quota: (saleId: string, customerId: string) => `customer_quotas:${saleId}:${customerId}`,
  request: (saleId: string, requestId: string) => `grab_requests:${saleId}:${requestId}`,
  hold: (holdId: string) => `holds:${holdId}`,
  /** 保留的最終狀態認領權（PAID 或 EXPIRED），set nx 決定誰贏，跨伺服器只會有一個贏家 */
  claim: (holdId: string) => `holds:${holdId}:claim`,
  /** 釋放時件數只能還回一次的標記 */
  released: (holdId: string) => `holds:${holdId}:released`,
  /** 所有「保留中」保留的索引，排程由此掃描 */
  heldIndex: () => 'holds:held',
} as const;

const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });
const succeed = <T>(value: T): Result<T> => ({ ok: true, value });

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isNonEmptyString = (s: unknown): s is string => typeof s === 'string' && s.length > 0;
const parseTime = (iso: unknown): number => (typeof iso === 'string' ? Date.parse(iso) : NaN);

/** 以 now() 的字串風格輸出 ISO 時間：now() 沒帶毫秒時，輸出也不帶毫秒 */
function formatLike(sample: string, ms: number): string {
  const iso = new Date(ms).toISOString();
  return sample.includes('.') ? iso : iso.replace('.000Z', 'Z');
}

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = () => Date.parse(now());

  const readJson = async <T>(key: string): Promise<T | null> => {
    const raw = await store.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  };

  const readInt = async (key: string): Promise<number | null> => {
    const raw = await store.get(key);
    return raw === null ? null : Number(raw);
  };

  /** 剩餘件數 key 可能尚未初始化（開檔寫入途中當機）；以 set nx 冪等補建 */
  const ensureRemaining = async (sale: SaleInput): Promise<void> => {
    if ((await store.get(K.remaining(sale.saleId))) === null) {
      await store.set(K.remaining(sale.saleId), String(sale.quantity), { nx: true });
    }
  };

  /** 認領成功後把保留寫成最終狀態並移出索引；可重複執行（多台伺服器都可能來收尾） */
  const finalize = async (hold: Hold, status: 'PAID' | 'EXPIRED'): Promise<void> => {
    if (hold.status !== status) {
      await store.set(K.hold(hold.holdId), JSON.stringify({ ...hold, status }));
    }
    await store.sRem(K.heldIndex(), hold.holdId);
  };

  /** 釋放：件數還回剩餘、累計佔用扣回，靠 released 標記保證只做一次（R-003、R-011） */
  const release = async (hold: Hold): Promise<void> => {
    if (await store.set(K.released(hold.holdId), '1', { nx: true })) {
      await store.incrBy(K.remaining(hold.saleId), hold.qty);
      await store.incrBy(K.quota(hold.saleId, hold.customerId), -hold.qty);
    }
    await finalize(hold, 'EXPIRED');
  };

  return {
    // R-001 / R-022 / R-023
    async openSale(input) {
      const startMs = parseTime(input?.startsAt);
      const endMs = parseTime(input?.endsAt);
      const valid =
        isNonEmptyString(input?.saleId) &&
        isPositiveInt(input.quantity) &&
        isPositiveInt(input.perCustomerLimit) &&
        !Number.isNaN(startMs) &&
        !Number.isNaN(endMs) &&
        startMs < endMs;
      // 限購大於限量不檢查：決策見 .specengine/spec/exclusions.md X-FLASH_SALE-003
      if (!valid) return fail(REASON.INVALID_INPUT);

      const sale: SaleInput = {
        saleId: input.saleId,
        quantity: input.quantity,
        perCustomerLimit: input.perCustomerLimit,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      };
      // 決策見 .specengine/sdd/resolved/features/限量搶購_重複開同一搶購編號.md
      if (!(await store.set(K.sale(sale.saleId), JSON.stringify(sale), { nx: true }))) return fail(REASON.DUPLICATE_SALE);
      await ensureRemaining(sale);
      return succeed(null);
    },

    // R-000 / R-005～R-008 / R-012 / R-013 / R-017～R-019 / R-024 / R-025
    async grab(input) {
      if (
        !isNonEmptyString(input?.saleId) ||
        !isNonEmptyString(input.customerId) ||
        !isNonEmptyString(input.requestId) ||
        !isPositiveInt(input.qty)
      ) {
        return fail(REASON.INVALID_INPUT);
      }
      const { saleId, customerId, requestId, qty } = input;

      const sale = await readJson<SaleInput>(K.sale(saleId));
      if (!sale) return fail(REASON.SALE_NOT_FOUND);

      // 同一請求編號重送：前次成功 → 回放同一張保留（R-018）。決策見 resolved/features/限量搶購_同一請求重送的處理.md
      const replay = await replayIfDone(saleId, requestId);
      if (replay) return replay;

      // 搶購期間為半開區間 [開始, 結束)。決策見 resolved/features/限量搶購_時間邊界的歸屬.md
      const t = nowMs();
      if (t < Date.parse(sale.startsAt)) return fail(REASON.NOT_STARTED);
      if (t >= Date.parse(sale.endsAt)) return fail(REASON.ENDED);

      // 先佔限購額度（原子 incrBy），超過就整筆退回（R-006、R-013）
      const quotaKey = K.quota(saleId, customerId);
      const used = await store.incrBy(quotaKey, qty);
      if (used > sale.perCustomerLimit) {
        await store.incrBy(quotaKey, -qty);
        return fail(REASON.LIMIT_EXCEEDED);
      }

      // 再扣剩餘件數（原子 incrBy），不足就整筆退回（R-005、R-012）。
      // 先扣件再寫保留：扣件後當機遺失的件數不回收，寧少賣不超賣。決策見 exclusions X-FLASH_SALE-001
      await ensureRemaining(sale);
      const remainingKey = K.remaining(saleId);
      const left = await store.incrBy(remainingKey, -qty);
      if (left < 0) {
        await store.incrBy(remainingKey, qty);
        await store.incrBy(quotaKey, -qty);
        return fail(REASON.SOLD_OUT);
      }

      const hold: Hold = {
        holdId: randomUUID(),
        saleId,
        customerId,
        qty,
        expiresAt: formatLike(now(), t + HOLD_TTL_MS),
        status: 'HELD',
      };
      await store.sAdd(K.heldIndex(), hold.holdId);
      await store.set(K.hold(hold.holdId), JSON.stringify(hold));

      // 最後才登記請求編號；輸給同時完成的重送時，撤銷自己這份並回放對方的
      if (!(await store.set(K.request(saleId, requestId), hold.holdId, { nx: true }))) {
        await store.sRem(K.heldIndex(), hold.holdId);
        await store.del(K.hold(hold.holdId));
        await store.incrBy(remainingKey, qty);
        await store.incrBy(quotaKey, -qty);
        const other = await replayIfDone(saleId, requestId);
        if (other) return other;
      }
      return succeed({ holdId: hold.holdId, expiresAt: hold.expiresAt });
    },

    // R-002 / R-009 / R-010 / R-014 / R-020 / R-021
    async pay(holdId) {
      const hold = await readJson<Hold>(K.hold(holdId));
      if (!hold) return fail(REASON.HOLD_NOT_FOUND);
      // 重複付款通知：回成功、不改任何東西。決策見 resolved/features/限量搶購_重複付款通知的回應.md
      if (hold.status === 'PAID') return succeed(null);
      if (hold.status === 'EXPIRED') return fail(REASON.HOLD_EXPIRED);

      // 到期時刻（含）之後一律拒絕，不管排程釋放了沒。決策見 resolved/features/限量搶購_到期後排程釋放前收到付款.md
      if (nowMs() >= Date.parse(hold.expiresAt)) return fail(REASON.HOLD_EXPIRED);

      // 認領最終狀態：只有一台伺服器能把它認領為 PAID；排程若已先認領為 EXPIRED，這裡就不能成交（R-014）
      let claim: string | null = (await store.set(K.claim(holdId), 'PAID', { nx: true })) ? 'PAID' : await store.get(K.claim(holdId));
      if (claim !== 'PAID') return fail(REASON.HOLD_EXPIRED);
      await finalize(hold, 'PAID');
      return succeed(null);
    },

    // R-003 / R-004 / R-011
    async sweep() {
      const t = nowMs();
      for (const holdId of await store.sMembers(K.heldIndex())) {
        const hold = await readJson<Hold>(K.hold(holdId));
        if (!hold) continue; // 搶購寫入途中（或已撤銷），下次再看
        if (hold.status === 'PAID') { await finalize(hold, 'PAID'); continue; }
        if (hold.status === 'EXPIRED') { await release(hold); continue; }

        let claim = await store.get(K.claim(holdId));
        if (claim === null) {
          if (t < Date.parse(hold.expiresAt)) continue; // 尚未到期（R-004）
          claim = (await store.set(K.claim(holdId), 'EXPIRED', { nx: true })) ? 'EXPIRED' : await store.get(K.claim(holdId));
        }
        if (claim === 'PAID') await finalize(hold, 'PAID'); // 付款那台伺服器還沒收尾，替它收尾
        else await release(hold);
      }
    },

    // R-015 / R-026
    async getRemaining(saleId) {
      const remaining = await readInt(K.remaining(saleId));
      if (remaining !== null) return Math.max(0, remaining);
      const sale = await readJson<SaleInput>(K.sale(saleId));
      return sale ? sale.quantity : 0; // 不存在的檔次回 0。決策見 resolved/features/限量搶購_搶購輸入不合法的反應.md
    },

    // R-016
    async getHold(holdId) {
      return readJson<Hold>(K.hold(holdId));
    },
  };

  /** 請求編號已有成功紀錄時，回放該保留 */
  async function replayIfDone(saleId: string, requestId: string): Promise<Result<{ holdId: string; expiresAt: string }> | null> {
    const holdId = await store.get(K.request(saleId, requestId));
    if (holdId === null) return null;
    const hold = await readJson<Hold>(K.hold(holdId));
    if (!hold) return null;
    return succeed({ holdId: hold.holdId, expiresAt: hold.expiresAt });
  }
}
