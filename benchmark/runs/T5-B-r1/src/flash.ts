// 限量搶購：介面由需求固定；設計見 specs/001-flash-sale/（plan.md、research.md、data-model.md）。
//
// 核心手法：
// - 名額以「槽位」表示：每檔搶購 quantity 個槽位、每位顧客 perCustomerLimit 個槽位。
//   搶 N 件 = 以 `set nx` 把 N 個顧客槽位與 N 個搶購槽位宣告給自己的 holdId（原子、自帶擁有者，當機不漏件）。
// - 槽位有世代 g：第 g 代宣告鍵 c{g} 永不覆寫；釋放第 g 代 = `set nx` 釋放鍵 r{g}（冪等、無 ABA）。
// - 保留終態 PAID / EXPIRED 以單一 `set nx` 終態鍵決定，付款與排程只能一方勝出。
// - 同一 (saleId, requestId) 以映射鍵去重；另一台處理中時先輪詢，對方當機則接手完成。

// 共用儲存，類似 Redis。每個操作本身是原子的，但兩次呼叫之間其他伺服器可能已經改過資料。
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean>; // nx：key 已存在就不寫並回 false；px：存活毫秒數
  del(key: string): Promise<boolean>; // 回傳 key 原本是否存在
  incrBy(key: string, n: number): Promise<number>; // key 不存在視為 0，回傳加完的值
  sAdd(key: string, member: string): Promise<boolean>; // 集合；回傳是否新加入
  sRem(key: string, member: string): Promise<boolean>; // 回傳是否真的移除
  sMembers(key: string): Promise<string[]>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };
export type SaleInput = { saleId: string; quantity: number; perCustomerLimit: number; startsAt: string; endsAt: string };
export type GrabInput = { saleId: string; customerId: string; qty: number; requestId: string };
export type HoldStatus = 'HELD' | 'PAID' | 'EXPIRED'; // 保留中／已成交／已釋放
export type Hold = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string; status: HoldStatus };

export interface FlashSale {
  openSale(input: SaleInput): Promise<Result<null>>;
  grab(input: GrabInput): Promise<Result<{ holdId: string; expiresAt: string }>>;
  pay(holdId: string): Promise<Result<null>>; // 金流的付款成功通知
  sweep(): Promise<void>; // 排程：釋放到期未付款的保留
  getRemaining(saleId: string): Promise<number>; // 商品頁顯示的剩餘件數
  getHold(holdId: string): Promise<Hold | null>;
}

// ---------- 常數 ----------

const HOLD_TTL_MS = 10 * 60 * 1000;
const PENDING_POLLS = 50; // 等待另一台完成同一請求的輪詢次數
const MAX_RESTARTS = 5;
const MAX_CLAIM_ROUNDS = 200; // 名額競爭時的最多重試輪數

type Reason =
  | 'INVALID_INPUT'
  | 'DUPLICATE_SALE'
  | 'SALE_NOT_FOUND'
  | 'NOT_STARTED'
  | 'ENDED'
  | 'LIMIT_EXCEEDED'
  | 'SOLD_OUT'
  | 'HOLD_NOT_FOUND'
  | 'HOLD_EXPIRED';

type Final = 'PAID' | 'EXPIRED';

type GrabValue = { holdId: string; expiresAt: string };

type HoldRecord = { holdId: string; saleId: string; customerId: string; qty: number; expiresAt: string };

// ---------- 鍵名 ----------

const K = {
  sales: () => 'fs:sales',
  sale: (saleId: string) => `fs:sale:${saleId}`,
  saleHolds: (saleId: string) => `fs:sale:${saleId}:holds`,
  saleCustomers: (saleId: string) => `fs:sale:${saleId}:customers`,
  saleSlot: (saleId: string, n: number) => `fs:sale:${saleId}:slot:${n}`,
  custSlot: (saleId: string, customerId: string, j: number) => `fs:cust:${saleId}:${customerId}:slot:${j}`,
  hold: (holdId: string) => `fs:hold:${holdId}`,
  holdOk: (holdId: string) => `fs:hold:${holdId}:ok`,
  holdFinal: (holdId: string) => `fs:hold:${holdId}:final`,
  req: (saleId: string, requestId: string) => `fs:req:${saleId}:${requestId}`,
  reqAttempts: (saleId: string, requestId: string) => `fs:req:${saleId}:${requestId}:n`,
  claim: (slotKey: string, gen: number) => `${slotKey}:c${gen}`,
  release: (slotKey: string, gen: number) => `${slotKey}:r${gen}`,
};

