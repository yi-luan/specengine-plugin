# Quickstart: Multi-Tenant Coupons

## Prerequisites

- Node.js 24, dependencies installed (`node_modules/` present; otherwise `npm install`).

## Run the acceptance suite

```sh
npm test
```

Expected: cucumber-js discovers `tests/features/coupon.feature`, loads
`tests/steps/coupon.steps.ts` and `tests/support/world.ts` through `tsx`, and reports all
scenarios passed (0 failed, 0 undefined, 0 pending). A JSON report is written to
`reports/cucumber.json`.

## Type check

```sh
npm run typecheck
```

Expected: no errors.

## Manual validation scenarios

Each scenario maps to a row in [contracts/applyCoupons.md](./contracts/applyCoupons.md):

1. Single PERCENT coupon: order 1000 with `P10` → final 900, discount 100.
2. Rounding: order 333 with PERCENT 15 → discount 49.
3. Stacking: order 1000 with `[SF30, S10]` (both stackable) → discount 130, applied in input order.
4. Non-stackable with any other coupon → `NOT_STACKABLE`.
5. Fixed discount exceeding the order → `DISCOUNT_EXCEEDS_AMOUNT`; exactly equal → final 0.
6. Precedence: invalid order amount plus a foreign-tenant coupon → `INVALID_INPUT`.

Data shapes are described in [data-model.md](./data-model.md).
