# Quickstart: validating the Payment Service

## Prerequisites

- Node.js 24 (any version supporting `--import tsx` and `crypto.randomUUID`)
- `node_modules` already present (symlinked to the shared benchmark base)

## Commands

```bash
cd <repo root>
npm run typecheck   # tsc --noEmit over src/ and tests/
npm test            # cucumber-js: tests/features/**/*.feature with tests/steps + tests/support
```

Expected outcome: `npm run typecheck` prints nothing; `npm test` reports every scenario
passed, 0 failed, 0 undefined/pending.

## Validation scenarios (what the feature file proves)

1. **Charge on reservation** — `OrderPlaced(amount 60)` then `StockReserved` with balance
   100 → balance 40, one `PaymentSucceeded{amount: 60}`; with balance 50 → balance 50, one
   `PaymentFailed`; with balance exactly 60 → success, balance 0.
2. **Refund on cancellation** — after a successful charge, `OrderCancelled` → balance
   restored, one `PaymentRefunded{amount: 60}`; cancelling a never-charged (failed or
   unreserved) order → no event, balance unchanged.
3. **Duplicates** — redelivering the same `StockReserved` / `OrderCancelled` / `OrderPlaced`
   (same id) → no state change, no event; redelivering `StockReserved` after a failed charge
   → still nothing even if the balance is now sufficient.
4. **Out of order** — `StockReserved` before `OrderPlaced` → charge happens when
   `OrderPlaced` arrives; `OrderCancelled` before `StockReserved` → never charged; all three
   arriving as cancel, reserve, place → never charged.
5. **Ignored types** — `StockRejected`, `StockReleased`, payment events → `[]`.
6. **Ids** — every emitted event id is unique across a scenario that emits several events.

See [contracts/payment-service.md](contracts/payment-service.md) for the exact table and
[data-model.md](data-model.md) for the state machine.
