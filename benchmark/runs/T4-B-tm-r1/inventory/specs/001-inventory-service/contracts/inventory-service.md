# Contract: InventoryService

The public contract is fixed by `src/events.ts` and must not be changed.

## Factory

```ts
export function createInventoryService(stock: Record<string, number>): InventoryService;
```

- `stock`: SKU → initial integer quantity. The argument is copied; later mutation of the caller's
  object has no effect.

## Interface

```ts
interface InventoryService {
  handle(event: Event): Event[];     // returns events emitted because of this event
  getAvailable(sku: string): number; // quantity currently available for reservation
}
```

## `handle` behaviour by incoming event type

| Incoming event | Precondition | Effect | Returned events |
|----------------|--------------|--------|-----------------|
| any | `event.id` already processed | none | `[]` |
| `OrderPlaced` | order id unknown, `qty ≥ 1`, `qty ≤ available(sku)` | available(sku) −= qty; order → RESERVED | `[StockReserved]` |
| `OrderPlaced` | order id unknown, otherwise (insufficient, unknown SKU, `qty ≤ 0`) | order → REJECTED | `[StockRejected]` |
| `OrderPlaced` | order id already known (any status) | none | `[]` |
| `PaymentFailed` / `OrderCancelled` | order RESERVED | available(sku) += qty; order → RELEASED | `[StockReleased]` |
| `PaymentFailed` / `OrderCancelled` | order id unknown | order → TERMINATED | `[]` |
| `PaymentFailed` / `OrderCancelled` | order REJECTED / RELEASED / TERMINATED | none | `[]` |
| `PaymentSucceeded`, `PaymentRefunded`, `StockReserved`, `StockRejected`, `StockReleased` | — | none | `[]` |

Emitted events carry `id` = `inventory:<type>:<orderId>` and the incoming `orderId`.

## `getAvailable(sku)`

Returns the current available integer for `sku`; `0` when the SKU was not in the initial table.
Never negative; never above the initial quantity.
