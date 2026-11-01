---

description: "Task list for 訂單服務（事件驅動下單流程）"
---

# Tasks: 訂單服務（事件驅動下單流程）

**Input**: Design documents from `/specs/001-order-service/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/order-service.md, quickstart.md

**Tests**: 憲章原則 I（Test-First，NON-NEGOTIABLE）要求：先寫 Gherkin 情境與步驟（紅燈）再實作。因此每個 user story 都含測試任務。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Single project：產品碼 `src/order.ts`（唯一可改的產品檔）；測試 `tests/features/`、`tests/steps/`、`tests/support/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立測試骨架，讓 `npm test` 能找到 feature 與步驟

- [X] T001 Create `tests/features/order-service.feature` with `Feature: 訂單服務` header and one `Rule:` per user story (empty scenarios filled in later phases)
- [X] T002 [P] Create custom World in `tests/support/world.ts`: holds `service: OrderService`, `lastResult: CommandResult | undefined`, `lastEvents: Event[]`, `knownEvents: Map<string, Event>`, test event counter; register with `setWorldConstructor`
- [X] T003 [P] Create `tests/steps/order.steps.ts` with imports (`@cucumber/cucumber`, `node:assert/strict`, `../../src/order.js`, `../../src/events.js`), a `Before` hook that creates a fresh service, and a `makeEvent(type, orderId, extra)` helper producing ids `test-N`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `src/order.ts` 的骨架與所有 story 共用的內部狀態

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 In `src/order.ts` define internal `Order` record type per data-model.md (`orderId`, `customerId`, `sku`, `qty`, `amount`, `placedAt`, `status: OrderStatus`, `cancelReason?: 'CUSTOMER' | 'TIMEOUT'`), `TIMEOUT_MS = 15 * 60 * 1000`, and `createOrderService()` returning an object with `orders: Map<string, Order>`, `processed: Set<string>`, `seq` counter and a `nextId()` helper returning `order-${++seq}`; all five interface methods present (bodies may be minimal) so the file type-checks against `OrderService`
- [X] T005 Run `npm run typecheck` and `npm test` to confirm the skeleton compiles and cucumber discovers `tests/features/order-service.feature` (0 scenarios acceptable at this point)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 顧客下單並依結果推進狀態 (Priority: P1) 🎯 MVP

**Goal**: `placeOrder` 驗證輸入、建立 PENDING 訂單並發 `OrderPlaced`；`handle` 依 `PaymentSucceeded`／`StockRejected`／`PaymentFailed` 推進為 CONFIRMED／REJECTED／FAILED；不關心的事件回 `[]`；`getOrder` 查詢。

**Independent Test**: 下單後檢查結果與事件；餵入自製事件檢查狀態；無需其他服務。

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [US1] Add scenarios US1-1..US1-8, US1-7a, US1-7b from spec.md under `Rule: 顧客下單並依結果推進狀態` in `tests/features/order-service.feature` (place order emits `OrderPlaced` with identical fields; PaymentSucceeded→CONFIRMED; StockRejected→REJECTED; PaymentFailed→FAILED; ignored event types return empty; duplicate orderId → `DUPLICATE_ORDER`; qty/amount 0, negative, decimal → `INVALID_INPUT`; empty orderId/customerId/sku → `INVALID_INPUT`; PaymentSucceeded with mismatched amount still confirms; unknown order query → undefined)
- [X] T007 [US1] Implement step definitions for those scenarios in `tests/steps/order.steps.ts` (Given no order / an order placed with table; When place order with table; When the service receives event `<type>` for `<orderId>`; Then result ok / fails with reason; Then emitted events count/type/fields; Then order status is; Then order does not exist)

### Implementation for User Story 1

