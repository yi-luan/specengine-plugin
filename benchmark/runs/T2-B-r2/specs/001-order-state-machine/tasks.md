---

description: "Task list for the Order State Machine feature"
---

# Tasks: Order State Machine

**Input**: Design documents from `/specs/001-order-state-machine/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/order-api.md, quickstart.md

**Tests**: Test tasks ARE included — the constitution (Principles II and III) mandates Gherkin
scenarios for every requirement and a red-before-green cycle verified by `npm test`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` and `tests/` at repository root (see plan.md "Source Code").
- Product module: `src/order.ts`. Gherkin: `tests/features/order-state-machine.feature`.
  Steps: `tests/steps/order.steps.ts`. World/hooks: `tests/support/world.ts`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing toolchain and create the directories the plan expects.

- [X] T001 Verify toolchain: run `npm test` and `npm run typecheck` in the repository root and confirm cucumber-js 11 + tsx + tsc run (0 scenarios is expected at this point); no changes to package.json or cucumber.cjs
- [X] T002 Create directories `tests/features/`, `tests/steps/`, `tests/support/` (keep `src/index.ts` untouched)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test harness and the fixed public types that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create custom cucumber World in `tests/support/world.ts`: class `OrderWorld` with fields `order: Order | null`, `snapshot: Order | null` (structuredClone of `order` taken before each `When`), `result: OrderResult | null`; register with `setWorldConstructor`; add a `Before` hook that resets all three fields
- [X] T004 Create `src/order.ts` with the fixed public contract verbatim from `specs/001-order-state-machine/contracts/order-api.md`: `export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED'`, `export type Order = { id: string; status: OrderStatus; amount: number; paidAmount: number; refundedAmount: number }`, `export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string }`, and stub exports `createOrder(id, amount)`, `pay(order, amount)`, `ship(order)`, `cancel(order)`, `refund(order, amount)` that each return `{ ok: false, reason: 'NOT_IMPLEMENTED' }` so the suite compiles and is red
- [X] T005 Create `tests/steps/order.steps.ts` with the shared step vocabulary (importing from `../../src/order.js` and `../support/world.js`): `Given an order {string} with amount {int} in status {word}` (reach CREATED/PAID/SHIPPED/CANCELLED/REFUNDED by driving the real `createOrder`/`pay`/`ship`/`cancel`/`refund`; for SHIPPED optionally `Given it already has {int} refunded`), `When I create an order {string} with amount {float}`, `When I pay {float}`, `When I ship the order`, `When I cancel the order`, `When I refund {float}`, `Then the operation succeeds`, `Then the operation fails with reason {string}`, `Then the order status is {word}`, `Then the order amount is {int}`, `Then the paid amount is {int}`, `Then the refunded amount is {int}`, `Then the input order is unchanged` (deep-equal to `snapshot`), `Then the returned order is a new object` (`result.order !== order`). Each `When` stores `snapshot = structuredClone(order)` before calling the function. Values may be `NaN`/`Infinity`/fractions, so `{float}` steps must accept the literal words `NaN` and `Infinity` (use a custom parameter type or `{word}` + `Number()` parsing)

**Checkpoint**: `npm test` discovers 0 scenarios (no feature yet) and `npm run typecheck` passes.

---

## Phase 3: User Story 1 - Create and pay for an order (Priority: P1) 🎯 MVP

**Goal**: `createOrder` and `pay` with all validation and fixed reason codes (FR-001…FR-004, FR-012, FR-013 for these two operations, FR-014, FR-015, FR-017).

**Independent Test**: Run `npm test`; every scenario tagged `@us1` in `tests/features/order-state-machine.feature` passes while `ship`/`cancel`/`refund` are still stubs.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, run `npm test`, and confirm they FAIL before implementation**

