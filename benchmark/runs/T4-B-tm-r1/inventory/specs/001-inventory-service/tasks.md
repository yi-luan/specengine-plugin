# Tasks: Inventory Service (Stock Reservation)

**Input**: Design documents from `/specs/001-inventory-service/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/inventory-service.md, quickstart.md

**Tests**: Requested — the constitution (Principle III) and spec SC-004 require a Gherkin scenario
per behaviour, so each story phase starts with feature scenarios and step definitions written
before the implementation that makes them pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: product code in `src/` (only `src/inventory.ts` is owned by this feature),
  tests in `tests/features/`, `tests/steps/`, `tests/support/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the test layout the plan requires; no dependencies to install.

- [X] T001 Create directory `tests/features/` (the `cucumber.cjs` `paths` entry `tests/features/**/*.feature` already points there)
- [X] T002 [P] Create cucumber World in `tests/support/world.ts`: class `InventoryWorld` with fields `service: InventoryService | undefined`, `emitted: Event[]` (events returned by the last `handle` call) and `all: Event[]` (every event emitted so far); register it with `setWorldConstructor`
- [X] T003 [P] Create event builders in `tests/support/events.ts`: helpers `orderPlaced(id, orderId, sku, qty)`, `paymentFailed(id, orderId)`, `orderCancelled(id, orderId)`, `paymentSucceeded(id, orderId)`, `paymentRefunded(id, orderId)`, `stockReserved(id, orderId)`, `stockRejected(id, orderId)`, `stockReleased(id, orderId)` returning typed `Event` values (tests must build colleague events themselves)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Skeleton of the service and the shared step vocabulary all stories use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Replace the `throw` stub in `src/inventory.ts` with a `createInventoryService(stock)` that copies `stock` into `available: Map<string, number>`, holds `orders: Map<string, OrderRecord>` with `status: 'RESERVED' | 'REJECTED' | 'RELEASED' | 'TERMINATED'`, `sku: string`, `qty: number`, holds `seen: Set<string>` of processed event ids, implements `getAvailable(sku)` returning `available.get(sku) ?? 0`, and a `handle(event)` that returns `[]` when `seen` already has `event.id`, otherwise records the id and dispatches on `event.type` (dispatch bodies filled per story below)
- [X] T005 Create shared step definitions in `tests/steps/inventory.steps.ts`: `Given the inventory service starts with:` (data table `sku | qty` → `createInventoryService`), `When the service handles an "OrderPlaced" event {string} for order {string} with sku {string} and qty {int}`, `When the service handles a {string} event {string} for order {string}` (any other type via `tests/support/events.ts`), `Then the service emits exactly one {string} for order {string}`, `Then the service emits nothing`, `Then available stock for {string} is {int}`
- [X] T006 Create `tests/features/inventory.feature` with `Feature: Inventory service reserves and releases stock` header and a `Background` placeholder-free structure (scenarios added per story)

**Checkpoint**: `npm test` runs, finds the feature file and step definitions, and reports 0 undefined steps.

---

## Phase 3: User Story 1 - Reserve stock when an order is placed (Priority: P1) 🎯 MVP

**Goal**: `OrderPlaced` reserves when `1 ≤ qty ≤ available(sku)` and emits `StockReserved`; otherwise emits `StockRejected` with stock untouched.

**Independent Test**: start with a stock table, feed one or two `OrderPlaced` events, assert emitted event and `getAvailable`.

### Tests for User Story 1

- [X] T007 [US1] Add `@us1` scenarios to `tests/features/inventory.feature`: reserve 3 of 10 → `StockReserved`, 7 left; reject 3 of 2 → `StockRejected`, 2 left; reserve exact 3 of 3 → 0 left; unknown SKU "Z" → `StockRejected`, available 0; two orders of 3 against 5 → first reserved (2 left), second rejected (2 left); qty 0 → `StockRejected`, stock unchanged; qty -1 → `StockRejected`, stock unchanged

### Implementation for User Story 1

- [X] T008 [US1] Implement the `OrderPlaced` branch in `src/inventory.ts`: if `orders` already has `orderId` return `[]`; else if `Number.isInteger(qty) && qty >= 1 && qty <= getAvailable(sku)` subtract, record `RESERVED` with `sku`/`qty`, return `[{ id: 'inventory:StockReserved:' + orderId, type: 'StockReserved', orderId }]`; else record `REJECTED` and return `[{ id: 'inventory:StockRejected:' + orderId, type: 'StockRejected', orderId }]`

**Checkpoint**: `npm test -- --tags @us1` green.

---

## Phase 4: User Story 2 - Return reserved stock on payment failure or cancellation (Priority: P1)

**Goal**: `PaymentFailed` / `OrderCancelled` return exactly the reserved qty once and emit one `StockReleased`; no-op for orders without a live reservation.

**Independent Test**: reserve via `OrderPlaced`, then feed the release event(s), assert `getAvailable` restored and exactly one `StockReleased`.

### Tests for User Story 2

- [X] T009 [US2] Add `@us2` scenarios to `tests/features/inventory.feature`: PaymentFailed after reservation → one `StockReleased`, 10 available; OrderCancelled after reservation → one `StockReleased`, 10 available; OrderCancelled for a rejected order → nothing emitted, stock unchanged; PaymentFailed then OrderCancelled → second emits nothing, stock still 10; PaymentSucceeded then OrderCancelled → one `StockReleased`, 10 available