// ---------- 小工具 ----------

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(reason: Reason): Result<T> => ({ ok: false, reason });

const isPositiveInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0;
const isNonEmptyString = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

function parseMs(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readSale(raw: string | null): SaleInput | null {
  const v = parseJson(raw);
  if (!isRecord(v)) return null;
  const { saleId, quantity, perCustomerLimit, startsAt, endsAt } = v;
  if (!isNonEmptyString(saleId) || !isPositiveInt(quantity) || !isPositiveInt(perCustomerLimit)) return null;
  if (typeof startsAt !== 'string' || typeof endsAt !== 'string') return null;
  return { saleId, quantity, perCustomerLimit, startsAt, endsAt };
}

function readHold(raw: string | null): HoldRecord | null {
  const v = parseJson(raw);
  if (!isRecord(v)) return null;
  const { holdId, saleId, customerId, qty, expiresAt } = v;
  if (!isNonEmptyString(holdId) || !isNonEmptyString(saleId) || !isNonEmptyString(customerId)) return null;
  if (!isPositiveInt(qty) || typeof expiresAt !== 'string') return null;
  return { holdId, saleId, customerId, qty, expiresAt };
}

function readFinal(raw: string | null): Final | null {
  return raw === 'PAID' || raw === 'EXPIRED' ? raw : null;
}

function hashStart(s: string, size: number): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
  return size > 0 ? h % size : 0;
}

const yieldTurn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

type SlotState = { gen: number; owner: string | null };

// ---------- 實作 ----------