- [X] T006 [US1] Write `Feature: Order state machine` in `tests/features/order-state-machine.feature` with the `@us1` scenarios: (a) create "o-1" amount 100 → succeeds, status CREATED, amount 100, paid 0, refunded 0; (b) Scenario Outline create with amount `0`, `-1`, `10.5`, `NaN` → fails with reason "INVALID_AMOUNT"; (c) create with empty id "" and amount 100 → succeeds (FR-017); (d) pay 100 on CREATED 100 → succeeds, status PAID, paid amount 100, returned order is a new object, input unchanged; (e) Scenario Outline pay `99`, `101` → fails "AMOUNT_MISMATCH", input unchanged; (f) Scenario Outline pay `0`, `-5`, `50.5` → fails "INVALID_AMOUNT"; (g) Scenario Outline pay on status PAID, SHIPPED, CANCELLED, REFUNDED → fails "INVALID_TRANSITION"; (h) pay -5 on a CANCELLED order → fails "INVALID_TRANSITION" (state checked before amount, FR-013)
- [X] T007 [US1] Run `npm test` and record that the `@us1` scenarios fail (stubs return NOT_IMPLEMENTED); do not proceed while they pass

### Implementation for User Story 1

- [X] T008 [US1] Implement in `src/order.ts` the internal helpers: `const REASON = { INVALID_TRANSITION: 'INVALID_TRANSITION', INVALID_AMOUNT: 'INVALID_AMOUNT', AMOUNT_MISMATCH: 'AMOUNT_MISMATCH', REFUND_EXCEEDS_PAID: 'REFUND_EXCEEDS_PAID' } as const`, `isValidAmount(n: number): boolean` = `Number.isInteger(n) && n > 0`, `fail(reason)` and `succeed(order)` constructors
- [X] T009 [US1] Implement `createOrder(id, amount)` in `src/order.ts`: `!isValidAmount(amount)` → fail `INVALID_AMOUNT`; else succeed with `{ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 }` (id not validated)
- [X] T010 [US1] Implement `pay(order, amount)` in `src/order.ts` with check order state → validity → comparison: `order.status !== 'CREATED'` → `INVALID_TRANSITION`; `!isValidAmount(amount)` → `INVALID_AMOUNT`; `amount !== order.amount` → `AMOUNT_MISMATCH`; else succeed with `{ ...order, status: 'PAID', paidAmount: amount }` (never mutate `order`)
- [X] T011 [US1] Run `npm test` and `npm run typecheck`; all `@us1` scenarios green, no undefined/pending steps

**Checkpoint**: User Story 1 is fully functional and testable independently (create + pay).

---

## Phase 4: User Story 2 - Ship a paid order and cancel before shipping (Priority: P2)

**Goal**: `ship` and `cancel` with full-refund-on-cancel semantics (FR-005, FR-006, FR-007, FR-016 for ship/cancel).

**Independent Test**: `npm test`; every `@us2` scenario passes; US1 scenarios still pass.

### Tests for User Story 2 ⚠️

- [X] T012 [US2] Add `@us2` scenarios to `tests/features/order-state-machine.feature`: (a) ship on PAID 100 → succeeds, status SHIPPED, amount 100, paid 100, refunded 0, input unchanged, new object; (b) Scenario Outline ship on CREATED, SHIPPED, CANCELLED, REFUNDED → fails "INVALID_TRANSITION"; (c) cancel on CREATED 100 → succeeds, status CANCELLED, paid 0, refunded 0; (d) cancel on PAID 100 → succeeds, status CANCELLED, paid amount 100, refunded amount 100; (e) Scenario Outline cancel on SHIPPED, CANCELLED, REFUNDED → fails "INVALID_TRANSITION", input unchanged
- [X] T013 [US2] Run `npm test` and confirm the `@us2` scenarios fail before implementing

### Implementation for User Story 2

- [X] T014 [P] [US2] Implement `ship(order)` in `src/order.ts`: `order.status !== 'PAID'` → `INVALID_TRANSITION`; else succeed with `{ ...order, status: 'SHIPPED' }`
- [X] T015 [P] [US2] Implement `cancel(order)` in `src/order.ts`: status not in `['CREATED','PAID']` → `INVALID_TRANSITION`; else succeed with `{ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount }` (paidAmount unchanged; yields refunded 0 for CREATED, full amount for PAID)
- [X] T016 [US2] Run `npm test` and `npm run typecheck`; `@us1` + `@us2` green

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Refund a shipped order in one or more instalments (Priority: P3)

**Goal**: `refund` with cumulative limit, whole-rejection and REFUNDED transition (FR-008…FR-011, FR-012 refund part, FR-016 refund part).

**Independent Test**: `npm test`; every `@us3` scenario passes; earlier stories still pass.

