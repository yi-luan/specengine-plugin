# Quickstart: validating Event-Driven Order Flow

## Prerequisites

- Node.js 24 (dependencies already installed in `node_modules/`)
- No Python, no database, no network

## Commands

```bash
npm test            # runs every tests/features/**/*.feature with cucumber-js via tsx
npm run typecheck   # tsc --noEmit (strict)
```

Expected: `N scenarios (N passed)`, `M steps (M passed)`, no undefined/pending steps; typecheck
prints nothing and exits 0.

## Validation scenarios (one feature file each, see spec.md user stories)

| Feature file | Proves |
|--------------|--------|
| `tests/features/successful-purchase.feature` | place → reserve → charge → CONFIRMED; stock 10→8, balance 100→50; irrelevant events return `[]` |
| `tests/features/order-validation.feature` | `DUPLICATE_ORDER`, `INVALID_INPUT` (qty/amount not positive integer, empty ids), unknown order/SKU/customer lookups |
| `tests/features/insufficient-stock-or-funds.feature` | REJECTED with stock untouched; FAILED with stock released and balance untouched |
| `tests/features/customer-cancellation.feature` | cancel PENDING/CONFIRMED → CANCELLED/CUSTOMER, `StockReleased`, `PaymentRefunded`; NOT_CANCELLABLE / ORDER_NOT_FOUND |
| `tests/features/timeout-cancellation.feature` | `tick` at exactly +15:00 cancels (TIMEOUT), +14:59 does not; terminal orders untouched; one cancel per order |
| `tests/features/reliable-delivery.feature` | duplicates (same/different id) are no-ops; out-of-order prerequisites settle once; cancellation is final; unique ids |

## Manual smoke (optional)

```ts
import { createOrderService, createInventoryService, createPaymentService } from './src/shop.js';
const o = createOrderService(), i = createInventoryService({ A: 10 }), p = createPaymentService({ c1: 100 });
const r = o.placeOrder({ orderId: 'o1', customerId: 'c1', sku: 'A', qty: 2, amount: 50, at: '2026-06-15T12:00:00Z' });
// broadcast r.events to o/i/p.handle repeatedly until nothing new is emitted, then:
// o.getOrder('o1') -> { status: 'CONFIRMED' }, i.getAvailable('A') -> 8, p.getBalance('c1') -> 50
```

Contract details: [contracts/shop-api.md](contracts/shop-api.md). State rules:
[data-model.md](data-model.md).
