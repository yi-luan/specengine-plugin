# Contract: 限量搶購公開介面

來源：需求檔的「技術介面（固定，不可更名）」。實作位於 `src/flash.ts`。

## 匯出

```ts
export interface Store { /* get, set(nx, px), del, incrBy, sAdd, sRem, sMembers */ }
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

## 原因代碼（`Result.reason`）

| 代碼 | 觸發操作 | 條件 |
|------|---------|------|
| `INVALID_INPUT` | openSale, grab | 參數不合法（見 spec FR-002 與 Q4 回覆） |
| `DUPLICATE_SALE` | openSale | saleId 已存在 |
| `SALE_NOT_FOUND` | grab | 搶購編號不存在 |
| `NOT_STARTED` | grab | now < startsAt |
| `ENDED` | grab | now ≥ endsAt |
| `SOLD_OUT` | grab | 剩餘件數不足 |
| `LIMIT_EXCEEDED` | grab | 超過每位顧客限購件數 |
| `REQUEST_CONFLICT` | grab | 相同 requestId 的 customerId 或 qty 不同 |
| `REQUEST_IN_PROGRESS` | grab | 相同 requestId 的第一次請求尚未決定（逾時仍未決定），不保留任何件數 |
| `HOLD_NOT_FOUND` | pay | 保留編號不存在 |
| `HOLD_EXPIRED` | pay | now ≥ expiresAt，或保留已被釋放／取消 |

所有被拒絕的操作都不改變任何資料。

## 行為保證

- 件數與限購不超賣、不超限（任何併發與故障情境）。
- 相同 requestId 的重送回傳相同結果，不重複扣件。
- 同一付款通知重複送達，結果一致。
- `pay` 不受搶購結束時間影響。
