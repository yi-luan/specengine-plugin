---

description: "Task list for Event-Driven Order Flow"
---

# Tasks: Event-Driven Order Flow

**Input**: Design documents from `/specs/001-event-driven-order-flow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/shop-api.md, quickstart.md

**Tests**: REQUIRED by Constitution II (cucumber-js feature files, red before green). Each user
story phase starts with its feature file.

**Organization**: Tasks are grouped by user story so each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5)
- Include exact file paths in descriptions

## Path Conventions

Single project: `src/` and `tests/` at repository root (see plan.md Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the test harness and public module skeleton exist so every story can be
written against the fixed interface.

- [X] T001 Verify `.gitignore` contains `node_modules/` and `reports/` (already present; append only if missing) in `.gitignore`
- [X] T002 [P] Create `src/ids.ts` exporting `nextEventId(prefix: string): string` backed by one module-level counter producing `${prefix}-${n}` (research.md Decision 5)
- [X] T003 [P] Create `src/shop.ts` with the exact public types from `contracts/shop-api.md` (`Event`, `OrderStatus`, `PlaceOrderInput`, `CommandResult`, `OrderService`, `InventoryService`, `PaymentService`) and `createOrderService` / `createInventoryService(stock)` / `createPaymentService(balances)` that throw `new Error('not implemented')` so tests are red
- [X] T004 [P] Create `tests/support/world.ts`: cucumber Custom World (`setWorldConstructor`) holding `order`, `inventory`, `payment` services, `lastResult: CommandResult | undefined`, `lastEvents: Event[]`, `allEvents: Event[]`, a `Before` hook that resets per scenario, a `broadcast(events)` helper that delivers every event to all three `handle`s and keeps delivering emitted events until the queue drains (logging all to `allEvents`), and helpers to find events by type/orderId

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared step vocabulary that every feature file uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `tests/steps/shop.steps.ts` with the shared Given/When/Then steps: `Given stock {string} is {int}` (collects into a stock table before service creation), `Given customer {string} has balance {int}`, `Given the services are created` (or lazy creation on first use), `When {string} places order {string} for {int} of {string} at amount {int} at {string}`, `When all emitted events are broadcast until quiet`, `Then the command succeeds`, `Then the command fails with reason {string}`, `Then order {string} has status {string}`, `Then order {string} has status {string} with cancel reason {string}`, `Then order {string} is not found`, `Then available stock of {string} is {int}`, `Then balance of {string} is {int}`, `Then exactly {int} {string} event(s) were emitted for {string}`, `Then the last call emitted no events`, `Then the last call emitted exactly one {string} event for {string}`; all steps use only the public API from `src/shop.ts` via `tests/support/world.ts`

**Checkpoint**: `npm test` runs, every feature scenario is red (not undefined)

---

## Phase 3: User Story 1 - Successful Purchase (Priority: P1) 🎯 MVP

**Goal**: place → StockReserved → PaymentSucceeded → CONFIRMED with stock 10→8, balance 100→50.

**Independent Test**: `tests/features/successful-purchase.feature` passes alone.

### Tests for User Story 1

- [X] T006 [P] [US1] Write `tests/features/successful-purchase.feature` and `tests/features/order-validation.feature` (edge cases: DUPLICATE_ORDER, INVALID_INPUT for qty/amount not positive integer and empty orderId/customerId/sku, unknown order/SKU/customer lookups) covering US1 scenarios 1-5: OrderPlaced emitted with details (orderId/customerId/sku/qty/amount/at), inventory emits StockReserved and available becomes 8, payment emits PaymentSucceeded amount 50 and balance 50, order CONFIRMED, each service returns no events for event types it ignores (e.g. order ignores StockReserved; inventory ignores PaymentSucceeded; payment ignores StockRejected)

### Implementation for User Story 1

- [X] T007 [US1] Implement `src/order-service.ts` `createOrderService()`: `orders: Map<string, Order>` with fields `orderId, customerId, sku, qty, amount, placedAt, status, cancelReason?` (data-model.md Order); `placeOrder` creates PENDING and returns `{ ok: true, events: [OrderPlaced{ id: nextEventId('ord'), ...input }] }`; `handle` maps `PaymentSucceeded` → CONFIRMED only when status is PENDING and returns `[]`; `getOrder` returns `{ status }` plus `cancelReason` only when CANCELLED, `undefined` when unknown; `cancelOrder`/`tick` stubs returning `{ ok:false, reason:'ORDER_NOT_FOUND' }` / `[]` for now
- [X] T008 [P] [US1] Implement `src/inventory-service.ts` `createInventoryService(stock)`: `available: Map<string, number>` seeded from `stock`; `reservations: Map<string, Reservation>` with `state: 'reserved' | 'rejected' | 'released' | 'closed'`; on first `OrderPlaced` per orderId reserve when `available >= qty` (decrement, state reserved, emit `StockReserved{ id: nextEventId('inv') }`) else state rejected and emit `StockRejected`; `getAvailable(sku)` returns `available.get(sku) ?? 0`; all other events `[]`
- [X] T009 [P] [US1] Implement `src/payment-service.ts` `createPaymentService(balances)`: `balances: Map<string, number>`; `charges: Map<string, Charge>` with `customerId?, amount?, reserved, cancelled, outcome: 'none' | 'succeeded' | 'failed' | 'refunded'`; `OrderPlaced` records customerId/amount; `StockReserved` sets reserved; after each update run `settle(orderId)`: when outcome none, not cancelled, details known and reserved → if `balance >= amount` deduct, outcome succeeded, emit `PaymentSucceeded{ id: nextEventId('pay'), amount }` else outcome failed, emit `PaymentFailed`; `getBalance(customerId)` returns `balances.get(customerId) ?? 0`; all other events `[]`
- [X] T010 [US1] Wire `src/shop.ts` factories to the three implementations (re-export from the service files); run `npm test` and confirm `successful-purchase.feature` is green

**Checkpoint**: US1 green; typecheck passes

---

## Phase 4: User Story 2 - Insufficient Stock or Funds (Priority: P1)

**Goal**: REJECTED when stock is short (stock untouched); FAILED when balance is short (stock released via StockReleased, balance untouched).

**Independent Test**: `tests/features/insufficient-stock-or-funds.feature` passes alone.

### Tests for User Story 2

- [X] T011 [P] [US2] Write `tests/features/insufficient-stock-or-funds.feature` covering US2 scenarios 1-5: StockRejected with available unchanged (stock 1, qty 2); order REJECTED; PaymentFailed with balance unchanged (balance 10, amount 50); order FAILED; inventory emits StockReleased on PaymentFailed and available returns to 10; plus end-to-end broadcast versions for both failure paths (SC-001)

### Implementation for User Story 2

- [X] T012 [US2] Extend `src/order-service.ts` `handle`: `StockRejected` → REJECTED and `PaymentFailed` → FAILED, both only from PENDING; REJECTED/FAILED are terminal (any later event ignored) (FR-006)
- [X] T013 [P] [US2] Extend `src/inventory-service.ts` `handle`: on `PaymentFailed` with a `reserved` reservation → `available += qty`, state released, emit `StockReleased`; if no reservation record exists mark state `closed` and emit nothing; rejected/released/closed → `[]` (FR-007, FR-015)

**Checkpoint**: US1 + US2 green

---

## Phase 5: User Story 3 - Customer Cancellation with Compensation (Priority: P2)

**Goal**: cancelOrder on PENDING/CONFIRMED → CANCELLED/CUSTOMER + OrderCancelled; inventory releases (StockReleased); payment refunds (PaymentRefunded) only if charged; NOT_CANCELLABLE / ORDER_NOT_FOUND otherwise.

**Independent Test**: `tests/features/customer-cancellation.feature` passes alone.

### Tests for User Story 3

- [X] T014 [P] [US3] Write `tests/features/customer-cancellation.feature` covering US3 scenarios 1-7 and related edge cases: cancel PENDING (CUSTOMER, one OrderCancelled); inventory releases on OrderCancelled with StockReleased and available restored; payment refunds 50 with PaymentRefunded amount 50 and balance restored; payment emits nothing on OrderCancelled when nothing charged; cancel CONFIRMED end-to-end restores stock 10 and balance 100 (SC-003); cancel REJECTED / FAILED / CANCELLED → `NOT_CANCELLABLE` with no event and unchanged status; cancel unknown → `ORDER_NOT_FOUND`

### Implementation for User Story 3

- [X] T015 [US3] Implement `cancelOrder(orderId, at)` in `src/order-service.ts`: unknown → `{ ok:false, reason:'ORDER_NOT_FOUND' }`; status not PENDING/CONFIRMED → `{ ok:false, reason:'NOT_CANCELLABLE' }`; otherwise status CANCELLED, cancelReason CUSTOMER, return `{ ok:true, events:[OrderCancelled] }`; `handle` ignores `OrderCancelled` (FR-008)
- [X] T016 [P] [US3] Extend `src/inventory-service.ts` `handle` for `OrderCancelled`: identical to PaymentFailed path (release exactly reserved qty once, emit StockReleased; no record → mark closed, emit nothing); a later `OrderPlaced` for a closed order emits nothing and reserves nothing (FR-009, FR-014)
- [X] T017 [P] [US3] Extend `src/payment-service.ts` `handle` for `OrderCancelled`: set cancelled; in `settle`, when outcome succeeded and cancelled → `balance += amount`, outcome refunded, emit `PaymentRefunded{ amount }`; when cancelled and outcome none → never charge (FR-010, FR-014)

**Checkpoint**: US1-US3 green

---

## Phase 6: User Story 4 - Automatic Timeout Cancellation (Priority: P2)

**Goal**: `tick(now)` cancels PENDING orders with `now >= placedAt + 15 min` (TIMEOUT), once each; terminal/CONFIRMED orders untouched.

**Independent Test**: `tests/features/timeout-cancellation.feature` passes alone.

### Tests for User Story 4

- [X] T018 [P] [US4] Write `tests/features/timeout-cancellation.feature` covering US4 scenarios 1-5: tick at 12:15:00Z cancels an order placed 12:00:00Z (TIMEOUT, one OrderCancelled); tick at 12:14:59Z emits nothing and stays PENDING; CONFIRMED / REJECTED / FAILED / CANCELLED orders untouched by tick; second tick at 12:20:00Z emits nothing; two orders placed 12:00 and 12:10 with tick at 12:15 cancels only the first; end-to-end: timeout after charge → PaymentRefunded and StockReleased restore balance/stock (SC-003)

### Implementation for User Story 4

- [X] T019 [US4] Implement `tick(now)` in `src/order-service.ts`: iterate `orders` in insertion order; for each PENDING order with `Date.parse(now) >= Date.parse(placedAt) + 15*60*1000` set CANCELLED/TIMEOUT and push `OrderCancelled{ id: nextEventId('ord'), orderId }`; return the list (FR-011, research.md Decision 4)

**Checkpoint**: US1-US4 green

---

## Phase 7: User Story 5 - Reliable Delivery Semantics (Priority: P2)

**Goal**: duplicates (same or different id), reordering and late events never double-apply; cancellation is final; event ids unique.

**Independent Test**: `tests/features/reliable-delivery.feature` passes alone.

### Tests for User Story 5

- [X] T020 [P] [US5] Write `tests/features/reliable-delivery.feature` covering US5 scenarios 1-10 and SC-002/SC-004: same-id OrderPlaced twice to inventory → one reserve; StockReserved twice (same id and different id) to payment → one charge; PaymentSucceeded twice to order → no change; StockReserved before OrderPlaced at payment → one charge after both; OrderCancelled before OrderPlaced at inventory → no reserve; OrderCancelled before StockReserved at payment → no charge; late PaymentSucceeded after cancel → stays CANCELLED and payment refunds once; PaymentFailed then OrderCancelled at inventory → one StockReleased; terminal order ignores all events; all event ids across a run of ≥ 100 events are unique

### Implementation for User Story 5

- [X] T021 [US5] Review `src/order-service.ts`, `src/inventory-service.ts`, `src/payment-service.ts` against data-model.md transition tables; fix any path where a repeated or reordered event changes state or emits twice (FR-013, FR-014, FR-015)

**Checkpoint**: all five features green

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T022 Run `npm run typecheck` and fix any strict-mode errors in `src/` and `tests/`
- [X] T023 Run `npm test` and confirm 0 failed / 0 undefined / 0 pending; record the summary line in `BENCH-LOG.md`
- [X] T024 [P] Run quickstart.md validation (feature-to-story table matches the files that exist) and update `README.md` with one line on `src/shop.ts` and the feature files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T002/T003/T004 parallel after T001
- **Foundational (Phase 2)**: T005 depends on T003 + T004 — BLOCKS all user stories
- **User Stories (Phases 3-7)**: all depend on Phase 2; implemented in priority order because they share the three service files
- **Polish (Phase 8)**: after all stories

### User Story Dependencies

- **US1 (P1)**: first; creates the three service files
- **US2 (P1)**: extends order + inventory handlers
- **US3 (P2)**: extends all three; depends on US1 charge path for refunds
- **US4 (P2)**: depends on US3 (`OrderCancelled` compensation)
- **US5 (P2)**: review pass over all three services; depends on US1-US4

### Within Each User Story

- Feature file written and observed red before implementation tasks
- Service files edited sequentially (same file conflicts)

### Parallel Opportunities

- T002, T003, T004 (different files)
- Within US1: T008 and T009 (different files) after T007 starts
- Feature files of later stories (T011, T014, T018, T020) can be written while earlier stories are implemented

---

## Parallel Example: User Story 1

```bash
Task: "Implement src/inventory-service.ts"   # T008
Task: "Implement src/payment-service.ts"     # T009
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2
2. T006 red → T007-T010 green
3. Validate `successful-purchase.feature` alone

### Incremental Delivery

Add US2 → US3 → US4 → US5, each feature file red first, then green, then polish.

---

## Notes

- Every step definition uses only `src/shop.ts` exports (Constitution II, IV)
- No new dependencies; no timers; ids from `src/ids.ts` counter (Constitution V)
