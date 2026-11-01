# Data Model: Payment Service

All state lives inside the closure returned by `createPaymentService`. Nothing is persisted.

## Entities

### CustomerBalance

| Field | Type | Notes |
|-------|------|-------|
| customerId | string | map key |
| balance | integer >= 0 | seeded from constructor; unknown customers read as 0 |

Validation: never written below 0 (a charge is only applied when `balance >= amount`).

### OrderRecord

One per order id the service has heard about from any event.

| Field | Type | Notes |
|-------|------|-------|
| orderId | string | map key |
| customerId | string \| undefined | known once `OrderPlaced` seen |
| amount | integer \| undefined | known once `OrderPlaced` seen; first value wins |
| reserved | boolean | set by `StockReserved` |
| cancelled | boolean | set by `OrderCancelled` |
| payment | `'NONE' \| 'PAID' \| 'FAILED' \| 'REFUNDED'` | payment outcome state |
| charged | integer | amount actually deducted (0 unless `PAID`/`REFUNDED`) |

### HandledEventIds

`Set<string>` of every inbound event id already processed (any type). Membership → the
event is ignored with no state change and no output.

## State transitions (OrderRecord.payment)

```text
            StockReserved ∧ details known ∧ ¬cancelled
NONE ───────────────────────────────────────────────▶ PAID      (balance >= amount; emit PaymentSucceeded)
NONE ───────────────────────────────────────────────▶ FAILED    (balance <  amount; emit PaymentFailed)
PAID ──── OrderCancelled ───────────────────────────▶ REFUNDED  (emit PaymentRefunded{amount: charged})
FAILED, REFUNDED : terminal — any further StockReserved / OrderCancelled: no change, no event
```

Trigger evaluation ("tryCharge") runs after **either** `StockReserved` or `OrderPlaced`
is recorded, so the charge fires on whichever of the two arrives second. If `cancelled` is
already true when the trigger is evaluated, nothing happens (no charge, no event).

`OrderCancelled` on `NONE` or `FAILED` sets `cancelled = true` only (no event). On `PAID`
it refunds and moves to `REFUNDED`.

## Relationships

- OrderRecord.customerId → CustomerBalance.customerId (many orders per customer; all share
  one balance and are applied in arrival order).
- Outbound events reference OrderRecord.orderId; `PaymentSucceeded.amount` and
  `PaymentRefunded.amount` equal `OrderRecord.charged`.
