---

description: "Task list for the Payment Service feature"
---

# Tasks: Payment Service (event-driven order flow)

**Input**: Design documents from `/specs/001-payment-service/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks ARE included — the constitution (Principle III) mandates test-first with
executable Gherkin specifications, and `npm test` must be green at the end.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: product code in `src/`, tests in `tests/` at repository root
- Only `src/payment.ts` and files under `tests/` may be created or edited

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test scaffolding that every story's scenarios rely on

- [X] T001 Create `tests/features/` directory (matches the `tests/features/**/*.feature` glob in `cucumber.cjs`) and remove nothing else
- [X] T002 [P] Create custom cucumber World in `tests/support/world.ts`: holds `service: PaymentService | undefined`, `lastEvents: Event[]`, `allEvents: Event[]`, a per-scenario inbound-id counter, helper `nextId(prefix)` and helper `send(event)` that calls `service.handle`, stores the result in `lastEvents` and appends to `allEvents`; register with `setWorldConstructor`
- [X] T003 [P] Add `tests/support/hooks.ts` with a `Before` hook that resets the World (or rely on cucumber creating a fresh World per scenario — document the choice in a comment)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Skeleton of the service and shared step vocabulary that all stories use

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Replace the `throw new Error('尚未實作')` stub in `src/payment.ts` with a closure-based `createPaymentService(balances)` that copies `balances` into a private `Map<string, number>`, defines the `OrderRecord` type per data-model.md (`customerId?: string`, `amount?: number`, `reserved: boolean`, `cancelled: boolean`, `payment: 'NONE' | 'PAID' | 'FAILED' | 'REFUNDED'`, `charged: number`), a `Map<string, OrderRecord>`, a `Set<string>` of handled event ids, a `newId()` helper returning `` `pay-${randomUUID()}` `` from `node:crypto`, and returns `{ handle, getBalance }` where `handle` currently only performs event-id dedupe (return `[]` if id seen, else record it) and otherwise returns `[]`; `getBalance` returns the map value or `0`
- [X] T005 Write the shared Given/When/Then vocabulary in `tests/steps/payment.steps.ts`: `Given a payment service with balances:` (DataTable customer|balance), `Given customer {string} has balance {int}` (convenience for single customer), `When the service receives OrderPlaced for order {string} by customer {string} amount {int}`, `When the service receives StockReserved for order {string}`, `When the service receives OrderCancelled for order {string}`, `When the service receives {word} for order {string}` (generic ignored types: StockRejected / StockReleased / PaymentSucceeded / PaymentFailed / PaymentRefunded with dummy fields), `When the same {word} event for order {string} is delivered again` (re-sends the last inbound event of that type for that order with the SAME id), `Then no event is emitted`, `Then exactly one {word} is emitted for order {string}`, `Then exactly one {word} is emitted for order {string} with amount {int}`, `Then customer {string} has balance {int}`, `Then all emitted event ids are unique`, `Then {int} events were emitted in total for order {string}`; assertions via `node:assert/strict`
- [X] T006 Run `npm run typecheck` and `npm test` to confirm the harness loads (0 scenarios or all undefined is acceptable at this point; no load errors)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Charge the customer once stock is reserved (Priority: P1) 🎯 MVP

**Goal**: On `StockReserved` for a known order, charge the customer and emit `PaymentSucceeded` (balance >= amount) or `PaymentFailed`; ignore unrelated event types.

**Independent Test**: Feed `OrderPlaced` then `StockReserved` for one order and check the returned event and `getBalance`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [US1] Create `tests/features/payment.feature` with `Feature: Payment service` and a `# US1` block containing scenarios: sufficient balance (100, amount 60 → balance 40, one PaymentSucceeded amount 60); insufficient balance (50, amount 60 → balance 50, one PaymentFailed); exact balance (60, amount 60 → balance 0, PaymentSucceeded); amount 0 order (PaymentSucceeded amount 0, balance unchanged); unknown customer (not in table, amount 10 → PaymentFailed, getBalance 0); ignored types (StockRejected, StockReleased, PaymentSucceeded, PaymentFailed, PaymentRefunded each → no event, balance unchanged); `OrderPlaced` alone → no event; two orders of the same customer drain the shared balance in arrival order (100; A=60 ok, B=60 fails)
- [X] T008 [US1] Run `npm test` and confirm the US1 scenarios FAIL (red) against the T004 skeleton

### Implementation for User Story 1

- [X] T009 [US1] In `src/payment.ts` add `getOrCreate(orderId)` for `OrderRecord`, handle `OrderPlaced` (store `customerId`/`amount` only if not yet known), handle `StockReserved` (set `reserved = true`), and implement private `tryCharge(record, orderId): Event[]` that charges only when `customerId`/`amount` known AND `reserved` AND `!cancelled` AND `payment === 'NONE'`: if `balance >= amount` deduct, set `payment='PAID'`, `charged=amount`, return `[PaymentSucceeded{orderId, amount}]`; else set `payment='FAILED'`, return `[PaymentFailed{orderId}]`; call `tryCharge` after both `OrderPlaced` and `StockReserved`; all other types return `[]`
- [X] T010 [US1] Run `npm run typecheck` and `npm test`; all US1 scenarios green

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Refund when an order is cancelled (Priority: P2)

