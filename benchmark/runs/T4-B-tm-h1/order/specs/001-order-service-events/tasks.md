# Tasks: 訂單服務（事件驅動下單流程）

**Input**: Design documents from `/specs/001-order-service-events/`

**Prerequisites**: plan.md（必要）、spec.md（必要，含 User Story）、research.md、data-model.md、contracts/order-service.md、quickstart.md

**Tests**: 需要。constitution 原則四（測試先行）要求每個行為先有紅燈測試再實作。測試以 cucumber-js 撰寫於 `tests/features/order-service.feature` 與 `tests/steps/order-service.steps.ts`。

**Organization**: 依 User Story 分組。優先順序依 spec.md：US1（P1）→ US2（P2，取消）→ US4（P2，重複與亂序）→ US3（P3，逾時）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: 所屬 User Story（US1 至 US4）
- 所有產品碼只在 `src/order.ts`，因此實作任務不標 [P]

## Path Conventions

- 產品碼：`src/order.ts`
- 測試：`tests/features/order-service.feature`、`tests/steps/order-service.steps.ts`
- 不可修改：`src/events.ts`、`src/shop.ts`、`src/index.ts`、`src/inventory.ts`、`src/payment.ts`

---

## Phase 1: Setup

**Purpose**: 確認工具鏈可執行

- [X] T001 確認 `npm test` 與 `npm run typecheck` 可在目前專案執行（尚無 feature 時 `npm test` 應可正常結束）

---

## Phase 2: Foundational（阻擋所有 User Story）

**Purpose**: 建立可紅燈執行的測試骨架與服務骨架

- [X] T002 建立 `tests/steps/order-service.steps.ts` 的 World 與事件工廠：產生其他服務會送來的事件（`PaymentSucceeded`、`StockRejected`、`PaymentFailed`、`StockReserved`、`StockReleased`、`PaymentRefunded`），每個事件的 `id` 由測試自行給定且全域唯一
- [X] T003 在 `src/order.ts` 實作服務骨架：`export function createOrderService(): OrderService`，內部以 `Map<string, OrderRecord>` 保存狀態（欄位見 data-model.md），五個方法先回傳失敗或空陣列，使後續測試為紅燈

**Checkpoint**: 骨架可通過 typecheck；`npm test` 對新 feature 為紅燈

---

## Phase 3: User Story 1 - 顧客下單並等待結果 (Priority: P1) 🎯 MVP

**Goal**: 下單建立「處理中」訂單並發出 `OrderPlaced`；依付款與庫存結果轉為「已確認」「庫存不足」「付款失敗」

**Independent Test**: 只對訂單服務下單並餵入對應事件，檢查事件與狀態

### Tests for User Story 1（先寫，必須為紅燈）

- [X] T004 [US1] 在 `tests/features/order-service.feature` 新增 Scenario：合法下單 → 狀態 PENDING、回傳含一個 OrderPlaced 且內容一致（對應 spec US1 情境 1）
- [X] T005 [US1] 在 `tests/features/order-service.feature` 新增 Scenario：數量非正整數、金額非整數、重複訂單編號 → 失敗且不發出事件（FR-002、FR-003）
- [X] T006 [US1] 在 `tests/features/order-service.feature` 新增 Scenario Outline：PENDING 收到 PaymentSucceeded／StockRejected／PaymentFailed → CONFIRMED／REJECTED／FAILED（US1 情境 2 至 4）
- [X] T007 [US1] 在 `tests/steps/order-service.steps.ts` 實作上列 Scenario 的 step definitions
- [X] T008 [US1] 執行 `npm test`，確認 US1 的 Scenario 為紅燈（失敗原因為行為未實作，而非 step 缺漏）

### Implementation for User Story 1

- [X] T009 [US1] 在 `src/order.ts` 實作 `placeOrder`：驗證數量（正整數）與金額（非負整數），檢查 orderId 重複，建立 PENDING 訂單，發出 id 為 `order:<orderId>:OrderPlaced` 的事件（FR-001、FR-002、FR-003、FR-010）
- [X] T010 [US1] 在 `src/order.ts` 實作 `handle` 中 `PaymentSucceeded`／`StockRejected`／`PaymentFailed` 的 PENDING 來源轉換，其餘狀態忽略；`StockReserved` 不改變狀態（FR-004、FR-005、FR-009）
- [X] T011 [US1] 執行 `npm test`，確認 US1 全綠

**Checkpoint**: US1 獨立可用（MVP）

---

## Phase 4: User Story 2 - 顧客取消訂單 (Priority: P2)

**Goal**: 「處理中」與「已確認」可取消，取消後發出 `OrderCancelled`；其他狀態與不存在的訂單回傳失敗

**Independent Test**: 下單後取消，檢查狀態、取消原因與事件

### Tests for User Story 2（先寫，必須為紅燈）

- [X] T012 [US2] 在 `tests/features/order-service.feature` 新增 Scenario：PENDING 取消 → CANCELLED、cancelReason CUSTOMER、回傳含 OrderCancelled（US2 情境 1）
- [X] T013 [US2] 在 `tests/features/order-service.feature` 新增 Scenario：CONFIRMED 取消 → CANCELLED、cancelReason CUSTOMER、回傳含 OrderCancelled（US2 情境 2，裁示 Q1 B）
- [X] T014 [US2] 在 `tests/features/order-service.feature` 新增 Scenario Outline：已取消、庫存不足、付款失敗的訂單取消 → `NOT_CANCELLABLE`，不發事件、狀態不變；不存在的訂單 → `ORDER_NOT_FOUND`（US2 情境 3 至 5）
- [X] T015 [US2] 在 `tests/steps/order-service.steps.ts` 實作上列 step definitions
- [X] T016 [US2] 執行 `npm test`，確認 US2 Scenario 為紅燈

