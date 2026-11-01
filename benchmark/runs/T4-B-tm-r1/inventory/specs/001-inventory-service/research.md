# Research: Inventory Service (Stock Reservation)

No `NEEDS CLARIFICATION` remained in Technical Context; the items below record the technical
decisions needed for Phase 1.

## R1. Idempotency store

- **Decision**: keep a `Set<string>` of processed event ids plus a per-order record
  (`Map<orderId, OrderRecord>`). An event is processed only if its id is new; an `OrderPlaced` is
  acted on only if no record exists for its order id.
- **Rationale**: Spec FR-007 (same id → ignore) and FR-008 (one decision per order id) are two
  different keys, so two lookups are needed. Both are O(1).
- **Alternatives considered**: dedup by order id only (would wrongly ignore a release after a
  reservation, since both carry the same order id); dedup by event id only (would double-reserve
  on a second `OrderPlaced` with a new id, which the owner left to engineer judgement and we chose
  to ignore).

## R2. Event id generation

- **Decision**: deterministic ids `inventory:<EventType>:<orderId>` (e.g.
  `inventory:StockReserved:O1`).
- **Rationale**: only the inventory service emits `StockReserved` / `StockRejected` /
  `StockReleased`, and the spec guarantees at most one reservation decision and at most one release
  per order id, so the triple is unique system-wide (FR-011) without randomness. Deterministic ids
  make scenarios assertable and make a redelivered emitted event recognisable downstream.
- **Alternatives considered**: `crypto.randomUUID()` (unique but untestable by value, and a
  re-emission would look like a new event); a counter with prefix (unique only if other services
  avoid the prefix; also not stable across process restarts).

## R3. Out-of-order release before placement

- **Decision**: on `PaymentFailed` / `OrderCancelled` for an unknown order id, create an order
  record in state `TERMINATED`; a later `OrderPlaced` for that id emits nothing and changes nothing.
- **Rationale**: owner's answer for cancel-first (Q2 → A) and engineer's judgement extended to
  payment-failed-first (an order in FAILED state will never pay; reserving would lock stock).
- **Alternatives considered**: reserve anyway (locks stock forever); emit `StockRejected`
  (owner explicitly chose "no event").

## R4. Available stock representation

- **Decision**: a single `Map<sku, number>` of *available* quantity initialised from a copy of the
  `stock` argument; reservation subtracts, release adds back the recorded quantity of the order.
- **Rationale**: `getAvailable(sku)` is then a direct lookup (0 for unknown SKUs). Storing the
  reserved qty on the order record guarantees release returns exactly what was reserved (owner Q1).
- **Alternatives considered**: separate `initial` and `reserved` maps (more state, same
  behaviour).

## R5. Test layout with cucumber-js

- **Decision**: one feature file `tests/features/inventory.feature` grouped by user story with
  tags `@us1`..`@us4`; a custom World in `tests/support/world.ts` holding the service, a running
  list of emitted events, and a helper to build each incoming event type; steps in
  `tests/steps/inventory.steps.ts`. Assertions use `node:assert/strict`.
- **Rationale**: matches `cucumber.cjs` (`paths`, `import`) and the constitution's test layout;
  tests must build colleague events themselves (US independence).
- **Alternatives considered**: one feature file per user story (more files, no benefit at this
  size).
