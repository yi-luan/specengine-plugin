# Research: Payment Service

All Technical Context items were resolvable from the repository itself (package.json,
tsconfig.json, cucumber.cjs, src/events.ts); no NEEDS CLARIFICATION markers remained. The
following design decisions were researched against the spec's delivery guarantees.

## R1 — Duplicate-delivery protection (event-level idempotency)

- **Decision**: Keep a `Set<string>` of every event id the service has already handled.
  At the top of `handle`, if the id is in the set, return `[]` without touching any state;
  otherwise add it and continue. This applies to every event type, including ignored ones
  (harmless, and matches the owner's rule "same id, second delivery onward is ignored").
- **Rationale**: The requirements owner explicitly ruled that a redelivered event (same id)
  must be ignored from the second delivery onward with no state change and no event. A set
  keyed by event id is the direct encoding of that rule and is O(1).
- **Alternatives considered**: Relying only on per-order state (would still "work" for
  charge/refund but would not guarantee *no state change* for e.g. a duplicate
  `OrderPlaced` carrying different data); storing only the last N ids (bounded memory, but
  breaks the guarantee for late duplicates) — rejected for this in-memory scope.

## R2 — Per-order state machine (order-level idempotency + out-of-order delivery)

- **Decision**: One record per order id in a `Map<string, OrderRecord>` with fields
  `customerId?`, `amount?`, `reserved: boolean`, `cancelled: boolean`,
  `payment: 'NONE' | 'PAID' | 'FAILED' | 'REFUNDED'`, `charged: number`. Records are created
  lazily by whichever event arrives first. A single private `tryCharge(record)` is invoked
  from both the `StockReserved` handler and the `OrderPlaced` handler; it charges only when
  details are known, `reserved` is true, `cancelled` is false and `payment === 'NONE'`.
  Refund happens on `OrderCancelled` only when `payment === 'PAID'`, moving to `REFUNDED`.
- **Rationale**: Encodes every clarified rule in one place: reservation-before-details
  (Q3 → charge on `OrderPlaced`), cancellation-before-reservation (Q2 → `cancelled` flag
  blocks the charge), failure is final (Q4 → `FAILED` blocks re-charge), refund at most
  once (Q1 → only from `PAID`), and makes `handle` order-insensitive.
- **Alternatives considered**: Separate maps per concern (orders, reservations, cancels) —
  more lookups, same information; explicit state enum covering all 2×2×4 combinations —
  harder to read than three orthogonal flags plus a payment state.

## R3 — System-wide unique event ids

- **Decision**: `id: \`pay-${randomUUID()}\`` using `node:crypto`.
- **Rationale**: Colleagues generate their own ids with unknown schemes; a UUID v4 is
  unique across services and restarts without coordination, and the `pay-` prefix makes
  origin obvious when debugging. Node 24 ships `randomUUID` natively; no dependency added.
- **Alternatives considered**: `payment-<counter>` (collides across restarts/instances and
  could collide with a colleague using the same pattern); `${orderId}-paid` style
  deterministic ids (would collide if the same order had to emit the same type twice —
  not possible under the final-failure rule, but fragile).

## R4 — Balance handling

- **Decision**: Copy the constructor's `balances` into a private `Map<string, number>`
  (so the caller's object is not mutated); unknown customers read as 0; charge succeeds iff
  `balance >= amount`; refund adds back `record.charged` (the amount actually charged, not
  whatever a later event might claim).
- **Rationale**: FR-007, FR-009 and the edge case "refund exactly what was charged".
- **Alternatives considered**: Mutating the passed-in object (surprising for callers and
  tests that reuse fixtures) — rejected.

## R5 — Test harness shape

- **Decision**: One feature file `tests/features/payment.feature` grouped by user story
  (charge / refund / duplicates & ordering). A custom cucumber `World`
  (`tests/support/world.ts`) holds the service instance, a per-scenario event-id counter for
  fabricated inbound events, and the list of events returned by the last `handle` call and
  of all events ever returned. Steps in `tests/steps/payment.steps.ts` use plain-language
  phrasing with parameters for customer/order/amount. Assertions use `node:assert/strict`.
- **Rationale**: Matches `cucumber.cjs` globs and the constitution's test-first rule; a
  World keeps steps stateless and scenarios isolated.
- **Alternatives considered**: `DataTable`-driven event scripts (compact but harder to read
  for non-engineers); separate feature files per story (fine, but one file is easier to
  review at this size).
