# Tasks: 庫存服務（事件驅動下單流程）

**Input**: Design documents from `/specs/001-inventory-reservation/`

**Prerequisites**: plan.md（必要）、spec.md（必要）、research.md、data-model.md、quickstart.md

**Tests**: 憲章原則 IV 要求測試先行，因此每個使用者故事都先寫 Gherkin 情境與 step definitions，確認紅燈後再實作。

**Organization**: 任務依使用者故事分組，每個故事可獨立測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、沒有未完成的相依）
- **[Story]**: 對應 spec.md 的使用者故事（US1…US5）

## Path Conventions

- 產品碼：`src/inventory.ts`（唯一允許修改的產品檔）
- 測試：`tests/features/inventory-reservation.feature`、`tests/steps/inventory-reservation.steps.ts`

---

## Phase 1: Setup（共用基礎）

**Purpose**: 確認開發環境可執行

- [X] T001 確認 `npm run typecheck` 與 `npm test` 可執行（目前 `src/inventory.ts` 仍是 stub，測試應為紅燈）

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 建立所有故事共用的狀態與輔助函式，之後的故事都依賴它

- [X] T002 在 `src/inventory.ts` 建立服務內部狀態：`available: Map<string, number>`（複製自 `stock` 參數）、`orders: Map<string, {sku, qty, status}>`、`seenEventIds: Set<string>`，並實作 `getAvailable` 與事件 id 產生函式（`inv-${randomUUID()}`）；`handle` 先處理 `seenEventIds` 去重（依 data-model.md）
- [X] T003 [P] 在 `tests/steps/inventory-reservation.steps.ts` 建立共用的事件建構輔助函式與服務初始化 step（每個情境重新建立服務，不共用狀態）

**Checkpoint**: 服務骨架可被測試載入，所有故事可以開始

---

## Phase 3: User Story 1 - 下單時保留庫存 (Priority: P1) 🎯 MVP

**Goal**: `OrderPlaced` 在庫存足夠時回傳 `StockReserved` 並扣庫存，不足時回傳 `StockRejected`

**Independent Test**: 只送 `OrderPlaced`，檢查回傳事件與 `getAvailable`

### Tests for User Story 1（先寫，必須紅燈）

- [X] T004 [US1] 在 `tests/features/inventory-reservation.feature` 寫入 spec.md User Story 1 的三個 Acceptance Scenarios
- [X] T005 [US1] 在 `tests/steps/inventory-reservation.steps.ts` 實作 US1 的 Given/When/Then step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 1

- [X] T006 [US1] 在 `src/inventory.ts` 的 `handle` 實作 `OrderPlaced`：數量為正整數且庫存 ≥ 數量時扣庫存、記為 RESERVED、回傳 `StockReserved`；否則記為 REJECTED、回傳 `StockRejected`（FR-001、FR-002、FR-013，對應 research.md 的數量與 SKU 驗證）
- [X] T007 [US1] 執行 `npm test` 確認 US1 情境全綠

**Checkpoint**: US1 可獨立運作（MVP）

---

## Phase 4: User Story 2 - 付款失敗時放回庫存 (Priority: P1)

**Goal**: `PaymentFailed` 對 RESERVED 訂單放回庫存並回傳 `StockReleased`；對沒有保留紀錄的訂單不動作

**Independent Test**: 先保留，再送 `PaymentFailed`，檢查庫存與回傳事件

### Tests for User Story 2（先寫，必須紅燈）

- [X] T008 [US2] 在 `tests/features/inventory-reservation.feature` 寫入 spec.md User Story 2 的 Acceptance Scenarios
- [X] T009 [US2] 在 `tests/steps/inventory-reservation.steps.ts` 實作 US2 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 2

- [X] T010 [US2] 在 `src/inventory.ts` 的 `handle` 實作 `PaymentFailed`：RESERVED 訂單放回該訂單的數量、轉為 RELEASED、回傳 `StockReleased`；沒有紀錄時建立 FAILED 終態紀錄（research.md 的亂序處理）；其他狀態不動作（FR-003、FR-008）
- [X] T011 [US2] 執行 `npm test` 確認 US2 情境全綠

**Checkpoint**: US1 與 US2 皆可獨立運作

---

