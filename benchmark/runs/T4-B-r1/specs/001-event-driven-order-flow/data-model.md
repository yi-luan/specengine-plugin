# Data Model: Event-Driven Order Flow

All state is in-memory and private to one service. No entity is shared.

## Order (order service)

| Field | Type | Constraints |
|-------|------|-------------|
| orderId | string | non-empty; unique within the order service |
| customerId | string | non-empty |
| sku | string | non-empty |
| qty | integer | ≥ 1 |
| amount | integer | ≥ 1 |
| placedAt | ISO 8601 string | from `PlaceOrderInput.at` |
| status | `OrderStatus` | PENDING, CONFIRMED, REJECTED, FAILED, CANCELLED |
| cancelReason | `'CUSTOMER' \| 'TIMEOUT'` | present only when status is CANCELLED |

State transitions (anything not listed is a no-op):

```text
PENDING   --PaymentSucceeded-->  CONFIRMED
PENDING   --StockRejected---->   REJECTED   (terminal)
PENDING   --PaymentFailed---->   FAILED     (terminal)
PENDING   --cancelOrder------>   CANCELLED/CUSTOMER (terminal)
PENDING   --tick(now>=placedAt+15m)--> CANCELLED/TIMEOUT (terminal)
CONFIRMED --cancelOrder------>   CANCELLED/CUSTOMER (terminal)
```

## Reservation (inventory service)

| Field | Type | Constraints |
|-------|------|-------------|
| orderId | string | key |
| sku | string | |
| qty | integer | quantity actually reserved |
| state | `'reserved' \| 'rejected' \| 'released' \| 'closed'` | `closed` = cancellation/failure seen before `OrderPlaced`; nothing ever reserved |

Plus `available: Map<sku, integer>` seeded from the factory argument; unknown SKU reads as 0.

Transitions:

```text
(none)    --OrderPlaced, available>=qty-->  reserved   (available -= qty, emit StockReserved)
(none)    --OrderPlaced, available<qty-->   rejected   (emit StockRejected)
(none)    --OrderCancelled | PaymentFailed--> closed
reserved  --PaymentFailed | OrderCancelled--> released (available += qty, emit StockReleased)
rejected | released | closed -- any event --> unchanged, emit nothing
```

## Charge (payment service)

| Field | Type | Constraints |
|-------|------|-------------|
| orderId | string | key |
| customerId | string? | known once `OrderPlaced` seen |
| amount | integer? | known once `OrderPlaced` seen |
| reserved | boolean | `StockReserved` seen |
| cancelled | boolean | `OrderCancelled` seen |
| outcome | `'none' \| 'succeeded' \| 'failed' \| 'refunded'` | |

Plus `balances: Map<customerId, integer>` seeded from the factory argument; unknown customer
reads as 0.

Settle rule (run after every update to a Charge):

```text
outcome=none AND NOT cancelled AND customerId,amount known AND reserved:
  balance >= amount -> balance -= amount, outcome=succeeded, emit PaymentSucceeded{amount}
  else              -> outcome=failed,    emit PaymentFailed
outcome=succeeded AND cancelled -> balance += amount, outcome=refunded, emit PaymentRefunded{amount}
anything else -> emit nothing
```

## Event

See [contracts/shop-api.md](contracts/shop-api.md). `id` is `${prefix}-${n}` from a single
process-wide counter (`ord`, `inv`, `pay` prefixes).
