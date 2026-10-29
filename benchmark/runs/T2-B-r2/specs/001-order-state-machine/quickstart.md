# Quickstart: validating the Order State Machine

## Prerequisites

- Node.js 24 and the already-installed devDependencies (`node_modules/` present; otherwise
  `npm install`).

## Run the acceptance suite

```bash
npm test            # cucumber-js: discovers tests/features/**/*.feature, loads tests/steps + tests/support via tsx
npm run typecheck   # tsc --noEmit over src/ and tests/
```

Expected outcome when the feature is complete: every scenario in
`tests/features/order-state-machine.feature` passes — the summary line reports
`N scenarios (N passed)` and `M steps (M passed)` with 0 failed/undefined/pending, and the run
finishes well within 10 s (SC-004). `reports/cucumber.json` is regenerated as a by-product.

## Validation scenarios (what the suite proves)

1. **Happy path**: create(100) → CREATED → pay(100) → PAID → ship → SHIPPED → refund(30)
   stays SHIPPED with refundedAmount 30 → refund(70) → REFUNDED.
2. **Cancel paths**: CREATED → cancel → CANCELLED (refundedAmount 0);
   PAID → cancel → CANCELLED with refundedAmount = paidAmount = 100.
3. **Rejection matrix**: every operation from every disallowed state returns
   `INVALID_TRANSITION`; see the transition table in [data-model.md](data-model.md).
4. **Amount rules**: create/pay/refund with 0, negative or non-integer → `INVALID_AMOUNT`;
   pay 99/101 → `AMOUNT_MISMATCH`; refund beyond the balance → `REFUND_EXCEEDS_PAID` with the
   order untouched.
5. **Purity**: after every call (success or failure) the input order deep-equals its
   pre-call snapshot, and on success the returned order is a different object.

## Manual smoke check (optional)

```bash
node --import tsx -e "import('./src/order.ts').then(m => { const a = m.createOrder('o-1', 100); console.log(a); })"
```

Expected: `{ ok: true, order: { id: 'o-1', status: 'CREATED', amount: 100, paidAmount: 0, refundedAmount: 0 } }`.

See [contracts/order-api.md](contracts/order-api.md) for the exact function contracts.