## Phase 5: User Story 3 - 訂單取消時放回庫存 (Priority: P2)

**Goal**: `OrderCancelled` 對 RESERVED 訂單放回庫存並回傳 `StockReleased`；取消先到時建立 CANCELLED 終態紀錄

**Independent Test**: 先保留，再送 `OrderCancelled`，檢查庫存與回傳事件

### Tests for User Story 3（先寫，必須紅燈）

- [X] T012 [US3] 在 `tests/features/inventory-reservation.feature` 寫入 spec.md User Story 3 的 Acceptance Scenarios
- [X] T013 [US3] 在 `tests/steps/inventory-reservation.steps.ts` 實作 US3 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 3

- [X] T014 [US3] 在 `src/inventory.ts` 的 `handle` 實作 `OrderCancelled`：RESERVED 訂單放回並回傳 `StockReleased`；沒有紀錄時建立 CANCELLED 終態紀錄（FR-004、FR-004a、FR-004b）
- [X] T015 [US3] 執行 `npm test` 確認 US3 情境全綠

**Checkpoint**: US1 至 US3 皆可獨立運作

---

## Phase 6: User Story 4 - 重複與亂序事件的穩健性 (Priority: P2)

**Goal**: 同一事件 id 第二次起忽略；同一訂單只處理第一次結果；取消或付款失敗先到時，之後的 OrderPlaced 不保留；放回只發生一次

**Independent Test**: 重複送同一事件、先取消後下單、先拒絕後不同 id 的重複下單、PaymentFailed 與 OrderCancelled 同時送達

### Tests for User Story 4（先寫，必須紅燈）

- [X] T016 [US4] 在 `tests/features/inventory-reservation.feature` 寫入 spec.md User Story 4 的 Acceptance Scenarios，以及 Edge Cases 中的重複與亂序情境
- [X] T017 [US4] 在 `tests/steps/inventory-reservation.steps.ts` 實作 US4 的 step definitions（同 id 重送、不同 id 重送需要自行建立第二個事件），執行 `npm test` 確認紅燈

### Implementation for User Story 4

- [X] T018 [US4] 在 `src/inventory.ts` 確認並完成：同一事件 id 去重（FR-005 的 id 部分）、訂單第一次結果為最終結果、取消或付款失敗先到的終態處理、放回只一次（FR-005、FR-006、FR-007）
- [X] T019 [US4] 執行 `npm test` 確認 US4 情境全綠

**Checkpoint**: US1 至 US4 皆可獨立運作

---

## Phase 7: User Story 5 - 忽略不相關的事件 (Priority: P3)

**Goal**: 對 `PaymentSucceeded` 等無關事件回傳空陣列且不改狀態

**Independent Test**: 送入無關事件，檢查回傳為空陣列

### Tests for User Story 5（先寫，必須紅燈）

- [X] T020 [US5] 在 `tests/features/inventory-reservation.feature` 寫入 spec.md User Story 5 的 Acceptance Scenario
- [X] T021 [US5] 在 `tests/steps/inventory-reservation.steps.ts` 實作 US5 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 5

- [X] T022 [US5] 在 `src/inventory.ts` 的 `handle` 對其他事件類型回傳空陣列且不改狀態（FR-011）
- [X] T023 [US5] 執行 `npm test` 確認 US5 情境全綠

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T024 執行 `npm run typecheck`，修正 `src/inventory.ts` 與測試檔的型別錯誤
- [X] T025 執行 `npm test` 全綠，確認沒有修改 `src/events.ts`、`src/shop.ts`、`src/index.ts`、`src/order.ts`、`src/payment.ts`（可用 `git status` 檢查）
- [X] T026 依 quickstart.md 的手動檢查情境核對一次

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → 各故事 → Phase 8
- US1 完成後 US2、US3 可以接著做（同檔案，實際上依序執行較安全）
- US4 依賴 US1 至 US3 的實作
- US5 依賴 Phase 2

### Within Each User Story

- 先寫測試並確認紅燈，再實作
- 同一檔案 `src/inventory.ts` 的任務不可平行

## Implementation Strategy

- MVP：Phase 1 → 2 → 3（US1）
- 之後依優先序加入 US2、US3、US4、US5，每階段都跑 `npm test`
