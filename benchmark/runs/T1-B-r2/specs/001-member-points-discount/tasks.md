---

description: "Task list for 會員點數折抵"
---

# Tasks: 會員點數折抵

**Input**: Design documents from `/specs/001-member-points-discount/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 本功能的測試任務為必要（憲章原則 III Test-First 為 NON-NEGOTIABLE；SC-004 要求每條 FR 至少一個可自動執行的驗收情境）。每個 user story 的 feature 情境必須先寫、先看到紅燈，再實作轉綠。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root（依 plan.md）
- 產品碼：`src/points.ts`
- 驗收情境：`tests/features/points-discount.feature`
- Step definitions：`tests/steps/points-discount.steps.ts`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立測試目錄並確認既有設定不需更動

- [X] T001 建立 `tests/features/` 目錄；確認 `cucumber.cjs` 的 `paths` 已含 `tests/features/**/*.feature`、`import` 已含 `tests/steps/**/*.ts`（不修改 `cucumber.cjs`、`package.json`、`tsconfig.json`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 固定介面與共用 step 詞彙，所有 user story 的情境都依賴它們

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 在 `src/points.ts` 逐字匯出契約型別 `PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number }` 與 `PointsDiscountResult = { ok: true; finalAmount: number; remainingPoints: number } | { ok: false; reason: string }`，以及 `applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult` 的紅燈骨架（暫回傳 `{ ok: false, reason: "NOT_IMPLEMENTED" }`），不得更名（contracts/points-api.md）
- [X] T003 [P] 在 `tests/steps/points-discount.steps.ts` 建立共用 step definitions：`Given 訂單金額為 {int} 元`、`Given 會員點數餘額為 {int} 點`、`When 會員使用 {float} 點折抵`（以 `{float}` 承接 10.5、-10 等）、`When 會員使用 {int} 點折抵`、`Then 折抵成功，應付金額為 {int} 元，剩餘點數為 {int} 點`、`Then 折抵失敗，原因為 {word}`；以模組區域變數保存輸入與結果，自 `../../src/points.js` 匯入 `applyPointsDiscount`，以 `node:assert/strict` 的 `deepStrictEqual` 斷言整個結果物件

**Checkpoint**: `npm test` 可啟動且無 undefined step（此時尚無 feature 檔，0 scenarios）

---

## Phase 3: User Story 1 - 會員用點數折抵結帳金額 (Priority: P1) 🎯 MVP

**Goal**: 合法折抵請求回傳正確的應付金額（訂單金額 − 使用點數）與剩餘點數（原餘額 − 使用點數）

**Independent Test**: 給定 (1000, 500, 200) 得 `{ ok: true, finalAmount: 800, remainingPoints: 300 }`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T004 [US1] 在 `tests/features/points-discount.feature` 建立 `Feature: 會員點數折抵`，加入 US1 情境：(1000, 500, 200) → 成功 800 / 300；(1000, 300, 300) 剛好用完餘額 → 成功 700 / 0；(1000, 500, 300) 剛好等於 30% → 成功 700 / 200（FR-001、FR-006、FR-008）；執行 `npm test` 確認這些情境失敗（紅燈）

### Implementation for User Story 1

- [X] T005 [US1] 在 `src/points.ts` 實作成功路徑：`finalAmount = orderAmount - pointsToUse`、`remainingPoints = pointsBalance - pointsToUse`，回傳 `{ ok: true, ... }`；執行 `npm test` 確認 US1 情境轉綠

**Checkpoint**: US1 情境全綠；`npm run typecheck` 乾淨

---

## Phase 4: User Story 2 - 折抵金額受單筆訂單 30% 上限保護 (Priority: P2)

**Goal**: 折抵點數超過 `floor(orderAmount × 30%)` 時整筆拒絕並回傳 `EXCEEDS_LIMIT`；等於上限允許；非整數上限無條件捨去

**Independent Test**: (1000, 1000, 301) → `EXCEEDS_LIMIT`；(101, 100, 30) → 成功 71 / 70；(101, 100, 31) → `EXCEEDS_LIMIT`

### Tests for User Story 2 ⚠️

- [X] T006 [US2] 在 `tests/features/points-discount.feature` 加入 US2 情境：(1000, 1000, 301) → 失敗 `EXCEEDS_LIMIT`；(101, 100, 30) → 成功 71 / 70；(101, 100, 31) → 失敗 `EXCEEDS_LIMIT`（FR-005）；執行 `npm test` 確認新情境失敗

### Implementation for User Story 2

- [X] T007 [US2] 在 `src/points.ts` 加入上限檢查：`limit = Math.floor((orderAmount * 3) / 10)`，`pointsToUse > limit` 時回傳 `{ ok: false, reason: "EXCEEDS_LIMIT" }`（research R1；此檢查為驗證鏈最後一步）；執行 `npm test` 確認 US1 + US2 全綠

**Checkpoint**: US1、US2 情境全綠

---

## Phase 5: User Story 3 - 無效的折抵請求被拒絕並回傳原因 (Priority: P3)

**Goal**: 非法輸入依固定順序 `INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT` 回報第一個命中的固定代碼；0 點視為成功

**Independent Test**: (1000, 500, 600) → `INSUFFICIENT_POINTS`；(1000, 500, 10.5) → `INVALID_POINTS`；(1000, 500, -10) → `INVALID_POINTS`；(1000, 500, 0) → 成功 1000 / 500；(0, 500, 10)、(-100, 500, 10)、(1000, -5, 10) → `INVALID_INPUT`

### Tests for User Story 3 ⚠️

- [X] T008 [US3] 在 `tests/features/points-discount.feature` 加入 US3 情境（可用 Scenario Outline）：餘額不足 (1000, 500, 600) → `INSUFFICIENT_POINTS`（FR-004）；非整數 (1000, 500, 10.5) 與負數 (1000, 500, -10) → `INVALID_POINTS`（FR-002、FR-003）；0 點 (1000, 500, 0) → 成功 1000 / 500（FR-002）；訂單金額 0 與 -100、餘額 -5 → `INVALID_INPUT`（FR-010）；多重違規順序：(0, 500, -1) → `INVALID_INPUT`、(1000, 500, 600.5) → `INVALID_POINTS`、(1000, 500, 600) 同時超餘額與超 30% → `INSUFFICIENT_POINTS`（FR-007、FR-011）；執行 `npm test` 確認新情境失敗

### Implementation for User Story 3

- [X] T009 [US3] 在 `src/points.ts` 於上限檢查之前依序加入驗證鏈：`!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0` → `INVALID_INPUT`；`!Number.isInteger(pointsToUse) || pointsToUse < 0` → `INVALID_POINTS`；`pointsToUse > pointsBalance` → `INSUFFICIENT_POINTS`；最後才是 `EXCEEDS_LIMIT`（research R2、R3；data-model.md 驗證規則）；執行 `npm test` 確認全部情境綠燈

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收尾驗證與可追溯性

- [X] T010 執行 `npm test` 與 `npm run typecheck`，確認全綠、0 undefined/pending step、結束碼 0（憲章 IV、技術限制）
- [X] T011 [P] 依 `specs/001-member-points-discount/quickstart.md` 執行手動驗證指令，確認輸出 `{ ok: true, finalAmount: 800, remainingPoints: 300 }`
- [X] T012 [P] 檢查 `tests/features/points-discount.feature` 對 FR-001～FR-011 的覆蓋（每條至少一個情境，SC-004），缺者補情境；確認 `src/points.ts` 無 I/O、無 import `tests/`（憲章 V、FR-009）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion；因三個 story 共用同一個 `src/points.ts` 與同一個 feature 檔，建議依 P1 → P2 → P3 順序執行
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: 在 US1 之後實作（上限檢查加在成功路徑之前）；情境可獨立驗證
- **User Story 3 (P3)**: 在 US2 之後實作（驗證鏈插在上限檢查之前）；情境可獨立驗證

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002 與 T003 為不同檔案，可平行
- T011 與 T012 可平行
- 三個 user story 因共享檔案，不建議平行

---

## Parallel Example: Foundational

```bash
# Launch T002 and T003 together:
Task: "src/points.ts 匯出契約型別與紅燈骨架"
Task: "tests/steps/points-discount.steps.ts 建立共用 step definitions"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm test` US1 情境綠燈
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → MVP
3. Add User Story 2 → Test independently
4. Add User Story 3 → Test independently
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- 不得修改 `cucumber.cjs` 的 paths/import；不得新增依賴
- 失敗原因代碼必須逐字為 `INVALID_INPUT`、`INVALID_POINTS`、`INSUFFICIENT_POINTS`、`EXCEEDS_LIMIT`