- [X] T008 [US1] Implement `placeOrder` in `src/order.ts`: validate `orderId`/`customerId`/`sku` non-empty strings and `Number.isInteger(qty) && qty > 0`, same for `amount` → else `{ ok: false, reason: 'INVALID_INPUT' }`; existing orderId → `{ ok: false, reason: 'DUPLICATE_ORDER' }`; otherwise store PENDING order and return `{ ok: true, events: [OrderPlaced{ id: nextId(), orderId, customerId, sku, qty, amount, at }] }`
- [X] T009 [US1] Implement `handle` in `src/order.ts`: if `processed.has(event.id)` return `[]`; add id; switch on type: `PaymentSucceeded`→CONFIRMED, `StockRejected`→REJECTED, `PaymentFailed`→FAILED only when order exists and `status === 'PENDING'`; all other types and all other states: no change; always return `[]`
- [X] T010 [US1] Implement `getOrder` in `src/order.ts`: return `undefined` if missing; `{ status }` otherwise, adding `cancelReason` only when status is CANCELLED
- [X] T011 [US1] Run `npm test`; all US1 scenarios green, `npm run typecheck` clean

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 4 - 事件重複與亂序送達 (Priority: P1)

**Goal**: 同一事件 id 重複送達冪等；終態（CANCELLED／REJECTED／FAILED）後任何事件不改狀態；CONFIRMED 不被事件改變；不存在訂單的事件忽略。

**Independent Test**: 重複餵同一事件物件、以不同順序餵事件，檢查狀態只變一次且回 `[]`。

### Tests for User Story 4 ⚠️

- [X] T012 [US4] Add scenarios US4-1, US4-2, US4-2a, US4-2b, US4-3, US4-4, US4-5 under `Rule: 事件重複與亂序送達` in `tests/features/order-service.feature` (same PaymentSucceeded twice; StockRejected/PaymentFailed after CONFIRMED; PaymentSucceeded after TIMEOUT-cancel keeps CANCELLED/TIMEOUT; PaymentSucceeded after REJECTED/FAILED; PaymentSucceeded then StockReserved; events for unknown order; PaymentFailed/StockRejected after customer cancel keeps CANCELLED/CUSTOMER)
- [X] T013 [US4] Add step definitions in `tests/steps/order.steps.ts`: "the service receives the same event again", "time advances to <iso>" (needed by US4-2a; shares implementation with US3), "order cancel reason is <reason>", "the returned event list is empty"

### Implementation for User Story 4

- [X] T014 [US4] Verify `handle` in `src/order.ts` satisfies dedupe-by-id plus state guard (`PENDING` only) — adjust if any US4 scenario fails; no event emitted from `handle` in any case
- [X] T015 [US4] Run `npm test`; US1 + US4 green

**Checkpoint**: User Stories 1 and 4 both work independently

---

## Phase 5: User Story 2 - 顧客取消訂單 (Priority: P2)

**Goal**: `cancelOrder` 對 PENDING／CONFIRMED 成功（CANCELLED／CUSTOMER，發 `OrderCancelled`）；REJECTED／FAILED／CANCELLED → `NOT_CANCELLABLE`；不存在 → `ORDER_NOT_FOUND`。

**Independent Test**: 下單（可先餵 PaymentSucceeded）後取消，檢查狀態、原因、事件。

### Tests for User Story 2 ⚠️

- [X] T016 [US2] Add scenarios US2-1..US2-4 under `Rule: 顧客取消訂單` in `tests/features/order-service.feature` (cancel PENDING; cancel CONFIRMED; cancel CANCELLED/REJECTED/FAILED → `NOT_CANCELLABLE` with status and reason unchanged; cancel unknown → `ORDER_NOT_FOUND`)
- [X] T017 [US2] Add step definitions in `tests/steps/order.steps.ts`: "the customer cancels order <id> at <iso>", reuse result/event/status assertions

### Implementation for User Story 2

- [X] T018 [US2] Implement `cancelOrder` in `src/order.ts`: missing → `{ ok: false, reason: 'ORDER_NOT_FOUND' }`; status in REJECTED/FAILED/CANCELLED → `{ ok: false, reason: 'NOT_CANCELLABLE' }`; PENDING/CONFIRMED → set CANCELLED + `cancelReason: 'CUSTOMER'`, return `{ ok: true, events: [OrderCancelled{ id: nextId(), orderId }] }`; `at` is not used for timeout
- [X] T019 [US2] Run `npm test`; US1 + US4 + US2 green

**Checkpoint**: User Stories 1, 4, 2 independently functional

---

## Phase 6: User Story 3 - 15 分鐘未完成付款自動取消 (Priority: P2)

