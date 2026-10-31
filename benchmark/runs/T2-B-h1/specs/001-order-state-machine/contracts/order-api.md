# Contract: `src/order.ts` 公開介面

依需求的技術介面固定，名稱與簽章不得變更。

```ts
export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

export function createOrder(id: string, amount: number): OrderResult;
export function pay(order: Order, amount: number): OrderResult;
export function ship(order: Order): OrderResult;
export function cancel(order: Order): OrderResult;
export function refund(order: Order, amount: number): OrderResult;
```

## 共通保證

- 全部為純函式：不修改傳入的 `order`；成功時回傳新的 `order` 物件。
- 失敗時回傳 `{ ok: false, reason }`，`reason` 為可讀的中文說明；不拋出例外。
- 金額皆為整數元。

## 各操作前置條件與結果

| 函式 | 前置條件 | 成功結果 |
|------|----------|----------|
| `createOrder(id, amount)` | amount 為整數且 > 0 | 狀態 CREATED，paidAmount 0，refundedAmount 0 |
| `pay(order, amount)` | 狀態 CREATED；amount == order.amount | 狀態 PAID，paidAmount = amount |
| `ship(order)` | 狀態 PAID | 狀態 SHIPPED |
| `cancel(order)` | 狀態 CREATED 或 PAID | 狀態 CANCELLED；若為 PAID 則 refundedAmount = paidAmount |
| `refund(order, amount)` | 狀態 SHIPPED；amount 為整數且 > 0；refundedAmount + amount ≤ paidAmount | refundedAmount += amount；達 paidAmount 時狀態 REFUNDED，否則維持 SHIPPED |
