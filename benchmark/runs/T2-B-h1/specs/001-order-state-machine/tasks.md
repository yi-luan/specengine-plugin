# Tasks: 訂單狀態機

**Input**: Design documents from `/specs/001-order-state-machine/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 需要。憲章 III（測試先行，NON-NEGOTIABLE）要求每個行為先寫 cucumber 測試並確認紅燈，再實作。

**Organization**: 依使用者故事分階段。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案，且無未完成的相依）
- **[Story]**: US1 / US2 / US3，對應 spec.md

## Phase 1: Setup（共用基礎）

**Purpose**: 確認工具鏈可用

- [X] T001 確認 `npm run typecheck` 與 `npm test` 可執行（cucumber.cjs 的 paths 指向 `tests/features/**/*.feature`，import 指向 `tests/steps/**/*.ts`）

---

## Phase 2: Foundational（阻擋所有故事的前置工作）

**Purpose**: 建立型別與介面骨架，讓測試可以編譯與執行

- [X] T002 在 `src/order.ts` 匯出 `OrderStatus`、`Order`、`OrderResult` 型別，並宣告 `createOrder`、`pay`、`ship`、`cancel`、`refund` 的簽章（本階段函式回傳 `{ ok: false, reason: 'not implemented' }`，依 contracts/order-api.md）
- [X] T003 [P] 在 `tests/steps/order-state-machine.steps.ts` 建立共用的步驟輔助（以 world 保存目前訂單與最近一次操作結果，並提供建立訂單、執行操作、斷言結果的 helper）

**Checkpoint**: 型別與骨架可編譯，`npm run typecheck` 通過

---

## Phase 3: User Story 1 - 建立與付款訂單 (Priority: P1) 🎯 MVP

**Goal**: 建立訂單（金額 > 0 的整數）與付款（金額必須等於訂單金額）

**Independent Test**: 建立金額 1000 的訂單，付款 1000，狀態為「已付款」；付款 999 或 1001 則失敗。

### Tests for User Story 1（先寫，必須紅燈）

- [X] T004 [US1] 在 `tests/features/order-state-machine.feature` 撰寫 User Story 1 的五個情境（spec.md User Story 1 的 Acceptance Scenarios 1–5），執行 `npm test` 確認紅燈
- [X] T005 [US1] 在 `tests/steps/order-state-machine.steps.ts` 實作 User Story 1 情境所需的步驟定義（依 T003 的 helper）

### Implementation for User Story 1

- [X] T006 [US1] 在 `src/order.ts` 實作 `createOrder`（金額須為整數且 > 0，狀態 CREATED，paidAmount 0，refundedAmount 0）
- [X] T007 [US1] 在 `src/order.ts` 實作 `pay`（僅限 CREATED；amount 必須等於 order.amount；成功後狀態 PAID，paidAmount = amount；不修改傳入的 order）

**Checkpoint**: User Story 1 的情境全綠

---

## Phase 4: User Story 2 - 出貨與取消訂單 (Priority: P2)

**Goal**: 已付款可出貨；已建立或已付款可取消，已付款取消時 refundedAmount = paidAmount（FR-010）

**Independent Test**: 「已付款 → 已出貨」與「已付款 → 已取消」兩條路徑結果正確。

### Tests for User Story 2（先寫，必須紅燈）

- [X] T008 [US2] 在 `tests/features/order-state-machine.feature` 新增 User Story 2 的六個情境（spec.md User Story 2 的 Acceptance Scenarios 1–6），執行 `npm test` 確認新情境紅燈
- [X] T009 [US2] 在 `tests/steps/order-state-machine.steps.ts` 實作 User Story 2 情境所需的步驟定義

### Implementation for User Story 2

- [X] T010 [US2] 在 `src/order.ts` 實作 `ship`（僅限 PAID，成功後狀態 SHIPPED）
- [X] T011 [US2] 在 `src/order.ts` 實作 `cancel`（僅限 CREATED 或 PAID；狀態 CANCELLED；若為 PAID 則 refundedAmount = paidAmount，依 Clarifications Q1）

**Checkpoint**: User Stories 1 與 2 皆全綠

---

## Phase 5: User Story 3 - 分次退款（已出貨訂單）(Priority: P3)

**Goal**: 已出貨訂單可分次退款，累計不得超過已付金額；達到已付金額時狀態變為 REFUNDED

**Independent Test**: 已付 1000 的已出貨訂單分兩次退 400 與 600，第二次後狀態為「已退款」；超額 601 失敗。

### Tests for User Story 3（先寫，必須紅燈）

- [X] T012 [US3] 在 `tests/features/order-state-machine.feature` 新增 User Story 3 的五個情境（spec.md User Story 3 的 Acceptance Scenarios 1–5），執行 `npm test` 確認新情境紅燈
- [X] T013 [US3] 在 `tests/steps/order-state-machine.steps.ts` 實作 User Story 3 情境所需的步驟定義

### Implementation for User Story 3

- [X] T014 [US3] 在 `src/order.ts` 實作 `refund`（僅限 SHIPPED；amount 為整數且 > 0；refundedAmount + amount ≤ paidAmount，否則失敗；成功後 refundedAmount += amount；若等於 paidAmount 則狀態 REFUNDED，否則維持 SHIPPED）

**Checkpoint**: 全部故事皆全綠

---

## Phase N: Polish & 橫切關注

- [X] T015 [P] 確認 `src/order.ts` 所有函式皆為純函式（不修改傳入的 order），並以測試覆蓋此保證（FR-011）
- [X] T016 執行 `npm run typecheck` 與 `npm test`，確認全部通過
- [X] T017 依 `specs/001-order-state-machine/quickstart.md` 執行驗證步驟

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3（US1）→ Phase 4（US2）→ Phase 5（US3）→ Phase N
- US2 的 cancel 與 US1 的 createOrder/pay 共用 `order.ts`，因此故事依序進行，不並行。
- 每個故事內：測試（紅燈）→ 步驟定義 → 實作 → 綠燈。

## Implementation Strategy

- MVP 為 User Story 1。
- 依優先序逐一完成，每完成一個故事都要 `npm test` 全綠後才進入下一個。
