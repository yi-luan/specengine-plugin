---

description: "Task list for 多租戶優惠券套用"
---

# Tasks: 多租戶優惠券套用

**Input**: Design documents from `/specs/001-multi-tenant-coupons/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 憲章原則 II（cucumber-js BDD，NON-NEGOTIABLE）要求每條 FR 至少一個 Gherkin 情境，故本清單包含測試任務，且測試先於實作（紅 → 綠）。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root（依 plan.md：`src/coupon.ts`、`tests/features/`、`tests/steps/`、`tests/support/`）

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立本功能需要的檔案骨架；專案已具備 package.json / cucumber.cjs / tsconfig.json，不需新增依賴。

- [X] T001 Create directories `tests/features/`, `tests/steps/`, `tests/support/` (keep existing `tests/steps`, `tests/support` if present) per plan.md structure
- [X] T002 [P] Create cucumber World in `tests/support/world.ts` exposing `tenantId`, `orderAmount`, `now`, `coupons: Coupon[]`, `result: ApplyResult | undefined`, registered via `setWorldConstructor`
- [X] T003 [P] Create `src/coupon.ts` exporting the verbatim types `Coupon`, `ApplyInput`, `ApplyResult` from contracts/coupon-api.md and a stub `applyCoupons` that throws `Error('not implemented')`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 共用的 step definitions 與驗證管線骨架，所有 user story 情境都依賴。

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create shared step definitions in `tests/steps/coupon.steps.ts`: `Given 租戶 "{string}" 的訂單金額為 {int} 元`、`Given 現在時間為 "{string}"`、`Given 有以下優惠券:`（DataTable 欄位 tenantId, code, type, value, validFrom, validTo, stackable, minOrderAmount；空白 minOrderAmount 表示未設定）、`When 執行結帳`、`Then 結帳成功，折扣後金額 {int} 元，折扣總額 {int} 元`、`Then 套用的優惠券代碼依序為 "{string}"`（逗號分隔，空字串表示空清單）、`Then 結帳失敗，原因為 "{string}"`
- [X] T005 Implement the ordered validation pipeline skeleton in `src/coupon.ts`: an array of check functions `(input) => string | null` executed in FR-015 order (`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`), returning `{ ok: false, reason }` on first hit; checks may be stubs returning null until their story phase
- [X] T006 Run `npm test` and `npm run typecheck` to confirm the skeleton compiles and cucumber discovers `tests/features/**/*.feature` (zero scenarios is acceptable at this point)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 單張優惠券結帳折扣 (Priority: P1) 🎯 MVP

**Goal**: 單張 PERCENT / FIXED 券與無券結帳正確計算 finalAmount、discount、applied。

**Independent Test**: 以 1000 元 + P10 / F150 / 無券三種輸入呼叫，驗證 900/100/[P10]、850/150/[F150]、1000/0/[]。

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [US1] Add scenarios to `tests/features/coupon.feature` under `Rule: 單張優惠券折扣`: PERCENT 10% on 1000 → 900/100/[P10]; FIXED 150 on 1000 → 850/150/[F150]; no coupons → 1000/0/[]; PERCENT 15% on 333 → discount 49 (floor, FR-010); PERCENT 100% on 1000 → 0/1000 (FR-006 equal case)

### Implementation for User Story 1

- [X] T008 [US1] Implement discount computation in `src/coupon.ts`: `percentTotal = Σ Math.floor(orderAmount * value / 100)` over PERCENT coupons, `fixedTotal = Σ value` over FIXED coupons, `discount = percentTotal + fixedTotal`, `finalAmount = orderAmount - discount`, `applied = coupons.map(c => c.code)` in input order; return `{ ok: true, finalAmount, discount, applied }` (FR-002, FR-008, FR-010, FR-012)
- [X] T009 [US1] Implement `INVALID_INPUT` check in `src/coupon.ts`: `orderAmount` must be an integer > 0 (`Number.isInteger(orderAmount) && orderAmount > 0`), `now` must parse via `Date.parse` (not NaN); add scenarios for orderAmount 0, -1, 10.5 → `INVALID_INPUT` to `tests/features/coupon.feature` under `Rule: 輸入合法性` (FR-012)

**Checkpoint**: US1 scenarios green; `npm test` passes for all scenarios written so far

---

## Phase 4: User Story 2 - 無效優惠券被拒絕並說明原因 (Priority: P1)

**Goal**: 跨租戶、過期、未生效、未達最低消費的券整筆拒絕並回傳固定 reason。

**Independent Test**: 分別以 T2 的券、now > validTo、now < validFrom、minOrderAmount 500 配 499 元結帳，得到 TENANT_MISMATCH / COUPON_EXPIRED / COUPON_EXPIRED / MIN_ORDER_NOT_MET；500 元則成功。

### Tests for User Story 2

- [X] T010 [US2] Add scenarios to `tests/features/coupon.feature` under `Rule: 租戶隔離`: T1 order with T2 coupon → `TENANT_MISMATCH`; under `Rule: 有效期間`: now after validTo → `COUPON_EXPIRED`; now before validFrom → `COUPON_EXPIRED`; now == validFrom → success; now == validTo → success (FR-003 含頭含尾); under `Rule: 最低消費`: minOrderAmount 500 with 499 → `MIN_ORDER_NOT_MET`; 500 with 500 → success; coupon without minOrderAmount on 1 → success
- [X] T011 [US2] Add scenarios under `Rule: 優惠券資料合法性`: PERCENT value 101 → `INVALID_COUPON`; FIXED value -1 → `INVALID_COUPON`; value 10.5 → `INVALID_COUPON`; validFrom later than validTo → `INVALID_COUPON` (FR-016)

### Implementation for User Story 2

- [X] T012 [US2] Implement `INVALID_COUPON` check in `src/coupon.ts` per data-model.md: `type` must be `'PERCENT' | 'FIXED'`; `value` integer; PERCENT `value` in 0..100; FIXED `value` >= 0; `minOrderAmount` if defined must be integer >= 0; `validFrom`/`validTo` must parse; `Date.parse(validFrom) <= Date.parse(validTo)`
- [X] T013 [US2] Implement `TENANT_MISMATCH` check in `src/coupon.ts`: any `coupon.tenantId !== input.tenantId` (FR-001)
- [X] T014 [US2] Implement `COUPON_EXPIRED` check in `src/coupon.ts`: fail unless `Date.parse(validFrom) <= Date.parse(now) <= Date.parse(validTo)` for every coupon (FR-003)
- [X] T015 [US2] Implement `MIN_ORDER_NOT_MET` check in `src/coupon.ts`: any coupon with `minOrderAmount !== undefined && orderAmount < minOrderAmount` (FR-007, compared against original orderAmount)

**Checkpoint**: US1 + US2 scenarios green

---

## Phase 5: User Story 3 - 多張優惠券疊加 (Priority: P2)

**Goal**: 多張可疊加券合計折扣；不可疊加券只能單獨使用；重複券拒絕。

**Independent Test**: P10+F50 → 150/850/[P10,F50]；P10+P20 → 300/700；兩張不可疊加 → NOT_STACKABLE；不可疊加+可疊加 → NOT_STACKABLE；單張不可疊加 → 成功；同券兩次 → DUPLICATE_COUPON。

### Tests for User Story 3

- [X] T016 [US3] Add scenarios to `tests/features/coupon.feature` under `Rule: 疊加`: two stackable PERCENT 10 + FIXED 50 on 1000 → 850/150/[P10,F50]; two stackable PERCENT 10 + PERCENT 20 on 1000 → 700/300 (each on original amount, FR-010); two non-stackable → `NOT_STACKABLE`; one non-stackable + one stackable → `NOT_STACKABLE`; single non-stackable → success (FR-004, FR-005); applied order follows input order (F50 then P10 → [F50,P10])
- [X] T017 [US3] Add scenarios under `Rule: 重複優惠券`: same tenant+code twice → `DUPLICATE_COUPON` (FR-011)

### Implementation for User Story 3

- [X] T018 [US3] Implement `DUPLICATE_COUPON` check in `src/coupon.ts` using a Set keyed by `tenantId + '\u0000' + code` (research.md D4)
- [X] T019 [US3] Implement `NOT_STACKABLE` check in `src/coupon.ts`: `coupons.length > 1 && coupons.some(c => !c.stackable)` (FR-004)

**Checkpoint**: US1 + US2 + US3 scenarios green

---

## Phase 6: User Story 4 - 折扣不得使金額低於零 (Priority: P2)

**Goal**: 折扣總額超過訂單金額時拒絕；剛好等於時成功且 finalAmount 0。

**Independent Test**: 100 元 + FIXED 150 → DISCOUNT_EXCEEDS_AMOUNT；100 元 + FIXED 100 → 0/100；100 元 + PERCENT 60 + PERCENT 50 → DISCOUNT_EXCEEDS_AMOUNT。

### Tests for User Story 4

- [X] T020 [US4] Add scenarios to `tests/features/coupon.feature` under `Rule: 折扣不得超過訂單金額`: FIXED 150 on 100 → `DISCOUNT_EXCEEDS_AMOUNT`; FIXED 100 on 100 → 0/100/[F100]; stackable PERCENT 60 + PERCENT 50 on 100 → `DISCOUNT_EXCEEDS_AMOUNT`; stackable FIXED 60 + FIXED 40 on 100 → 0/100 (FR-006)

### Implementation for User Story 4

- [X] T021 [US4] Implement `DISCOUNT_EXCEEDS_AMOUNT` check in `src/coupon.ts` after discount computation: `discount > orderAmount` → fail; `discount === orderAmount` → success with `finalAmount 0` (FR-006)

**Checkpoint**: All user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 錯誤優先序、純函式性與最終驗證。

- [X] T022 Add scenarios to `tests/features/coupon.feature` under `Rule: 錯誤優先序` (FR-015): invalid orderAmount + cross-tenant coupon → `INVALID_INPUT`; invalid coupon value + cross-tenant → `INVALID_COUPON`; cross-tenant + expired → `TENANT_MISMATCH`; duplicate + expired → `DUPLICATE_COUPON`; expired + min-order unmet → `COUPON_EXPIRED`; min-order unmet + two non-stackable → `MIN_ORDER_NOT_MET`; two non-stackable + exceeds → `NOT_STACKABLE`
- [X] T023 Add scenario under `Rule: 純函式` verifying the same input evaluated twice yields identical results and the input `coupons` array is not mutated (SC-004, FR-013); implement `Then 再次結帳結果相同且輸入未被修改` step in `tests/steps/coupon.steps.ts`
- [X] T024 Review `src/coupon.ts` for constitution compliance: no I/O, no `Date.now()`/`new Date()` without argument, no imports from `tests/`, all exported names verbatim per contracts/coupon-api.md; remove any leftover stub code
- [X] T025 Run quickstart.md validation: `npm test` all scenarios passed, `npm run typecheck` zero errors; confirm every FR-001..FR-016 maps to at least one scenario (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion; all modify the same two files (`src/coupon.ts`, `tests/features/coupon.feature`) so they are executed sequentially in priority order US1 → US2 → US3 → US4
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational; no dependency on other stories (computation + INVALID_INPUT)
- **US2 (P1)**: After Foundational; independent of US1 (each check is a separate pipeline stage), but scenarios for success cases reuse US1 computation
- **US3 (P2)**: After Foundational; stacking computation reuses US1's discount function
- **US4 (P2)**: After US1 (needs discount computation to exist)

### Within Each User Story

- Feature scenarios written first and confirmed failing before the check/computation is implemented
- Story complete (green) before moving to next priority

### Parallel Opportunities

- T002 and T003 (different files) can run in parallel
- Within a story, scenario-writing tasks touch `coupon.feature` and implementation tasks touch `src/coupon.ts`; they are sequential (red → green) by design
- No cross-story parallelism because all stories share the same two files

---

## Parallel Example: Setup

```bash
# Launch Setup file creation together:
Task: "Create cucumber World in tests/support/world.ts"
Task: "Create src/coupon.ts with verbatim types and stub applyCoupons"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` — US1 scenarios green
5. MVP = single-coupon checkout with integer floor rounding

### Incremental Delivery

1. Setup + Foundational → skeleton compiles, pipeline order fixed
2. US1 → single coupon math (MVP)
3. US2 → tenant / period / min-order / coupon validity rejections
4. US3 → stacking + duplicate
5. US4 → exceeds-amount guard
6. Polish → error precedence, purity, final validation

### Parallel Team Strategy

Single-file feature; one developer executes sequentially. Not applicable.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
