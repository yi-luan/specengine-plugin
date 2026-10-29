# Contract: `applyCoupons`

Module: `src/coupon.ts` (path and names fixed by the requirement; MUST NOT be renamed).

```ts
export type Coupon = {
  tenantId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;            // PERCENT: 折扣百分比；FIXED: 折扣金額（元）
  validFrom: string;        // ISO 8601，例如 '2026-01-01T00:00:00Z'
  validTo: string;          // ISO 8601
  stackable: boolean;
  minOrderAmount?: number;  // 最低消費（元），未設定表示無限制
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };
export function applyCoupons(input: ApplyInput): ApplyResult;
```

## Behaviour

Pure, synchronous, no side effects. Never throws for business failures.

| Precedence | Condition (first match wins) | Result |
|-----------|-------------------------------|--------|
| 1 | `orderAmount` not a positive integer | `{ ok: false, reason: 'INVALID_INPUT' }` |
| 2 | any coupon: `value` non-integer, or PERCENT ∉ [1,100], or FIXED ≤ 0 | `{ ok: false, reason: 'INVALID_COUPON' }` |
| 3 | any coupon: `tenantId ≠ input.tenantId` | `{ ok: false, reason: 'TENANT_MISMATCH' }` |
| 4 | same `tenantId + code` presented more than once | `{ ok: false, reason: 'DUPLICATE_COUPON' }` |
| 5 | any coupon: `now < validFrom` or `now > validTo` (inclusive bounds) | `{ ok: false, reason: 'COUPON_EXPIRED' }` |
| 6 | any coupon with `minOrderAmount` and `orderAmount < minOrderAmount` | `{ ok: false, reason: 'MIN_ORDER_NOT_MET' }` |
| 7 | `coupons.length > 1` and any coupon `stackable === false` | `{ ok: false, reason: 'NOT_STACKABLE' }` |
| 8 | `discount > orderAmount` | `{ ok: false, reason: 'DISCOUNT_EXCEEDS_AMOUNT' }` |
| — | otherwise | `{ ok: true, finalAmount: orderAmount − discount, discount, applied: codes in input order }` |

where `discount = Σ Math.floor(orderAmount × value / 100)` over PERCENT coupons
`+ Σ value` over FIXED coupons.

## Examples

| Input | Output |
|-------|--------|
| 1000, `[P10]` (PERCENT 10) | `{ ok: true, finalAmount: 900, discount: 100, applied: ['P10'] }` |
| 333, `[P15]` (PERCENT 15) | `{ ok: true, finalAmount: 284, discount: 49, applied: ['P15'] }` |
| 1000, `[SF30 (FIXED 30), S10 (PERCENT 10)]` both stackable | `{ ok: true, finalAmount: 870, discount: 130, applied: ['SF30','S10'] }` |
| 100, `[F150]` (FIXED 150) | `{ ok: false, reason: 'DISCOUNT_EXCEEDS_AMOUNT' }` |
| 100, `[F100]` (FIXED 100) | `{ ok: true, finalAmount: 0, discount: 100, applied: ['F100'] }` |
| 300, `[]` | `{ ok: true, finalAmount: 300, discount: 0, applied: [] }` |
