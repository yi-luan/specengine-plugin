---

description: "Task list for Multi-Tenant Coupons"
---

# Tasks: Multi-Tenant Coupons

**Input**: Design documents from `/specs/001-multi-tenant-coupons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/applyCoupons.md, quickstart.md

**Tests**: REQUIRED by constitution Principle III (Behaviour-Driven Tests). Every user story has
Gherkin scenarios written before its implementation; `npm test` must run them and be green.

**Organization**: Tasks are grouped by user story. The feature is a single pure function, so
each story adds scenarios to `tests/features/coupon.feature` and extends the rule chain in
`src/coupon.ts`; stories are still independently testable by running their tagged scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US5)
- Include exact file paths in descriptions

## Path Conventions

Single project: `src/` and `tests/` at repository root (see plan.md Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the test harness files that cucumber.cjs already expects

- [X] T001 Create `tests/features/`, `tests/steps/`, `tests/support/` directories
- [X] T002 [P] Create typed cucumber World in `tests/support/world.ts` holding `tenantId`, `orderAmount`, `now`, `coupons: Coupon[]`, and `result: ApplyResult | undefined`, registered with `setWorldConstructor`
- [X] T003 [P] Create `tests/features/coupon.feature` with the `Feature: Multi-tenant coupon application` header and a `Background` setting tenant `A`, now `2026-06-15T12:00:00Z`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Public types and function skeleton every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `src/coupon.ts` exporting `Coupon`, `ApplyInput`, `ApplyResult` exactly as in `contracts/applyCoupons.md` (names and fields MUST NOT be renamed) plus a `Reason` string-literal union of the 8 codes, and an `applyCoupons` stub that returns `{ ok: false, reason: 'INVALID_INPUT' }`
- [X] T005 Re-export `src/coupon.ts` from `src/index.ts`
- [X] T006 Create `tests/steps/coupon.steps.ts` with shared step vocabulary: `Given the order is for tenant {string}`, `Given the order amount is {int}` (and a `{float}` variant), `Given the checkout time is {string}`, `Given a coupon {string} of tenant {string} type {word} value {int} valid from {string} to {string} stackable {word}` (+ optional `with minimum order {int}` variant and a non-integer value variant), `When the coupons are applied`, `Then the result is successful with final amount {int}, discount {int} and applied codes {string}`, `Then the result fails with reason {string}`; all `Then` steps use `node:assert/strict`
- [X] T007 Run `npm test` and `npm run typecheck`; confirm the harness loads (Background executes, no undefined steps for the vocabulary above)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Apply a single valid coupon at checkout (Priority: P1) 🎯 MVP

**Goal**: One qualifying PERCENT or FIXED coupon reduces the order; no coupons is a no-op success

**Independent Test**: `npx cucumber-js --tags @US1` (via `npm test -- --tags @US1`) all green

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [US1] Add `@US1` scenarios to `tests/features/coupon.feature`: PERCENT 10 on 1000 → 900/100/[P10]; FIXED 50 on 300 → 250/50/[F50]; no coupons on 300 → 300/0/[]; PERCENT 15 on 333 → 284/49 (floor, FR-014); PERCENT 100 on 500 → 0/500

### Implementation for User Story 1

- [X] T009 [US1] Implement the success path in `src/coupon.ts`: `discount = Σ Math.floor(orderAmount * value / 100)` for PERCENT + `Σ value` for FIXED; `finalAmount = orderAmount - discount`; `applied = coupons.map(c => c.code)` in input order (FR-003, FR-009, FR-013, FR-014)
- [X] T010 [US1] Run `npm test`; US1 scenarios green

**Checkpoint**: User Story 1 fully functional and testable independently

---

## Phase 4: User Story 2 - Reject coupons that do not qualify (Priority: P1)

**Goal**: Tenant mismatch, validity window (inclusive), and minimum spend (pre-discount, inclusive) are enforced with fixed reason codes

**Independent Test**: `npm test -- --tags @US2` all green

### Tests for User Story 2

- [X] T011 [US2] Add `@US2` scenarios to `tests/features/coupon.feature`: foreign tenant → `TENANT_MISMATCH`; now after validTo → `COUPON_EXPIRED`; now before validFrom → `COUPON_EXPIRED`; now == validFrom and now == validTo → success (inclusive); min 500 with order 499 → `MIN_ORDER_NOT_MET`; min 500 with order 500 → success; all-or-nothing: valid coupon + foreign coupon → `TENANT_MISMATCH` (FR-015)

### Implementation for User Story 2

- [X] T012 [US2] Add rule stages to `src/coupon.ts` in order: `TENANT_MISMATCH` (`coupon.tenantId !== input.tenantId`), `COUPON_EXPIRED` (`Date.parse(validFrom) <= Date.parse(now) <= Date.parse(validTo)` fails), `MIN_ORDER_NOT_MET` (`minOrderAmount !== undefined && orderAmount < minOrderAmount`); each stage scans coupons in input order and returns the first failure (FR-001, FR-004, FR-005)
- [X] T013 [US2] Run `npm test`; US1 + US2 scenarios green

**Checkpoint**: User Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Combine stackable coupons (Priority: P2)

**Goal**: Multiple stackable coupons sum their discounts; any non-stackable coupon must be alone; duplicate coupons are rejected

**Independent Test**: `npm test -- --tags @US3` all green

### Tests for User Story 3

- [X] T014 [US3] Add `@US3` scenarios to `tests/features/coupon.feature`: [S10, S5] on 1000 → 850/150/[S10,S5]; [SF30, S10] on 1000 → 870/130/[SF30,S10] (applied order = input order); two non-stackables → `NOT_STACKABLE`; non-stackable + stackable → `NOT_STACKABLE`; single non-stackable alone → success; same coupon twice → `DUPLICATE_COUPON`; different tenants same code is NOT a duplicate but IS `TENANT_MISMATCH`

### Implementation for User Story 3

- [X] T015 [US3] Add `DUPLICATE_COUPON` stage (Set keyed by `tenantId + '\u0000' + code`, positioned after `TENANT_MISMATCH` and before `COUPON_EXPIRED`) and `NOT_STACKABLE` stage (`coupons.length > 1 && coupons.some(c => !c.stackable)`, positioned after `MIN_ORDER_NOT_MET`) in `src/coupon.ts` (FR-006, FR-007, FR-012, FR-018)
- [X] T016 [US3] Run `npm test`; US1–US3 scenarios green

**Checkpoint**: Stacking semantics complete

---

## Phase 6: User Story 4 - Protect the order total from going negative (Priority: P2)

**Goal**: Total discount above the order amount is rejected; exactly equal yields final 0

**Independent Test**: `npm test -- --tags @US4` all green

### Tests for User Story 4

- [X] T017 [US4] Add `@US4` scenarios to `tests/features/coupon.feature`: FIXED 150 on 100 → `DISCOUNT_EXCEEDS_AMOUNT`; FIXED 100 on 100 → 0/100/[F100]; stackable FIXED 60 + FIXED 50 on 100 → `DISCOUNT_EXCEEDS_AMOUNT`; stackable PERCENT 50 + FIXED 50 on 100 → 0/100

### Implementation for User Story 4

- [X] T018 [US4] Add final `DISCOUNT_EXCEEDS_AMOUNT` stage (`discount > orderAmount`) in `src/coupon.ts` after `NOT_STACKABLE` (FR-008)
- [X] T019 [US4] Run `npm test`; US1–US4 scenarios green

**Checkpoint**: Money arithmetic guarded

---

## Phase 7: User Story 5 - Reject invalid inputs (Priority: P3)

**Goal**: Malformed order amounts and coupon values are rejected first, in the fixed precedence order

**Independent Test**: `npm test -- --tags @US5` all green

### Tests for User Story 5

- [X] T020 [US5] Add `@US5` scenarios to `tests/features/coupon.feature`: order 0 / -1 / 10.5 → `INVALID_INPUT`; PERCENT 0 / PERCENT 101 / FIXED 0 / FIXED 10.5 → `INVALID_COUPON`; precedence: order 0 + foreign coupon → `INVALID_INPUT`; PERCENT 101 of foreign tenant → `INVALID_COUPON`; expired coupon listed first + foreign coupon second → `TENANT_MISMATCH` (stage order beats input order, FR-018); expired + non-stackable pair → `COUPON_EXPIRED`

### Implementation for User Story 5

- [X] T021 [US5] Add `INVALID_INPUT` stage (`!Number.isInteger(orderAmount) || orderAmount <= 0`) and `INVALID_COUPON` stage (`!Number.isInteger(value)`, PERCENT `value < 1 || value > 100`, FIXED `value <= 0`; also `minOrderAmount` present but non-integer) at the very top of `applyCoupons` in `src/coupon.ts` (FR-016, FR-017)
- [X] T022 [US5] Run `npm test`; all scenarios green

**Checkpoint**: All user stories independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and traceability

- [X] T023 Verify every FR-001..FR-018 in `specs/001-multi-tenant-coupons/spec.md` is referenced by at least one scenario title or tag in `tests/features/coupon.feature`; add missing scenarios
- [X] T024 Run `npm run typecheck` with zero errors; remove any unused helpers from `src/coupon.ts` and `tests/steps/coupon.steps.ts`
- [X] T025 Run quickstart.md validation (`npm test` full suite + `npm run typecheck`) and record the summary counts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Phase 2. Because every story edits the same two files (`coupon.feature`, `coupon.ts`), execute sequentially in priority order; each story's scenarios remain independently runnable by tag
- **Polish (Phase 8)**: Depends on Phases 3–7

### User Story Dependencies

- **US1 (P1)**: After Phase 2; no story dependencies
- **US2 (P1)**: After Phase 2; independent of US1's scenarios (rule stages are additive)
- **US3 (P2)**: After Phase 2; stacking arithmetic reuses US1's discount computation
- **US4 (P2)**: After Phase 2; depends on the discount computation from US1
- **US5 (P3)**: After Phase 2; precedence scenarios reference reasons introduced in US2–US4

### Within Each User Story

- Scenarios written and observed failing before the implementation task
- Implementation task, then the story's `npm test` task

### Parallel Opportunities

- T002 and T003 (different files)
- Nothing else is parallel: single feature file and single source module

---

## Parallel Example: Phase 1

```bash
Task: "Create typed cucumber World in tests/support/world.ts"
Task: "Create tests/features/coupon.feature header and Background"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test -- --tags @US1`

### Incremental Delivery

1. Setup + Foundational → harness loads
2. US1 → success arithmetic (MVP)
3. US2 → qualification rules
4. US3 → stacking and duplicates
5. US4 → over-discount guard
6. US5 → input validation and precedence
7. Polish → traceability check, typecheck, quickstart run

---

## Notes

- [P] tasks = different files, no dependencies
- All reason strings MUST match the eight fixed codes in data-model.md exactly
- Verify tests fail before implementing each story
- Never rename the public types or `applyCoupons` (requirement + constitution Principle I)

## Phase 9: Convergence

- [X] T026 Add an `@US5` scenario to `tests/features/coupon.feature` asserting a coupon whose `minOrderAmount` is not an integer (e.g. 499.5) fails with `INVALID_COUPON`, with a matching step in `tests/steps/coupon.steps.ts` per T021 / FR-017 (partial)
