# Data Model: Member Points Discount at Checkout

**Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

No persistence; all entities are in-memory values passed to / returned from a pure function.

## Entities

### PointsDiscountInput (Redemption Request + Order + Member Points Balance)

| Field | Type | Validation (reason on violation) |
|-------|------|----------------------------------|
| `orderAmount` | integer dollars | integer and > 0, else `INVALID_INPUT` |
| `pointsBalance` | integer points | integer and ≥ 0, else `INVALID_INPUT` |
| `pointsToUse` | integer points | integer and ≥ 0, else `INVALID_POINTS`; ≤ `pointsBalance`, else `INSUFFICIENT_POINTS`; ≤ cap, else `EXCEEDS_LIMIT` |

Derived value: `cap = floor(orderAmount * 3 / 10)` (maximum redeemable points, FR-003a).

### PointsDiscountResult (Redemption Outcome)

Discriminated union on `ok`:

| Variant | Fields | Invariants |
|---------|--------|------------|
| success `ok: true` | `finalAmount = orderAmount - pointsToUse`, `remainingPoints = pointsBalance - pointsToUse` | `finalAmount ≥ 0.7 × orderAmount` (never below 70%), `remainingPoints ≥ 0`, both integers |
| failure `ok: false` | `reason: string` — one of `INVALID_INPUT`, `INVALID_POINTS`, `INSUFFICIENT_POINTS`, `EXCEEDS_LIMIT` | no amount/points fields present |

## Validation order (state machine of checks)

```text
start
 ├─ orderAmount not integer or ≤ 0, or pointsBalance not integer or < 0 → FAIL INVALID_INPUT
 ├─ pointsToUse not integer or < 0                                     → FAIL INVALID_POINTS
 ├─ pointsToUse > pointsBalance                                        → FAIL INSUFFICIENT_POINTS
 ├─ pointsToUse > floor(orderAmount*3/10)                              → FAIL EXCEEDS_LIMIT
 └─ otherwise                                                          → OK (finalAmount, remainingPoints)
```

Exactly one reason is ever returned (first hit). `pointsToUse = 0` passes every guard and yields
`finalAmount = orderAmount`, `remainingPoints = pointsBalance`.

## Relationships

None beyond the input/output pairing; the function does not know about members or orders as
persisted records (caller's responsibility, per spec Assumptions).
