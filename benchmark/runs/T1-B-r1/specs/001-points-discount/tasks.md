---

description: "Task list for Member Points Discount at Checkout"
---

# Tasks: Member Points Discount at Checkout

**Input**: Design documents from `/specs/001-points-discount/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED — Constitution II (BDD with cucumber-js, NON-NEGOTIABLE) and spec SC-005
demand a cucumber scenario for every acceptance scenario, written before implementation (red →
green) and run by `npm test`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: product code in `src/`, tests in `tests/` at repository root (plan.md).
- Features: `tests/features/points-discount.feature`; steps: `tests/steps/points-discount.steps.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing repository already satisfies the plan; no new tooling.

- [X] T001 Verify `cucumber.cjs`, `tsconfig.json` and `package.json` already load `tests/features/**/*.feature` and `tests/steps/**/*.ts` via tsx and that `npm test` / `npm run typecheck` run (no changes expected; record findings in specs/001-points-discount/tasks.md notes)
- [X] T002 [P] Create directories `tests/features/` and `tests/steps/` (empty) so later tasks only add files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Public contract and the shared test harness that every story's scenarios use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `src/points.ts` exporting exactly `PointsDiscountInput`, `PointsDiscountResult` and `applyPointsDiscount` with the signature in specs/001-points-discount/contracts/points-api.md; body may be a stub returning `{ ok: false, reason: 'NOT_IMPLEMENTED' }` so the suite compiles and is red
- [X] T004 Create `tests/steps/points-discount.steps.ts` with a typed World (`orderAmount`, `pointsBalance`, `pointsToUse`, `result`) and generic steps: `Given an order of {int} dollars`, `Given a member with {int} points`, `Given an order amount of {float}` / `member balance of {float}` (for non-integer inputs), `When the member uses {float} points`, `Then the redemption succeeds with amount payable {int} and remaining points {int}`, `Then the redemption fails with reason {string}`, `Then the result carries no amount or points`; assertions via `node:assert/strict`
- [X] T005 Create `tests/features/points-discount.feature` with the `Feature:` header and a `Background`-free structure; scenarios are added per story in later phases

**Checkpoint**: `npm test` runs, loads the feature file and step definitions, and (after story scenarios are added) is red until implementation.

---

## Phase 3: User Story 1 - Redeem points for a cash discount (Priority: P1) 🎯 MVP

**Goal**: A valid redemption returns `finalAmount = orderAmount - pointsToUse` and `remainingPoints = pointsBalance - pointsToUse` (FR-001, FR-006, FR-010).

**Independent Test**: Submit (1000, 500, 200) → ok 800/300; (1000, 500, 300) → ok 700/200; (100, 30, 30) → ok 70/0.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [US1] Add `Scenario Outline: Successful redemption` to `tests/features/points-discount.feature` with examples (1000,500,200→800,300), (1000,500,300→700,200), (100,30,30→70,0) tagged `@US1`

### Implementation for User Story 1

- [X] T007 [US1] Implement the success path in `src/points.ts`: compute `finalAmount = orderAmount - pointsToUse`, `remainingPoints = pointsBalance - pointsToUse`, return `{ ok: true, finalAmount, remainingPoints }`
- [X] T008 [US1] Run `npm test` and confirm all `@US1` scenarios pass

**Checkpoint**: User Story 1 fully functional and green on its own.

---

## Phase 4: User Story 2 - Discount is capped at 30% of the order (Priority: P1)

**Goal**: Reject, as a whole, any request where `pointsToUse > floor(orderAmount * 3 / 10)` with reason `EXCEEDS_LIMIT`; exactly 30% is allowed; cap is rounded down (FR-003, FR-003a, FR-003b).

**Independent Test**: (1000,500,301) → `EXCEEDS_LIMIT`; (1001,500,300) → ok 701/200; (1001,500,301) → `EXCEEDS_LIMIT`; (1000,500,0) → ok 1000/500.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [US2] Add `Scenario Outline: Redemption over the 30% cap is refused` (examples (1000,500,301), (1001,500,301), (10,10,4)) and `Scenario Outline: Cap boundary and rounding` (examples (1001,500,300→701,200), (10,10,3→7,7)) and `Scenario: Zero points is a successful no-op` (1000,500,0→1000,500) to `tests/features/points-discount.feature`, tagged `@US2`
- [X] T010 [US2] Add a step to `tests/steps/points-discount.steps.ts` asserting the failure result has no `finalAmount`/`remainingPoints` keys (FR-007/FR-008) if not already covered by T004

### Implementation for User Story 2

- [X] T011 [US2] Implement the cap guard in `src/points.ts`: `const cap = Math.floor((orderAmount * 3) / 10); if (pointsToUse > cap) return { ok: false, reason: 'EXCEEDS_LIMIT' }` placed after the balance guard (FR-011 order)
- [X] T012 [US2] Run `npm test` and confirm all `@US1` and `@US2` scenarios pass

**Checkpoint**: Stories 1 and 2 both green.

---

## Phase 5: User Story 3 - Invalid redemption requests are refused with a clear reason (Priority: P2)

**Goal**: Fixed reason codes for invalid points, insufficient balance and invalid order/balance inputs, checked in the fixed order `INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT` (FR-002, FR-004, FR-005, FR-007, FR-008, FR-009, FR-011).