### Implementation for User Story 2

- [X] T010 [US2] Implement the `PaymentFailed` and `OrderCancelled` branch in `src/inventory.ts`: look up `orders.get(orderId)`; if status is `RESERVED` add `qty` back to `available[sku]`, set status `RELEASED`, return `[{ id: 'inventory:StockReleased:' + orderId, type: 'StockReleased', orderId }]`; if the record is `REJECTED` / `RELEASED` / `TERMINATED` return `[]` (the unknown-order case is completed in US3)

**Checkpoint**: `npm test -- --tags "@us1 or @us2"` green.

---

## Phase 5: User Story 3 - Stay correct under duplicate and out-of-order delivery (Priority: P1)

**Goal**: same event id → ignored; second `OrderPlaced` for a known order → ignored; release before placement → order remembered as `TERMINATED` and the late `OrderPlaced` reserves nothing.

**Independent Test**: replay the same event object twice and feed reversed sequences; assert stock and emissions equal the in-order outcome.

### Tests for User Story 3

- [X] T011 [US3] Add `@us3` scenarios to `tests/features/inventory.feature`: same `OrderPlaced` id twice → one `StockReserved`, second emits nothing, 7 left; same `PaymentFailed` id twice → one `StockReleased`, 10 left; `OrderCancelled` then `OrderPlaced` for O1 → nothing emitted, 10 left; `PaymentFailed` then `OrderPlaced` for O1 → nothing emitted, 10 left; `OrderPlaced` O1 (id e1) then `OrderPlaced` O1 (id e2) → second emits nothing, 7 left

### Implementation for User Story 3

- [X] T012 [US3] Complete the release branch in `src/inventory.ts`: when `PaymentFailed` / `OrderCancelled` arrives for an unknown `orderId`, insert `{ status: 'TERMINATED', sku: '', qty: 0 }` and return `[]`; confirm the `OrderPlaced` branch's early return covers `TERMINATED` records and that the `seen` check in `handle` precedes all dispatch

**Checkpoint**: `npm test -- --tags "@us1 or @us2 or @us3"` green.

---

## Phase 6: User Story 4 - Ignore events that are not the inventory service's concern (Priority: P2)

**Goal**: `PaymentSucceeded`, `PaymentRefunded`, `StockReserved`, `StockRejected`, `StockReleased` → `[]`, stock unchanged.

**Independent Test**: feed each type and assert nothing emitted and `getAvailable` unchanged.

### Tests for User Story 4

- [X] T013 [US4] Add a `@us4` Scenario Outline to `tests/features/inventory.feature` iterating over the five ignored event types: after reserving 3 of 10, handling `<type>` for O1 emits nothing and "A" still has 7

### Implementation for User Story 4

- [X] T014 [US4] Add the `default` branch of the dispatch in `src/inventory.ts` returning `[]` for all other event types (no state change beyond recording the event id)

**Checkpoint**: all four stories green.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract and id guarantees, type safety, final validation.

- [X] T015 [P] Add `@ids` scenario to `tests/features/inventory.feature`: reserve then release O1 and reserve then reject O2; assert all emitted ids are distinct and equal `inventory:<type>:<orderId>` (step `Then every emitted event id is unique and follows the inventory id scheme` in `tests/steps/inventory.steps.ts`)
- [X] T016 Run `npm run typecheck` and fix any strict-mode type errors in `src/inventory.ts`, `tests/steps/inventory.steps.ts`, `tests/support/*.ts`
- [X] T017 Run `npm test` (full suite) and the quickstart smoke command from `specs/001-inventory-service/quickstart.md`; confirm every scenario passes and no file outside `src/inventory.ts` and `tests/` was modified (`git status`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Phase 1; blocks all stories
- **User Stories (Phases 3–6)**: depend on Phase 2; US2 and US3 scenarios reuse the reservation from US1 so run in order US1 → US2 → US3 → US4
- **Polish (Phase 7)**: after all stories

### User Story Dependencies

- **US1**: none beyond Phase 2
- **US2**: builds on the `RESERVED` record from US1 (needs T008)
- **US3**: builds on T008 and T010
- **US4**: independent of US1–US3 (only the default branch)

### Within Each User Story

- Feature scenarios (T007/T009/T011/T013) are written first and must fail (undefined or failing) before the matching implementation task.
- All implementation tasks touch the same file `src/inventory.ts`, so they are sequential, not [P].

### Parallel Opportunities

- T002 and T003 (different support files).
- T015 can be written alongside T014.

---

## Parallel Example: Phase 1

```bash
Task: "Create cucumber World in tests/support/world.ts"
Task: "Create event builders in tests/support/events.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1–2 (layout, skeleton, shared steps)
2. Phase 3 (US1) → `npm test -- --tags @us1` green → MVP: orders can be reserved or rejected

### Incremental Delivery

1. US2 adds release → stock no longer leaks on failure/cancel
2. US3 adds idempotency and out-of-order safety
3. US4 adds the ignore branch; Phase 7 validates ids, types and the full suite

---

## Notes

- Only `src/inventory.ts` and files under `tests/` may be created or modified (constitution Principle I).
- Emitted event id scheme is fixed by research R2: `inventory:<EventType>:<orderId>`.
- Verify scenarios fail before implementing each story; commit at the end of the feature.
