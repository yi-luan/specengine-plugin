# Research: Event-Driven Order Flow

No NEEDS CLARIFICATION items remained in Technical Context; the decisions below resolve the
design choices the spec leaves open to implementation.

## Decision 1: Deduplication key

- **Decision**: Each service keeps a per-order record with explicit step flags (reserved /
  rejected / released, charged / failed / refunded, status transitions). An incoming event only
  acts if the step for that order has not been performed. Event `id` is not used for dedup.
- **Rationale**: Clarification Q6 (delegated) — per-(order, step) dedup also covers re-sent
  events with new ids and makes double charge / double release impossible by construction.
- **Alternatives considered**: a `Set` of processed event ids (fails when a duplicate carries a
  new id); both keys combined (redundant once step flags exist).

## Decision 2: Out-of-order handling by "remember then settle"

- **Decision**: The payment service stores whatever it learns (`OrderPlaced` details,
  `StockReserved`, `OrderCancelled`) and calls a single `settle(orderId)` after every update,
  which charges only when details + reservation are known, no outcome yet, and not cancelled.
  The inventory service records `OrderCancelled`/`PaymentFailed` seen before `OrderPlaced` as a
  closed order so a late `OrderPlaced` reserves nothing.
- **Rationale**: FR-014; keeps each handler trivial and makes ordering irrelevant.
- **Alternatives considered**: buffering events and replaying in canonical order (more state,
  harder to reason about).

## Decision 3: Terminal states and cancellation finality

- **Decision**: Order service transitions only from PENDING (to CONFIRMED/REJECTED/FAILED) or from
  PENDING/CONFIRMED to CANCELLED via `cancelOrder`/`tick`. Any event for an order in CANCELLED,
  REJECTED or FAILED is ignored. Payment refunds when it has both charged and seen
  `OrderCancelled` (in either order).
- **Rationale**: Clarifications Q1, Q3.

## Decision 4: Timeout evaluation

- **Decision**: `tick(now)` scans all PENDING orders and cancels those with
  `Date.parse(now) >= Date.parse(placedAt) + 15 * 60 * 1000` (inclusive), reason TIMEOUT. One
  `OrderCancelled` per order; subsequent ticks emit nothing for it. Orders are scanned in
  placement (insertion) order for deterministic event order.
- **Rationale**: Clarification Q2; `Map` preserves insertion order.

## Decision 5: Event id generation

- **Decision**: `src/ids.ts` exports `nextEventId(prefix)` using one module-level counter:
  `${prefix}-${++counter}` (prefixes `ord`, `inv`, `pay`). Unique across services and across all
  instances created in a process; no randomness.
- **Rationale**: FR-017, Constitution V (determinism).
- **Alternatives considered**: `crypto.randomUUID()` (non-deterministic, harder to assert).

## Decision 6: Input validation

- **Decision**: `placeOrder` rejects with `DUPLICATE_ORDER` when the id exists, else
  `INVALID_INPUT` when `qty`/`amount` is not a positive integer (`Number.isInteger(x) && x >= 1`)
  or `orderId`/`customerId`/`sku` is `''`. Validation order: INVALID_INPUT is checked first,
  then DUPLICATE_ORDER, so a malformed re-submission is reported as malformed.
- **Rationale**: Clarification Q5.

## Decision 7: Test harness shape

- **Decision**: A cucumber Custom World holds the three services, an append-only log of every
  event emitted, and `broadcast(events)` that delivers each event to all three `handle`s and
  recursively delivers whatever they emit until the queue drains. Steps can also deliver a single
  event to a single service to test duplicates / ordering precisely.
- **Rationale**: Mirrors the requirement's "every event is broadcast to all three services";
  keeps step definitions on the public API only (Constitution II).
