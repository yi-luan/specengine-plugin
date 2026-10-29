# Contract: `src/order.ts` 公開介面

固定介面（需求規定不可更名、不可改型別）：

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

## 行為契約

| 函式 | 前置條件 | 成功結果 | 失敗 reason（依判定順序） |
|------|----------|----------|---------------------------|
| `createOrder(id, amount)` | `amount` 為正整數 | `{id, status:'CREATED', amount, paidAmount:0, refundedAmount:0}` | `INVALID_AMOUNT` |
| `pay(order, amount)` | status = CREATED；amount 正整數；amount = order.amount | status→PAID，paidAmount = amount | `INVALID_TRANSITION` → `INVALID_AMOUNT` → `AMOUNT_MISMATCH` |
| `ship(order)` | status = PAID | status→SHIPPED | `INVALID_TRANSITION` |
| `cancel(order)` | status ∈ {CREATED, PAID} | status→CANCELLED；若原為 PAID 則 refundedAmount = paidAmount | `INVALID_TRANSITION` |
| `refund(order, amount)` | status = SHIPPED；amount 正整數；refundedAmount + amount ≤ paidAmount | refundedAmount += amount；若 == paidAmount 則 status→REFUNDED，否則維持 SHIPPED | `INVALID_TRANSITION` → `INVALID_AMOUNT` → `REFUND_EXCEEDS_PAID` |

## 通用契約

- 純函式：不修改傳入 `order`；成功回傳新物件；不拋出例外。
- 失敗時 `reason` 一定是上述四個代碼之一。
- 額外匯出（允許、非固定介面）：`export const REASONS` 常數物件，供測試與呼叫端引用代碼字串。