**Goal**: `tick(now)` 把 PENDING 且 now − placedAt ≥ 15 分鐘的訂單改為 CANCELLED／TIMEOUT，每張發一個 `OrderCancelled`；其他狀態不變；時間倒退無效果；不重複發。

**Independent Test**: 下單後以不同 `now` 呼叫 `tick`，檢查 14:59 不取消、15:00 與 15:01 取消、已到其他狀態不受影響、多張同時逾時、重複 tick 不重發。

### Tests for User Story 3 ⚠️

- [X] T020 [US3] Add scenarios US3-1..US3-7 under `Rule: 15 分鐘未完成付款自動取消` in `tests/features/order-service.feature` (T0+14:59 no change; T0+15:01 cancelled TIMEOUT with one `OrderCancelled`; exactly T0+15:00 cancelled; CONFIRMED/REJECTED/FAILED/CANCELLED unaffected; two orders both time out → two events; second tick emits nothing; tick backwards after a timeout changes nothing)
- [X] T021 [US3] Add step definitions in `tests/steps/order.steps.ts`: "time advances to <iso>" (if not already added in T013), "the tick emitted <n> OrderCancelled events for orders <list>"

### Implementation for User Story 3

- [X] T022 [US3] Implement `tick` in `src/order.ts`: `nowMs = Date.parse(now)`; iterate `orders` in insertion order; for each `status === 'PENDING'` with `nowMs - Date.parse(placedAt) >= TIMEOUT_MS` set CANCELLED + `cancelReason: 'TIMEOUT'` and push `OrderCancelled{ id: nextId(), orderId }`; return the array
- [X] T023 [US3] Run `npm test`; all four stories green

**Checkpoint**: All user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 收尾與品質閘門

- [X] T024 [P] Add scenario for event id uniqueness/prefix in `tests/features/order-service.feature` (two placed orders and a cancel yield three distinct ids all starting with `order-`) and its step in `tests/steps/order.steps.ts`
- [X] T025 Review `src/order.ts` against `specs/001-order-service/contracts/order-service.md` line by line; ensure `getOrder` returns a fresh object and no import of `inventory.ts`/`payment.ts`
- [X] T026 Run `npm run typecheck` and `npm test`; confirm 0 failed/undefined/pending; run `git status` to confirm only `src/order.ts`, `tests/**`, `specs/**`, `.specify/**`, `BENCH-LOG.md` changed (quickstart.md validation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion; executed in order US1 → US4 → US2 → US3 (P1 first)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on other stories
- **US4 (P1)**: After Foundational; scenarios reuse `placeOrder`/`handle` from US1 and `cancelOrder`/`tick` from US2/US3 for setup of terminal states — US4-2a and US4-5 are therefore run last in the suite but the dedupe/state-guard logic lives in `handle` (US1)
- **US2 (P2)**: After Foundational; independent of US3
- **US3 (P2)**: After Foundational; independent of US2

### Within Each User Story

- Feature scenarios and step definitions MUST be written and FAIL (undefined/failed) before implementation
- Implementation in `src/order.ts` only
- Story complete (green) before moving to next priority

### Parallel Opportunities

- T002 and T003 (different files) can run in parallel
- Within a story, feature-file task and step-definition task touch different files and can be drafted together, but all stories share the same two test files and the single `src/order.ts`, so stories themselves run sequentially

---

## Parallel Example: Phase 1

```bash
Task: "Create custom World in tests/support/world.ts"
Task: "Create tests/steps/order.steps.ts with hooks and makeEvent helper"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` shows US1 scenarios green
5. Continue with US4 (P1), then US2, US3

### Incremental Delivery

1. Setup + Foundational → skeleton compiles, cucumber runs
2. US1 → place/handle/getOrder green (MVP)
3. US4 → idempotency and state guards proven
4. US2 → cancel
5. US3 → timeout
6. Polish → id uniqueness, contract review, final gates

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify scenarios fail (undefined steps or assertion failures) before implementing each story
- Only `src/order.ts` and `tests/**` may change; never touch `src/events.ts`, `src/shop.ts`, `src/inventory.ts`, `src/payment.ts`