**Independent Test**: (1000,100,150) → `INSUFFICIENT_POINTS`; (1000,500,10.5) → `INVALID_POINTS`; (1000,500,-5) → `INVALID_POINTS`; (0,500,10) / (-100,500,10) / (1000,-1,10) / (1000.5,500,10) / (1000,10.5,10) → `INVALID_INPUT`; (100,10,50) → `INSUFFICIENT_POINTS`.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [US3] Add `Scenario Outline: Insufficient balance is refused as a whole` (examples (1000,100,150), (1000,0,1)) to `tests/features/points-discount.feature`, tagged `@US3`
- [X] T014 [US3] Add `Scenario Outline: Invalid points quantity is refused` (examples 10.5, -5, -0.5 with order 1000, balance 500) → `INVALID_POINTS`, tagged `@US3`
- [X] T015 [US3] Add `Scenario Outline: Invalid order amount or balance is refused` (examples order 0, -100, 1000.5 with balance 500; balance -1, 10.5 with order 1000; pointsToUse 10) → `INVALID_INPUT`, tagged `@US3`
- [X] T016 [US3] Add `Scenario Outline: First violated rule in fixed order is reported` with examples: (0,500,10.5)→`INVALID_INPUT`, (-5,-5,-5)→`INVALID_INPUT`, (1000,100,150.5)→`INVALID_POINTS`, (100,10,50)→`INSUFFICIENT_POINTS`, (100,100,50)→`EXCEEDS_LIMIT`, tagged `@US3`
- [X] T017 [US3] Add `Scenario: Failure result carries no amount or points` (1000,500,301) asserting absence of `finalAmount`/`remainingPoints`, tagged `@US3`

### Implementation for User Story 3

- [X] T018 [US3] Implement the `INVALID_INPUT` guard in `src/points.ts`: `!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0` → `{ ok: false, reason: 'INVALID_INPUT' }` as the first check
- [X] T019 [US3] Implement the `INVALID_POINTS` guard in `src/points.ts`: `!Number.isInteger(pointsToUse) || pointsToUse < 0` → `{ ok: false, reason: 'INVALID_POINTS' }` as the second check
- [X] T020 [US3] Implement the `INSUFFICIENT_POINTS` guard in `src/points.ts`: `pointsToUse > pointsBalance` → `{ ok: false, reason: 'INSUFFICIENT_POINTS' }` as the third check (before the cap guard from T011)
- [X] T021 [US3] Run `npm test` and confirm all scenarios pass

**Checkpoint**: All user stories independently functional and green.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup.

- [X] T022 [P] Add a short JSDoc comment on `applyPointsDiscount` in `src/points.ts` documenting the four reason codes and the check order (reference specs/001-points-discount/contracts/points-api.md)
- [X] T023 [P] Re-export `applyPointsDiscount` and its types from `src/index.ts` (keep the file otherwise unchanged)
- [X] T024 Run `npm run typecheck` and fix any strict-mode errors in `src/` or `tests/`
- [X] T025 Run quickstart validation from specs/001-points-discount/quickstart.md (`npm test` + manual spot check) and record the final scenario/step counts in specs/001-points-discount/tasks.md notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion; they share `src/points.ts` and the feature/steps files, so run sequentially P1 → P1 → P2 in a single-developer flow
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - adds a guard before US1's success path; testable independently via `@US2` tag
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - adds guards before US2's; testable independently via `@US3` tag

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Guard order in `src/points.ts` MUST end up as INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT → success
- Story complete (tagged scenarios green) before moving to next priority

### Parallel Opportunities

- T002 can run in parallel with T001
- T022 and T023 can run in parallel (different files)
- Within a story, scenario-writing tasks touch the same feature file, so they are sequential; the only cross-file parallelism is feature file vs. steps file (T009 ‖ T010)

---

## Parallel Example: User Story 2

```bash
# Different files, no dependency:
Task: "Add US2 scenarios to tests/features/points-discount.feature"   # T009
Task: "Add no-amount-on-failure step to tests/steps/points-discount.steps.ts"  # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (contract stub + harness)
3. Complete Phase 3: User Story 1 (success path)
4. **STOP and VALIDATE**: `npx cucumber-js --tags @US1`
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → suite loads
2. US1 → green (MVP)
3. US2 → cap guard, green
4. US3 → validation guards, green
5. Polish → typecheck, docs, quickstart

### Parallel Team Strategy

Single file module; parallelism is limited to feature vs. step files. One developer, sequential phases is the intended flow.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- `npm test` must be green and `npm run typecheck` clean at every checkpoint

## Execution Notes (2026-10-20)

- T001: `cucumber.cjs` globs and `tsconfig.json` include were correct, but on Node v24 `npm test`
  crashed with "tsx must be loaded with --import instead of --loader" because the cucumber
  `loader: ['tsx']` option goes through Node's deprecated `--loader` path. Fix applied: test
  script changed to `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`, the
  `loader` entry and the deprecated `publishQuiet` option were removed from `cucumber.cjs`.
  `.gitignore` extended with `dist/`, `*.log`, `.env*`.
- Red run (stub): 26 scenarios, 26 failed. US1 after T007: 3/3 green, US2/US3 red. US1+US2
  after T011: 10/10 green, US3 14/16 red. After T018–T020: all green.
- T025 final: `npm test` → 26 scenarios (26 passed), 105 steps (105 passed);
  `npm run typecheck` clean; quickstart spot check (1001, 500, 300) → `{ ok: true,
  finalAmount: 701, remainingPoints: 200 }`.
