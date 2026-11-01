# Contract: PaymentService

The public surface is fixed by the shared `src/events.ts` (read-only) and must be exported
from `src/payment.ts` exactly as below.

```ts
// src/payment.ts
export function createPaymentService(balances: Record<string, number>): PaymentService;

// from src/events.ts (shared, immutable)
export interface PaymentService {
  handle(event: Event): Event[];
  getBalance(customerId: string): number;
}
```

## `handle(event): Event[]`

| Inbound event | Precondition (per order record) | Effect | Returned events |
|---------------|----------------------------------|--------|-----------------|
| any | `event.id` already handled | none | `[]` |
| `OrderPlaced` | details unknown | store customerId/amount; then evaluate charge trigger | `[]`, or one `PaymentSucceeded`/`PaymentFailed` if a reservation was already pending and order not cancelled |
| `OrderPlaced` | details known | none | `[]` |
| `StockReserved` | details known, `payment = NONE`, not cancelled | charge (balance >= amount → deduct, `PAID`; else `FAILED`) | one `PaymentSucceeded{orderId, amount}` or one `PaymentFailed{orderId}` |
| `StockReserved` | details unknown | mark reserved | `[]` |
| `StockReserved` | cancelled, or payment ≠ NONE | none | `[]` |
| `OrderCancelled` | `payment = PAID` | add `charged` back to balance, `REFUNDED`, mark cancelled | one `PaymentRefunded{orderId, amount: charged}` |
| `OrderCancelled` | any other state | mark cancelled | `[]` |
| `StockRejected`, `StockReleased`, `PaymentSucceeded`, `PaymentFailed`, `PaymentRefunded` | — | none | `[]` |

Every returned event has `id: "pay-" + UUIDv4` (unique system-wide).

## `getBalance(customerId): number`

Returns the current integer balance; `0` for customers never seen.

## Invariants

- Balance never negative.
- Per order: at most one of `PaymentSucceeded`/`PaymentFailed`, and at most one
  `PaymentRefunded` (only after a `PaymentSucceeded`).
- `handle` is a pure function of (current state, event); it never throws for well-formed
  events of the shared `Event` union.
