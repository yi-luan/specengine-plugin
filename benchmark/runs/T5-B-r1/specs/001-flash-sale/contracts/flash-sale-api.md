# Contract: `src/flash.ts` 公開介面

**Feature**: 001-flash-sale | **Date**: 2026-11-02

介面由需求文件固定，名稱與型別不可更改。以下為語意契約。

## 匯出型別（逐字）

```ts
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
export function createFlashSale(store: Store, now: () => string): FlashSale;
```

## 操作契約

### `openSale(input)`

| 條件 | 結果 |
|------|------|
| `saleId` 為空字串、`quantity` 或 `perCustomerLimit` 非正整數、時間字串無法解析、`startsAt >= endsAt` | `{ ok: false, reason: 'INVALID_INPUT' }`，不改資料 |
| `saleId` 已存在（含多台同時開同一編號時的輸家） | `{ ok: false, reason: 'DUPLICATE_SALE' }`，不改資料 |
| 其他 | `{ ok: true, value: null }`；`getRemaining(saleId) === quantity` |

### `grab(input)` — 檢查順序即回傳順序

1. `qty` 非正整數，或 `saleId`／`customerId`／`requestId` 為空字串 → `INVALID_INPUT`
2. 搶購不存在 → `SALE_NOT_FOUND`
3. 同 (saleId, requestId) 已有確認保留 → `{ ok: true, value: { holdId, expiresAt } }`（同一張；不受時間與名額影響）
4. `now < startsAt` → `NOT_STARTED`；`now >= endsAt` → `ENDED`
5. `qty > perCustomerLimit`，或該顧客 HELD+PAID 件數 + qty > perCustomerLimit → `LIMIT_EXCEEDED`
6. 剩餘可搶 < qty → `SOLD_OUT`（剩餘 == qty 可成功）
7. 成功：`{ ok: true, value: { holdId, expiresAt } }`，`expiresAt = toISOString(now + 10 分鐘)`

失敗一律不改變可觀察狀態（剩餘件數、他人保留、顧客額度）。

### `pay(holdId)`

| 條件 | 結果 |
|------|------|
| 保留不存在（含空字串、未確認的嘗試） | `HOLD_NOT_FOUND` |
| 終態已是 `PAID` | `{ ok: true, value: null }`（重複通知冪等） |
| 終態已是 `EXPIRED`，或 `now >= expiresAt` | `HOLD_EXPIRED`，狀態不變 |
| 其他（HELD 且未到期） | 寫入終態 `PAID` → `{ ok: true, value: null }`；若與排程競爭落敗 → `HOLD_EXPIRED` |

搶購是否已結束不影響付款。

### `sweep()`

- 對所有搶購：所有 `now >= expiresAt` 且無終態的保留 → 終態 `EXPIRED`，釋放其佔用的全部槽位（搶購與顧客）。
- 冪等：多台伺服器同時或重複執行，每張保留的件數只歸還一次。
- 不碰 `PAID`；不碰未到期的 `HELD`。
- 無回傳值、不丟例外（Store 例外除外）。

### `getRemaining(saleId)`

- 搶購不存在 → `0`。
- 否則 `quantity − 目前被佔用的搶購槽位數`（HELD 含已到期未釋放者、PAID、進行中的宣告皆算佔用）。

### `getHold(holdId)`

- 不存在或未確認 → `null`。
- 否則 `{ holdId, saleId, customerId, qty, expiresAt, status }`，`status` 依終態推導（無終態 → `HELD`）。

## 失敗原因代碼總表

| 代碼 | 來源 | 情境 |
|------|------|------|
| `INVALID_INPUT` | openSale／grab | 參數不合法 |
| `DUPLICATE_SALE` | openSale | 搶購編號已存在 |
| `SALE_NOT_FOUND` | grab | 搶購不存在 |
| `NOT_STARTED` | grab | 尚未開始 |
| `ENDED` | grab | 已結束（含結束時刻） |
| `LIMIT_EXCEEDED` | grab | 超過限購 |
| `SOLD_OUT` | grab | 剩餘不足 |
| `HOLD_NOT_FOUND` | pay | 保留不存在 |
| `HOLD_EXPIRED` | pay | 到期（含到期時刻）後才付款，或已被釋放 |