### Tests for User Story 3 ⚠️

- [X] T017 [US3] Add `@us3` scenarios to `tests/features/order-state-machine.feature`: (a) refund 30 on SHIPPED paid 100 → succeeds, status SHIPPED, refunded 30, input unchanged, new object; (b) SHIPPED paid 100 with 30 already refunded, refund 70 → succeeds, status REFUNDED, refunded 100; (c) refund 100 in one go → REFUNDED; (d) SHIPPED with 30 refunded, refund 71 → fails "REFUND_EXCEEDS_PAID", input unchanged (refunded still 30, status SHIPPED); (e) refund 101 on fresh SHIPPED 100 → fails "REFUND_EXCEEDS_PAID"; (f) Scenario Outline refund `0`, `-10`, `2.5` → fails "INVALID_AMOUNT"; (g) Scenario Outline refund on CREATED, PAID, CANCELLED, REFUNDED → fails "INVALID_TRANSITION" (covers "PAID must cancel instead" and terminal REFUNDED); (h) refund -5 on a CANCELLED order → "INVALID_TRANSITION" (precedence); (i) three-step journey scenario: create 100 → pay 100 → ship → refund 40 → refund 60 → status REFUNDED with refunded 100 (end-to-end, requirement items 1–3, 6–8)
- [X] T018 [US3] Run `npm test` and confirm the `@us3` scenarios fail before implementing

### Implementation for User Story 3

- [X] T019 [US3] Implement `refund(order, amount)` in `src/order.ts`: `order.status !== 'SHIPPED'` → `INVALID_TRANSITION`; `!isValidAmount(amount)` → `INVALID_AMOUNT`; `order.refundedAmount + amount > order.paidAmount` → `REFUND_EXCEEDS_PAID`; else `const refundedAmount = order.refundedAmount + amount` and succeed with `{ ...order, refundedAmount, status: refundedAmount === order.paidAmount ? 'REFUNDED' : 'SHIPPED' }`
- [X] T020 [US3] Run `npm test` and `npm run typecheck`; all scenarios green

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Traceability, cleanliness and final validation.

- [X] T021 Verify requirement traceability: each FR-001…FR-017 in `specs/001-order-state-machine/spec.md` and each numbered requirement item 1–8 maps to at least one scenario in `tests/features/order-state-machine.feature`; add any missing scenario
- [X] T022 Remove the `NOT_IMPLEMENTED` stub reason and any dead code from `src/order.ts`; confirm the only `reason` strings in `src/order.ts` are the four fixed codes
- [X] T023 Run `specs/001-order-state-machine/quickstart.md` validation: `npm test` (0 failed/undefined/pending, < 10 s) and `npm run typecheck`; record the summary line

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion; US2 and US3 scenarios drive their preconditions through US1 functions (`createOrder`, `pay`), so run in priority order P1 → P2 → P3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Needs `createOrder` + `pay` (US1) only to set up PAID fixtures; its own functions (`ship`, `cancel`) are independent
- **User Story 3 (P3)**: Needs US1 + `ship` (US2) to reach SHIPPED fixtures; its own function (`refund`) is independent

### Within Each User Story

- Tests MUST be written and observed FAILING (`npm test`) before implementation
- Implement the function(s), then re-run `npm test` + `npm run typecheck`
- Story complete before moving to next priority

### Parallel Opportunities

- T014 and T015 (ship/cancel) touch different functions and can be written in parallel, though they share `src/order.ts`, so merge carefully
- All other tasks are sequential because the project has a single product file and a single feature file

---

## Parallel Example: User Story 2

```bash
# After T013 (red confirmed), implement in parallel:
Task: "Implement ship(order) in src/order.ts"
Task: "Implement cancel(order) in src/order.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (World, fixed types, stubs, step vocabulary)
3. Complete Phase 3: User Story 1 (create + pay)
4. **STOP and VALIDATE**: `npm test` shows `@us1` green
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → suite compiles, 0 scenarios
2. Add US1 → red → green (MVP)
3. Add US2 → red → green
4. Add US3 → red → green
5. Polish → traceability + quickstart validation

---

## Notes

- [P] tasks = different files/functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit at the end (bench instruction: single commit "T2-B-r2 done")
