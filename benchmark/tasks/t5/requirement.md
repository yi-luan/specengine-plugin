# 需求：限量搶購

1. 商家開一檔限量搶購：設定搶購編號、限量件數、每位顧客限購件數、開始與結束時間。
2. 顧客在搶購期間搶購，指定要幾件。搶到時系統替顧客保留這些件數 10 分鐘，回傳保留編號與到期時間。
3. 顧客在保留到期前付款。付款結果由金流以通知告訴系統，付款成功後這張保留就成交。同一筆付款通知可能重複送達。
4. 到期還沒付款的保留要釋放，件數還給其他人搶。釋放由排程負責，排程每分鐘在每一台伺服器上各跑一次。
5. 商品頁要顯示剩餘可搶的件數。
6. 絕對不能超賣，也不能讓顧客買超過限購件數。
7. 開賣瞬間流量很大，系統同時跑多台伺服器。伺服器之間不共用記憶體，只共用一個儲存（下方的 `Store`，類似 Redis）。同一位顧客可能連點，同一個請求也可能因為網路逾時被重送。
8. 伺服器可能處理到一半就當機、不再回來，也可能卡住一段時間後恢復、接著把手上的工作做完。
9. 件數都是整數。

## 技術介面（固定，不可更名）

在 `src/flash.ts` 匯出：

```ts
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

export function createFlashSale(store: Store, now: () => string): FlashSale;
```

- 每呼叫一次 `createFlashSale` 代表一台伺服器。伺服器之間的資料一律經過 `Store`，不可用模組層級的變數共用狀態。
- 時間一律從 `now()` 取得，為 ISO 8601 字串，例如 `'2026-06-15T12:00:00Z'`。`Store` 的 `px` 也以同一個時鐘計算：寫入後經過 `px` 毫秒（含）即失效。
- 測試時 `Store` 由呼叫端提供；你自己的測試請自行做一個記憶體版的 `Store`。不碰真正的資料庫或網路。
