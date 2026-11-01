# Quickstart: validating the Inventory Service

## Prerequisites

- Node 24 with the repository's `node_modules` (already linked).
- No other services are needed: scenarios build `OrderPlaced`, `PaymentFailed`, `OrderCancelled`
  and the other events themselves (see [contracts/inventory-service.md](contracts/inventory-service.md)).

## Commands

```bash
npm test            # runs all cucumber scenarios in tests/features/
npm run typecheck   # tsc --noEmit over src/ and tests/
```

## Expected outcome

`npm test` reports every scenario in `tests/features/inventory.feature` as passed, with no
undefined or pending steps. The scenarios map to the spec as follows:

| Tag | Spec | Scenarios |
|-----|------|-----------|
| `@us1` | User Story 1, FR-001..003 | reserve, reject (insufficient), reserve exact, unknown SKU, two competing orders, non-positive quantity |
| `@us2` | User Story 2, FR-004..006 | release on PaymentFailed, release on OrderCancelled, release for rejected order (nothing), second release ignored, cancel after PaymentSucceeded |
| `@us3` | User Story 3, FR-007..009 | duplicate OrderPlaced, duplicate PaymentFailed, cancel before placement, payment-failed before placement, second OrderPlaced with new id |
| `@us4` | User Story 4, FR-010 | each ignored event type leaves stock and output untouched |
| `@ids` | FR-011 | emitted ids are unique and follow `inventory:<type>:<orderId>` |

## Manual smoke check (optional)

```bash
node --import tsx -e "import('./src/inventory.ts').then(m => { const s = m.createInventoryService({A: 10}); console.log(s.handle({id:'e1', type:'OrderPlaced', orderId:'O1', customerId:'C1', sku:'A', qty:3, amount:30, at:'2026-06-15T12:00:00Z'}), s.getAvailable('A')); })"
```

Expected: `[ { id: 'inventory:StockReserved:O1', type: 'StockReserved', orderId: 'O1' } ] 7`.
