# Contract: `src/points.ts` public API

**Date**: 2026-10-20 | **Spec**: [../spec.md](../spec.md) | **Fixed by requirement — names and shapes MUST NOT change.**

```ts
export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };
export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult;
```

## Semantics

- Pure and synchronous. No I/O, no database, no global state, no exceptions for business-rule
  failures (they are returned as `{ ok: false, reason }`).
- All three inputs are whole numbers (dollars / points). Non-integer or out-of-range values are
  reported as failures, never thrown.
- `reason` is always one of the following string codes:

| Code | Condition (checked in this order) |
|------|-----------------------------------|
| `INVALID_INPUT` | `orderAmount` is not an integer or ≤ 0; or `pointsBalance` is not an integer or < 0 |
| `INVALID_POINTS` | `pointsToUse` is not an integer or < 0 |
| `INSUFFICIENT_POINTS` | `pointsToUse > pointsBalance` |
| `EXCEEDS_LIMIT` | `pointsToUse > Math.floor(orderAmount * 3 / 10)` |

- On success: `finalAmount = orderAmount - pointsToUse`, `remainingPoints = pointsBalance - pointsToUse`.
- `pointsToUse = 0` is a success that returns the inputs unchanged.
- Using exactly 30% (e.g. 300 points on a 1000-dollar order) is allowed.

## Examples

| orderAmount | pointsBalance | pointsToUse | Result |
|-------------|---------------|-------------|--------|
| 1000 | 500 | 200 | `{ ok: true, finalAmount: 800, remainingPoints: 300 }` |
| 1000 | 500 | 300 | `{ ok: true, finalAmount: 700, remainingPoints: 200 }` |
| 1000 | 500 | 301 | `{ ok: false, reason: 'EXCEEDS_LIMIT' }` |
| 1001 | 500 | 300 | `{ ok: true, finalAmount: 701, remainingPoints: 200 }` |
| 1001 | 500 | 301 | `{ ok: false, reason: 'EXCEEDS_LIMIT' }` |
| 1000 | 100 | 150 | `{ ok: false, reason: 'INSUFFICIENT_POINTS' }` |
| 1000 | 500 | 10.5 | `{ ok: false, reason: 'INVALID_POINTS' }` |
| 1000 | 500 | -5 | `{ ok: false, reason: 'INVALID_POINTS' }` |
| 1000 | 500 | 0 | `{ ok: true, finalAmount: 1000, remainingPoints: 500 }` |
| 0 | 500 | 10 | `{ ok: false, reason: 'INVALID_INPUT' }` |
| 1000 | -1 | 10 | `{ ok: false, reason: 'INVALID_INPUT' }` |
| 100 | 10 | 50 | `{ ok: false, reason: 'INSUFFICIENT_POINTS' }` (balance checked before cap) |