### Implementation for User Story 2

- [X] T017 [US2] 在 `src/order.ts` 實作 `cancelOrder`：不存在回 `ORDER_NOT_FOUND`；狀態非 PENDING／CONFIRMED 回 `NOT_CANCELLABLE`；否則轉為 CANCELLED（cancelReason CUSTOMER）並發出 id 為 `order:<orderId>:OrderCancelled` 的事件（FR-006）
- [X] T018 [US2] 執行 `npm test`，確認 US2 全綠

**Checkpoint**: US1 與 US2 皆可獨立運作

---

## Phase 5: User Story 4 - 事件重複與亂序仍得到正確結果 (Priority: P2)

**Goal**: 重複事件與終態後的晚到事件不改變狀態、不重發事件；不相關事件回傳空陣列

**Independent Test**: 同一事件多次餵入，或終態後餵入晚到事件，比較狀態與事件數

### Tests for User Story 4（先寫，必須為紅燈）

- [X] T019 [US4] 在 `tests/features/order-service.feature` 新增 Scenario：CONFIRMED 後重複 PaymentSucceeded → 狀態不變、不發事件（US4 情境 1）
- [X] T020 [US4] 在 `tests/features/order-service.feature` 新增 Scenario：PENDING 先收 StockRejected 再收 PaymentSucceeded → 狀態為 REJECTED，後到事件忽略（US4 情境 2）
- [X] T021 [US4] 在 `tests/features/order-service.feature` 新增 Scenario Outline：CANCELLED、REJECTED、FAILED 終態下收到任何付款／庫存事件 → 狀態不變、不發事件（US4 情境 3、4；裁示 Q2 A）
- [X] T022 [US4] 在 `tests/features/order-service.feature` 新增 Scenario：收到與本服務無關的事件（例如 StockReleased、PaymentRefunded）→ 回傳空陣列（FR-013）
- [X] T023 [US4] 在 `tests/steps/order-service.steps.ts` 實作上列 step definitions
- [X] T024 [US4] 執行 `npm test`，確認 US4 Scenario 為紅燈（若部分已由 US1／US2 實作通過，記錄於 BENCH-LOG）

### Implementation for User Story 4

- [X] T025 [US4] 在 `src/order.ts` 確認 `handle` 的所有分支都以來源狀態守門，終態與非 PENDING 狀態下的付款／庫存事件被忽略且不發事件；未知事件型別回傳 `[]`
- [X] T026 [US4] 執行 `npm test`，確認 US4 全綠

**Checkpoint**: US1、US2、US4 皆綠

---

## Phase 6: User Story 3 - 下單後 15 分鐘未付款自動取消 (Priority: P3)

**Goal**: `tick(now)` 對 PENDING 且達到 placedAt + 15 分鐘的訂單自動取消（TIMEOUT）

**Independent Test**: 下單後推進時間，檢查是否取消；未達時限或已確認者不變

### Tests for User Story 3（先寫，必須為紅燈）

- [X] T027 [US3] 在 `tests/features/order-service.feature` 新增 Scenario：下單後 tick 到 T+15 分鐘 → CANCELLED、cancelReason TIMEOUT、回傳含 OrderCancelled（US3 情境 1）
- [X] T028 [US3] 在 `tests/features/order-service.feature` 新增 Scenario：tick 到 T+14 分 59 秒 → 不變、無事件（US3 情境 2）
- [X] T029 [US3] 在 `tests/features/order-service.feature` 新增 Scenario：CONFIRMED 訂單 tick 超過 15 分鐘 → 不變、無事件（US3 情境 3）
- [X] T030 [US3] 在 `tests/steps/order-service.steps.ts` 實作上列 step definitions（時間一律以字串傳入，不得使用系統時鐘）
- [X] T031 [US3] 執行 `npm test`，確認 US3 Scenario 為紅燈

### Implementation for User Story 3

- [X] T032 [US3] 在 `src/order.ts` 實作 `tick(now)`：對每筆 PENDING 訂單，若 `Date.parse(now) - Date.parse(placedAt) >= 900000` 則轉為 CANCELLED（TIMEOUT）並發出 OrderCancelled，回傳這些事件（FR-007、FR-011）
- [X] T033 [US3] 執行 `npm test`，確認 US3 全綠

**Checkpoint**: 全部 User Story 皆綠

---

## Phase 7: Polish & Cross-Cutting

- [X] T034 執行 `npm run typecheck`，修正所有型別錯誤（不使用 `any`）
- [X] T035 執行 `npm test`，確認全部 Scenario 通過
- [X] T036 確認 `git status` 中只有 `src/order.ts`、`tests/features/order-service.feature`、`tests/steps/order-service.steps.ts`（與 specs/、.specify/ 的文件）有變更；`src/events.ts`、`src/shop.ts`、`src/index.ts`、`src/inventory.ts`、`src/payment.ts` 未被修改

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → 各 User Story（依優先順序：US1 → US2 → US4 → US3）→ Phase 7
- 同一個檔案（`src/order.ts`、steps、feature）上的任務依序執行，不平行
- 每個 User Story 內：測試（紅燈）→ 實作 → 轉綠

## Implementation Strategy

- MVP：Phase 1–3（US1）
- 逐步交付：每完成一個 US 即執行 `npm test` 確認前面的 US 仍綠
