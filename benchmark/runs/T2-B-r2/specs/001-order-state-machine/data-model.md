# Data Model: Order State Machine

## Entities

### Order

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | `string` | Opaque, caller supplied, not validated (FR-017) |
| `status` | `OrderStatus` | One of the five states below |
| `amount` | `number` | Integer > 0 (FR-002, FR-012); immutable after creation |
| `paidAmount` | `number` | 0 while CREATED; equals `amount` once PAID; never changes afterwards (also unchanged by cancel, FR-007) |
| `refundedAmount` | `number` | 0 ≤ refundedAmount ≤ paidAmount; grows only via `refund` (SHIPPED) or is set to `paidAmount` by `cancel` of a PAID order |

Invariants (hold for every order that any operation returns):

- `Number.isInteger(amount) && amount > 0`
- `paidAmount ∈ {0, amount}`
- `0 ≤ refundedAmount ≤ paidAmount`
- `status === 'REFUNDED'  ⇒ refundedAmount === paidAmount && paidAmount > 0`
- `status === 'SHIPPED'   ⇒ refundedAmount < paidAmount`
- `status === 'CREATED'   ⇒ paidAmount === 0 && refundedAmount === 0`
- `status === 'CANCELLED' ⇒ refundedAmount === paidAmount` (0 when cancelled from CREATED)

### OrderStatus

`'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED'`

(已建立 / 已付款 / 已出貨 / 已取消 / 已退款)

### OrderResult

`{ ok: true; order: Order } | { ok: false; reason: string }`

`reason` is always one of the fixed codes:

| Code | Meaning | Produced by |
|------|---------|-------------|
| `INVALID_TRANSITION` | Operation not allowed in the order's current state | pay (status ≠ CREATED), ship (≠ PAID), cancel (∉ {CREATED, PAID}), refund (≠ SHIPPED) |
| `INVALID_AMOUNT` | Amount is not a finite integer > 0 | createOrder, pay, refund |
| `AMOUNT_MISMATCH` | Payment amount ≠ order amount | pay |
| `REFUND_EXCEEDS_PAID` | refundedAmount + amount > paidAmount | refund |

Check precedence inside every operation: state → amount validity → amount comparison.
The first failing check determines the code.

## State Transitions

```text
                createOrder(id, amount>0)
                          │
                          ▼
                    ┌───────────┐  cancel  ┌───────────┐
                    │  CREATED  │─────────▶│ CANCELLED │  (refundedAmount = 0)
                    └───────────┘          └───────────┘
                          │ pay(amount == order.amount)      ▲
                          ▼                                  │ cancel (refundedAmount = paidAmount)
                    ┌───────────┐                            │
                    │   PAID    │────────────────────────────┘
                    └───────────┘
                          │ ship
                          ▼
                    ┌───────────┐ refund(a), refunded+a < paid
                    │  SHIPPED  │◀──┐ (stays SHIPPED, refundedAmount += a)
                    └───────────┘───┘
                          │ refund(a), refunded+a == paid
                          ▼
                    ┌───────────┐
                    │ REFUNDED  │  terminal
                    └───────────┘
```

Transition table (rows = current status, cells = outcome):

| status \ op | pay | ship | cancel | refund |
|-------------|-----|------|--------|--------|
| CREATED | → PAID (or INVALID_AMOUNT / AMOUNT_MISMATCH) | INVALID_TRANSITION | → CANCELLED | INVALID_TRANSITION |
| PAID | INVALID_TRANSITION | → SHIPPED | → CANCELLED, refundedAmount = paidAmount | INVALID_TRANSITION |
| SHIPPED | INVALID_TRANSITION | INVALID_TRANSITION | INVALID_TRANSITION | → SHIPPED / REFUNDED (or INVALID_AMOUNT / REFUND_EXCEEDS_PAID) |
| CANCELLED | INVALID_TRANSITION | INVALID_TRANSITION | INVALID_TRANSITION | INVALID_TRANSITION |
| REFUNDED | INVALID_TRANSITION | INVALID_TRANSITION | INVALID_TRANSITION | INVALID_TRANSITION |

## Purity contract

Every function treats its `order` argument as read-only and, on success, returns a new object
(`{ ...order, ...changes }`). On failure the argument is likewise untouched and no order is
returned.
