# Contract: `src/order.ts` public API

Fixed by the requirement — names and signatures MUST NOT change.

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

## Behavioural contract per function

| Function | Precondition (state) | Amount checks (in order) | Success result |
|----------|----------------------|--------------------------|----------------|
| `createOrder(id, amount)` | — | `amount` integer > 0 else `INVALID_AMOUNT` | `{ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 }` |
| `pay(order, amount)` | `status === 'CREATED'` else `INVALID_TRANSITION` | integer > 0 else `INVALID_AMOUNT`; then `amount === order.amount` else `AMOUNT_MISMATCH` | copy with `status: 'PAID', paidAmount: amount` |
| `ship(order)` | `status === 'PAID'` else `INVALID_TRANSITION` | — | copy with `status: 'SHIPPED'` |
| `cancel(order)` | `status ∈ {'CREATED','PAID'}` else `INVALID_TRANSITION` | — | copy with `status: 'CANCELLED', refundedAmount: order.paidAmount` |
| `refund(order, amount)` | `status === 'SHIPPED'` else `INVALID_TRANSITION` | integer > 0 else `INVALID_AMOUNT`; then `order.refundedAmount + amount <= order.paidAmount` else `REFUND_EXCEEDS_PAID` | copy with `refundedAmount: order.refundedAmount + amount`, `status: 'REFUNDED'` if the new refundedAmount equals `paidAmount`, otherwise `'SHIPPED'` |

Additional guarantees:

- Functions never throw for any `Order` value and any `number` amount (including NaN,
  Infinity, fractions) — such amounts yield `INVALID_AMOUNT`.
- The input `order` is never mutated; a successful result's `order` is a different object
  (`result.order !== order`).
- `reason` values are exactly the four codes above, uppercase, no punctuation.