**Goal**: On `OrderCancelled`, refund the charged amount exactly once and emit `PaymentRefunded`; cancellations of never-charged orders emit nothing; a reservation arriving after a cancellation never charges.

**Independent Test**: After a successful charge, send `OrderCancelled` and check balance restored + one `PaymentRefunded`.

### Tests for User Story 2 ⚠️

- [X] T011 [US2] Append a `# US2` block to `tests/features/payment.feature`: refund after successful charge (balance back to 100, one PaymentRefunded amount 60); cancel after failed charge (no event, balance unchanged); cancel before any reservation (no event), then StockReserved arrives (no event, balance unchanged); cancel → OrderPlaced → StockReserved (no charge); refund restores exactly the charged amount even when a later OrderPlaced for the same order reports a different amount; second (new-id) OrderCancelled after refund emits nothing and does not change balance
- [X] T012 [US2] Run `npm test` and confirm the US2 scenarios FAIL (red)

### Implementation for User Story 2

- [X] T013 [US2] In `src/payment.ts` handle `OrderCancelled`: set `cancelled = true`; if `payment === 'PAID'` add `charged` back to the customer's balance, set `payment = 'REFUNDED'`, return `[PaymentRefunded{orderId, amount: charged}]`; otherwise return `[]`. Confirm `tryCharge` already refuses when `cancelled` is true
- [X] T014 [US2] Run `npm run typecheck` and `npm test`; US1 + US2 green

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Behave correctly under duplicate and out-of-order delivery (Priority: P3)

**Goal**: Event-id dedupe (same id ignored from second delivery on), order-level idempotency (no double charge / double refund / failed-is-final), reservation-before-details charges on `OrderPlaced`, unique outbound ids.

**Independent Test**: Replay and shuffle the events of one order; balances and emitted events match ideal single ordered delivery.

### Tests for User Story 3 ⚠️

- [X] T015 [US3] Append a `# US3` block to `tests/features/payment.feature`: same `StockReserved` redelivered after success (no event, balance unchanged); same `OrderCancelled` redelivered after refund (no event); duplicate `StockReserved` after charge-then-refund (no charge); same `StockReserved` redelivered after a FAILED charge even though a later refund of another order made the balance sufficient (no event, balance unchanged); new-id `StockReserved` after FAILED (no event — failed is final); duplicate `OrderPlaced` with a different amount (no event, stored amount unchanged — verify via later charge amount); `StockReserved` before `OrderPlaced` (first → no event; second → one PaymentSucceeded returned from the OrderPlaced call); `StockReserved` → `OrderCancelled` → `OrderPlaced` (no charge, no event at any step); same ignored-type event redelivered (no event); a full happy path (place, reserve, cancel) yields exactly 2 emitted events with unique ids
- [X] T016 [US3] Run `npm test` and confirm the new US3 scenarios that depend on missing behaviour FAIL (red); note which ones already pass thanks to T004/T009/T013

### Implementation for User Story 3

- [X] T017 [US3] In `src/payment.ts` verify/complete: dedupe set consulted before any state change for every event type (including ignored types); `OrderPlaced` never overwrites known details; `tryCharge` is the single charge path so reservation-before-details and failed-is-final hold; outbound ids come from `newId()`
- [X] T018 [US3] Run `npm run typecheck` and `npm test`; all stories green

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against the constitution gates and spec

- [X] T019 [P] Read through `src/payment.ts` for clarity: short comments on the dedupe set, the state machine and `tryCharge`; no dead code; file header comment kept
- [X] T020 [P] Confirm with `git status` that only `src/payment.ts`, `tests/**`, `specs/**`, `.specify/**` and `BENCH-LOG.md` changed (Principles I & II)
- [X] T021 Run quickstart.md validation: `npm run typecheck` then `npm test`; record scenario/step counts in BENCH-LOG.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion; executed sequentially P1 → P2 → P3 because all three edit the same two files (`src/payment.ts`, `tests/features/payment.feature`)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies on other stories
- **User Story 2 (P2)**: Builds on the charge path from US1 (refund needs a `PAID` record) but its scenarios are independently runnable
- **User Story 3 (P3)**: Exercises US1 + US2 paths under duplication/reordering; the dedupe set itself exists since T004

### Within Each User Story

- Feature scenarios MUST be written and FAIL before implementation
- Single service file: implement, then run typecheck + test
- Story complete (green) before moving to next priority

### Parallel Opportunities

- T002 and T003 (different support files)
- T019 and T020 in Polish
- Everything else is sequential by design (single owned source file, single feature file)

---

## Parallel Example: Setup

```bash
# Launch together:
Task: "Create custom cucumber World in tests/support/world.ts"
Task: "Add tests/support/hooks.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` green for US1 scenarios
5. Ready to hand to the integrator as a charging-only payment service

### Incremental Delivery

1. Setup + Foundational → harness loads, skeleton returns `[]`
2. Add User Story 1 → charge path green (MVP)
3. Add User Story 2 → refund path green
4. Add User Story 3 → delivery-robustness scenarios green
5. Polish → gates checked, log updated

### Parallel Team Strategy

Not applicable — one engineer owns the single service file; stories are delivered sequentially.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Never touch `src/events.ts`, `src/shop.ts`, `src/order.ts`, `src/inventory.ts`