export function createFlashSale(store: Store, now: () => string): FlashSale {
  const nowMs = (): number => {
    const ms = parseMs(now());
    if (ms === null) throw new Error('now() 回傳的不是合法 ISO 8601 時間');
    return ms;
  };

  // --- 槽位 ---

  /** 目前世代與擁有者：找到第一個沒有釋放標記的世代。 */
  async function slotState(slotKey: string): Promise<SlotState> {
    for (let gen = 0; ; gen++) {
      if ((await store.get(K.release(slotKey, gen))) !== null) continue;
      const owner = await store.get(K.claim(slotKey, gen));
      return { gen, owner };
    }
  }

  /** 釋放 (槽位, 世代)。只有在讀到該世代確實屬於要釋放的保留時才呼叫。 */
  async function releaseSlot(slotKey: string, gen: number): Promise<void> {
    await store.set(K.release(slotKey, gen), '1', { nx: true });
  }

  type OwnerState = 'pending' | 'settled' | 'dead';
  type OwnerCache = Map<string, OwnerState>;

  /** 其他保留的狀態：pending＝尚未確認（還在搶名額）、settled＝已確認、dead＝紀錄已不存在（回滾殘留）。 */
  async function ownerState(owner: string, cache: OwnerCache): Promise<OwnerState> {
    const cached = cache.get(owner);
    if (cached) return cached;
    let state: OwnerState;
    if ((await loadHold(owner)) === null) state = 'dead';
    else state = (await isConfirmed(owner)) ? 'settled' : 'pending';
    cache.set(owner, state);
    return state;
  }

  /** have＝自己已取得；pending＝尚未確認的其他擁有者 → 其持有的槽位數 */
  type ClaimPass = { have: number; pending: Map<string, number> };

  /**
   * 一輪貪婪宣告：掃描 size 個槽位，已屬於自己的計入，空閒的以 set nx 宣告，直到足額。
   * 擁有者已不存在的殘留宣告會直接釋放並改在下一代宣告。回傳取得數與遇到的「尚未確認」擁有者。
   */
  async function claimPass(slotKey: (i: number) => string, size: number, holdId: string, need: number, start: number, cache: OwnerCache): Promise<ClaimPass> {
    let have = 0;
    const pending = new Map<string, number>();
    for (let i = 0; i < size && have < need; i++) {
      const key = slotKey((start + i) % size);
      let st = await slotState(key);
      if (st.owner !== null && st.owner !== holdId && (await ownerState(st.owner, cache)) === 'dead') {
        await releaseSlot(key, st.gen);
        st = { gen: st.gen + 1, owner: await store.get(K.claim(key, st.gen + 1)) };
      }
      if (st.owner === holdId) {
        have++;
      } else if (st.owner === null) {
        if (await store.set(K.claim(key, st.gen), holdId, { nx: true })) have++;
      } else if ((await ownerState(st.owner, cache)) === 'pending') {
        pending.set(st.owner, (pending.get(st.owner) ?? 0) + 1);
      }
    }
    return { have, pending };
  }

  type Shortage = 'fail' | 'backoff' | 'wait';

  /**
   * 名額不足時的決定（wait-die，以 holdId 字串序定優先權）：
   * - 沒有其他進行中的宣告者 → 真的不足；
   * - 有編號比自己小的進行中宣告者 → 自己退讓（釋放部分宣告）後重試，讓對方先完成；
   * - 否則，若「自己已有 + 較大編號者持有」仍湊不到需求 → 不足（避免空等）；湊得到 → 保留部分宣告等對方退讓。
   */
  function onShortage(pass: ClaimPass, holdId: string, need: number): Shortage {
    if (pass.pending.size === 0) return 'fail';
    let largerHeld = 0;
    for (const [other, count] of pass.pending) {
      if (other < holdId) return 'backoff';
      largerHeld += count;
    }
    return pass.have + largerHeld < need ? 'fail' : 'wait';
  }

  /** 反覆宣告直到足額或確定不足。回傳是否足額。 */
  async function claimSlots(slotKey: (i: number) => string, size: number, holdId: string, need: number, start: number): Promise<boolean> {
    for (let round = 0; round < MAX_CLAIM_ROUNDS; round++) {
      const cache: OwnerCache = new Map();
      const pass = await claimPass(slotKey, size, holdId, need, start, cache);
      if (pass.have >= need) return true;
      const decision = onShortage(pass, holdId, need);
      if (decision === 'fail') return false;
      if (decision === 'backoff') await releaseOwned(slotKey, size, holdId);
      await yieldTurn();
    }
    return false;
  }

  /** 釋放某保留在一個槽位空間裡的所有宣告（冪等）。 */
  async function releaseOwned(slotKey: (i: number) => string, size: number, holdId: string): Promise<void> {
    for (let i = 0; i < size; i++) {
      const key = slotKey(i);
      const st = await slotState(key);
      if (st.owner === holdId) await releaseSlot(key, st.gen);
    }
  }

  async function countOccupied(slotKey: (i: number) => string, size: number): Promise<number> {
    let count = 0;
    for (let i = 0; i < size; i++) {
      const st = await slotState(slotKey(i));
      if (st.owner !== null) count++;
    }
    return count;
  }

  // --- 保留 ---

  async function loadSale(saleId: string): Promise<SaleInput | null> {
    return readSale(await store.get(K.sale(saleId)));
  }

  async function loadHold(holdId: string): Promise<HoldRecord | null> {
    return readHold(await store.get(K.hold(holdId)));
  }

  async function isConfirmed(holdId: string): Promise<boolean> {
    return (await store.get(K.holdOk(holdId))) !== null;
  }

  async function loadFinal(holdId: string): Promise<Final | null> {
    return readFinal(await store.get(K.holdFinal(holdId)));
  }

  /** 把一張（可能是別台伺服器留下的）保留完成到足額並確認。 */
  async function complete(rec: HoldRecord, sale: SaleInput): Promise<Result<GrabValue>> {
    const custOk = await claimSlots((j) => K.custSlot(rec.saleId, rec.customerId, j), sale.perCustomerLimit, rec.holdId, rec.qty, 0);
    if (!custOk) {
      await rollback(rec, sale);
      return fail('LIMIT_EXCEEDED');
    }
    const saleOk = await claimSlots((n) => K.saleSlot(rec.saleId, n), sale.quantity, rec.holdId, rec.qty, hashStart(rec.holdId, sale.quantity));
    if (!saleOk) {
      await rollback(rec, sale);
      return fail('SOLD_OUT');
    }
    await store.set(K.holdOk(rec.holdId), '1');
    return ok({ holdId: rec.holdId, expiresAt: rec.expiresAt });
  }

  /** 名額不足時回滾：釋放槽位、刪映射（確認是自己的）、刪紀錄、移出集合。 */
  async function rollback(rec: HoldRecord, sale: SaleInput): Promise<void> {
    await releaseOwned((n) => K.saleSlot(rec.saleId, n), sale.quantity, rec.holdId);
    await releaseOwned((j) => K.custSlot(rec.saleId, rec.customerId, j), sale.perCustomerLimit, rec.holdId);
    await clearMappingIf(rec);
    await store.del(K.hold(rec.holdId));
    await store.sRem(K.saleHolds(rec.saleId), rec.holdId);
  }

  function requestIdOf(rec: HoldRecord): string | null {
    const prefix = `${rec.saleId}~`;
    if (!rec.holdId.startsWith(prefix)) return null;
    const rest = rec.holdId.slice(prefix.length);
    const idx = rest.lastIndexOf('~');
    return idx < 0 ? null : rest.slice(0, idx);
  }

  async function clearMappingIf(rec: HoldRecord): Promise<void> {
    const requestId = requestIdOf(rec);
    if (requestId === null) return;
    const key = K.req(rec.saleId, requestId);
    if ((await store.get(key)) === rec.holdId) await store.del(key);
  }

  // --- 對外操作 ---

  async function openSale(input: SaleInput): Promise<Result<null>> {
    const { saleId, quantity, perCustomerLimit, startsAt, endsAt } = input;
    const startMs = parseMs(startsAt);
    const endMs = parseMs(endsAt);
    if (!isNonEmptyString(saleId) || !isPositiveInt(quantity) || !isPositiveInt(perCustomerLimit)) return fail('INVALID_INPUT');
    if (startMs === null || endMs === null || startMs >= endMs) return fail('INVALID_INPUT');

    await store.sAdd(K.sales(), saleId);
    const created = await store.set(K.sale(saleId), JSON.stringify({ saleId, quantity, perCustomerLimit, startsAt, endsAt }), { nx: true });
    return created ? ok(null) : fail('DUPLICATE_SALE');
  }

  async function grab(input: GrabInput): Promise<Result<GrabValue>> {
    const { saleId, customerId, qty, requestId } = input;
    if (!isNonEmptyString(saleId) || !isNonEmptyString(customerId) || !isNonEmptyString(requestId) || !isPositiveInt(qty)) {
      return fail('INVALID_INPUT');
    }
    const sale = await loadSale(saleId);
    if (!sale) return fail('SALE_NOT_FOUND');

    for (let restart = 0; restart <= MAX_RESTARTS; restart++) {
      // 1. 重送比對（在時間檢查之前：成功過的請求永遠回同一張保留）
      const mapped = await store.get(K.req(saleId, requestId));
      if (mapped !== null) {
        const settled = await awaitPending(saleId, requestId, mapped, sale);
        if (settled.kind === 'result') return settled.result;
        continue; // 映射已變動，重新開始
      }

      // 2. 時間與單筆上限
      const t = nowMs();
      if (t < Date.parse(sale.startsAt)) return fail('NOT_STARTED');
      if (t >= Date.parse(sale.endsAt)) return fail('ENDED');
      if (qty > sale.perCustomerLimit) return fail('LIMIT_EXCEEDED');

      // 3. 建立嘗試：紀錄 → 集合 → 映射
      const attempt = await store.incrBy(K.reqAttempts(saleId, requestId), 1);
      const holdId = `${saleId}~${requestId}~${attempt}`;
      const rec: HoldRecord = { holdId, saleId, customerId, qty, expiresAt: new Date(t + HOLD_TTL_MS).toISOString() };
      await store.sAdd(K.saleHolds(saleId), holdId);
      await store.set(K.hold(holdId), JSON.stringify(rec), { nx: true });
      await store.sAdd(K.saleCustomers(saleId), customerId);
      const mappedNow = await store.set(K.req(saleId, requestId), holdId, { nx: true });
      if (!mappedNow) {
        // 另一台同時處理同一請求且先到：放棄自己的嘗試，改等對方
        await store.del(K.hold(holdId));
        await store.sRem(K.saleHolds(saleId), holdId);
        continue;
      }

      // 4. 佔名額
      return complete(rec, sale);
    }
    // 極端情況：映射持續變動。最後一次嘗試直接依目前映射處理。
    const mapped = await store.get(K.req(saleId, requestId));
    if (mapped !== null) {
      const rec = await loadHold(mapped);
      if (rec) return complete(rec, sale);
    }
    return fail('SOLD_OUT');
  }

  type Pending = { kind: 'result'; result: Result<GrabValue> } | { kind: 'restart' };

  /**
   * 映射已存在：已確認 → 回同一張保留；未確認 → 等另一台完成；等不到（對方當機）→ 接手完成。
   */
  async function awaitPending(saleId: string, requestId: string, mapped: string, sale: SaleInput): Promise<Pending> {
    for (let poll = 0; poll <= PENDING_POLLS; poll++) {
      const rec = await loadHold(mapped);
      if (!rec) {
        // 映射指向不存在的紀錄：對方正在回滾或已回滾
        const current = await store.get(K.req(saleId, requestId));
        if (current === mapped) {
          await yieldTurn();
          const again = await store.get(K.req(saleId, requestId));
          if (again === mapped && (await loadHold(mapped)) === null) {
            await store.del(K.req(saleId, requestId));
          }
        }
        return { kind: 'restart' };
      }
      if (await isConfirmed(mapped)) return { kind: 'result', result: ok({ holdId: rec.holdId, expiresAt: rec.expiresAt }) };
      const current = await store.get(K.req(saleId, requestId));
      if (current !== mapped) return { kind: 'restart' };
      if (poll < PENDING_POLLS) await yieldTurn();
    }
    // 對方遲遲未完成：接手
    const rec = await loadHold(mapped);
    if (!rec) return { kind: 'restart' };
    if (await isConfirmed(mapped)) return { kind: 'result', result: ok({ holdId: rec.holdId, expiresAt: rec.expiresAt }) };
    return { kind: 'result', result: await complete(rec, sale) };
  }

  async function pay(holdId: string): Promise<Result<null>> {
    if (!isNonEmptyString(holdId)) return fail('HOLD_NOT_FOUND');
    const rec = await loadHold(holdId);
    if (!rec || !(await isConfirmed(holdId))) return fail('HOLD_NOT_FOUND');

    const final = await loadFinal(holdId);
    if (final === 'PAID') return ok(null);
    if (final === 'EXPIRED') return fail('HOLD_EXPIRED');
    if (nowMs() >= Date.parse(rec.expiresAt)) return fail('HOLD_EXPIRED');

    if (await store.set(K.holdFinal(holdId), 'PAID', { nx: true })) return ok(null);
    const decided = await loadFinal(holdId);
    return decided === 'PAID' ? ok(null) : fail('HOLD_EXPIRED');
  }

  async function sweep(): Promise<void> {
    const t = nowMs();
    const saleIds = await store.sMembers(K.sales());
    for (const saleId of saleIds) {
      const sale = await loadSale(saleId);
      if (!sale) continue;

      // (1) 到期未終態的保留 → EXPIRED
      const holdIds = await store.sMembers(K.saleHolds(saleId));
      for (const holdId of holdIds) {
        const rec = await loadHold(holdId);
        if (!rec) {
          await store.sRem(K.saleHolds(saleId), holdId);
          continue;
        }
        if ((await loadFinal(holdId)) !== null) continue;
        if (t < Date.parse(rec.expiresAt)) continue;
        await store.set(K.holdFinal(holdId), 'EXPIRED', { nx: true });
        if (!(await isConfirmed(holdId))) await clearMappingIf(rec); // 未完成的嘗試：讓重送能重新開始
      }

      // (2) 釋放擁有者已 EXPIRED 或紀錄不存在的槽位
      const releasable = new Map<string, boolean>();
      const shouldRelease = async (owner: string): Promise<boolean> => {
        const cached = releasable.get(owner);
        if (cached !== undefined) return cached;
        const rec = await loadHold(owner);
        const result = !rec || (await loadFinal(owner)) === 'EXPIRED';
        releasable.set(owner, result);
        return result;
      };
      const scan = async (slotKey: (i: number) => string, size: number): Promise<void> => {
        for (let i = 0; i < size; i++) {
          const key = slotKey(i);
          const st = await slotState(key);
          if (st.owner !== null && (await shouldRelease(st.owner))) await releaseSlot(key, st.gen);
        }
      };
      await scan((n) => K.saleSlot(saleId, n), sale.quantity);
      for (const customerId of await store.sMembers(K.saleCustomers(saleId))) {
        await scan((j) => K.custSlot(saleId, customerId, j), sale.perCustomerLimit);
      }
    }
  }

  async function getRemaining(saleId: string): Promise<number> {
    if (!isNonEmptyString(saleId)) return 0;
    const sale = await loadSale(saleId);
    if (!sale) return 0;
    const occupied = await countOccupied((n) => K.saleSlot(saleId, n), sale.quantity);
    return sale.quantity - occupied;
  }

  async function getHold(holdId: string): Promise<Hold | null> {
    if (!isNonEmptyString(holdId)) return null;
    const rec = await loadHold(holdId);
    if (!rec || !(await isConfirmed(holdId))) return null;
    const final = await loadFinal(holdId);
    const status: HoldStatus = final ?? 'HELD';
    return { holdId: rec.holdId, saleId: rec.saleId, customerId: rec.customerId, qty: rec.qty, expiresAt: rec.expiresAt, status };
  }

  return { openSale, grab, pay, sweep, getRemaining, getHold };
}
