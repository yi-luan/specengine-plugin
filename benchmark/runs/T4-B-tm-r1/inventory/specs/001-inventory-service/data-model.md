# Data Model: Inventory Service

All state is private to the service instance created by `createInventoryService(stock)`.

## Entities

### StockLine (`available: Map<string, number>`)

| Field | Type | Notes |
|-------|------|-------|
| sku | string (key) | from the initial stock table |
| available | integer ≥ 0 | initial quantity minus live reservations |

- Unknown SKU → `getAvailable` returns 0.
- Invariant: `0 ≤ available(sku) ≤ initial(sku)`.

### OrderRecord (`orders: Map<string, OrderRecord>`)

| Field | Type | Notes |
|-------|------|-------|
| orderId | string (key) | from the event |
| status | `'RESERVED' \| 'REJECTED' \| 'RELEASED' \| 'TERMINATED'` | see state machine |
| sku | string | only meaningful when status is RESERVED / RELEASED |
| qty | integer | quantity reserved (exactly what is returned on release) |

### ProcessedEvent (`seen: Set<string>`)

- Key: incoming event `id`. Any event whose id is already in the set is ignored entirely.

## State transitions (per order id)

```text
(no record)
  ├─ OrderPlaced, qty ≥ 1 and qty ≤ available(sku) ──► RESERVED   emit StockReserved
  ├─ OrderPlaced, otherwise ───────────────────────────► REJECTED   emit StockRejected
  └─ PaymentFailed | OrderCancelled ────────────────────► TERMINATED (no emit, no stock change)

RESERVED
  ├─ PaymentFailed | OrderCancelled ──► RELEASED   available += qty, emit StockReleased
  ├─ OrderPlaced (new id) ─────────────► RESERVED   (ignored)
  └─ PaymentSucceeded ─────────────────► RESERVED   (ignored; stock stays sold)

REJECTED / RELEASED / TERMINATED
  └─ any event ─────────────────────────► unchanged (ignored, no emit)
```

Every transition is preceded by the event-id check: if `seen` already contains the id, nothing
above runs.

## Emitted events

| Trigger | Event | id |
|---------|-------|----|
| reservation made | `{ type: 'StockReserved', orderId }` | `inventory:StockReserved:<orderId>` |
| reservation refused | `{ type: 'StockRejected', orderId }` | `inventory:StockRejected:<orderId>` |
| reservation returned | `{ type: 'StockReleased', orderId }` | `inventory:StockReleased:<orderId>` |

Each id can be produced at most once per order id by construction of the state machine, so ids are
unique system-wide (only this service emits these types).
