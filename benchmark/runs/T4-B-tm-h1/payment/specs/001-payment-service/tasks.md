# Tasks: 付款服務（事件驅動下單流程）

**Input**: Design documents from `/specs/001-payment-service/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 測試為必要項：憲法原則 III 要求以 cucumber-js 先寫會失敗的 feature 與 Step Definitions，再實作。

**Organization**: 依 spec 的 User Story（US1–US4）分組，每組可獨立驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行（不同檔案、無相依）
- **[Story]**: 對應 spec.md 的 User Story
- 所有產品碼只能修改 `src/payment.ts`；測試只能修改 `tests/` 下本功能的檔案

## Phase 1: Setup（共用基礎）

**Purpose**: 建立測試骨架與服務檔案的可編譯版本

- [X] T001 [P] 建立測試世界物件 `tests/support/world.ts`：持有 `PaymentService` 實例、已注入的事件、收集到的輸出事件、以及顧客餘額查詢輔助函式
- [X] T002 [P] 建立 `src/payment.ts` 骨架：匯出 `createPaymentService(balances: Record<string, number>): PaymentService`，所有方法回傳空陣列或 0（紅燈狀態，型別需符合 `src/events.ts`）

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 所有 User Story 共用的 feature 與步驟定義，必須先於實作完成

**⚠️ CRITICAL**: 完成前不得開始任何 User Story 的實作

- [X] T003 撰寫 `tests/features/payment.feature`：涵蓋 spec 的 US1–US4 所有 Acceptance Scenarios 與 Edge Cases（亂序暫存、取消後的庫存保留、重複事件、無關事件）。所有情境在此階段應為紅燈
- [X] T004 撰寫 `tests/steps/payment.steps.ts`：實作 T003 所有步驟的 Step Definitions，使用 T001 的世界物件，斷言餘額與輸出事件

**Checkpoint**: feature 與步驟定義完成，`npm test` 因服務骨架而失敗（紅燈），實作可開始

---

## Phase 3: User Story 1 - 庫存保留後成功扣款 (Priority: P1) 🎯 MVP

**Goal**: 已知訂單資訊後，收到「庫存已保留」且餘額足夠時扣款並發出 PaymentSucceeded

**Independent Test**: spec US1 的兩個 Acceptance Scenarios 通過

- [X] T005 [US1] 在 `src/payment.ts` 實作餘額初始化與 `getBalance`，依 data-model.md 的 `balances` 與整數不變量
- [X] T006 [US1] 在 `src/payment.ts` 實作 `OrderPlaced` 記錄（狀態 UNPAID，記下 customerId 與 amount），以及 `StockReserved` 在餘額足夠時的扣款路徑（狀態 CHARGED，發出 `PaymentSucceeded`，事件 id 為 `pay-<序號>`）

**Checkpoint**: US1 的 feature 情境通過

---

## Phase 4: User Story 2 - 餘額不足時付款失敗 (Priority: P1)

**Goal**: 餘額不足時不扣款並發出 PaymentFailed

**Independent Test**: spec US2 的 Acceptance Scenario 通過

- [X] T007 [US2] 在 `src/payment.ts` 實作 `StockReserved` 在 UNPAID 且餘額小於金額時的失敗路徑（狀態 FAILED，不扣款，發出 `PaymentFailed`）

**Checkpoint**: US1 與 US2 的情境都通過

---

## Phase 5: User Story 3 - 取消訂單時退還已扣款項 (Priority: P2)

**Goal**: 已扣款訂單取消時退款並發出 PaymentRefunded；未扣款訂單取消時無退款、無事件

**Independent Test**: spec US3 的兩個 Acceptance Scenarios 通過

- [X] T008 [US3] 在 `src/payment.ts` 實作 `OrderCancelled`：CHARGED → REFUNDED，餘額回補，發出 `PaymentRefunded`；UNPAID → CANCELLED，不發事件、不變更餘額（FR-004、FR-005）

**Checkpoint**: US1 至 US3 的情境都通過

---

## Phase 6: User Story 4 - 重複與亂序事件不造成重複扣款或退款 (Priority: P2)

**Goal**: 重複事件與亂序事件的結果收斂，扣款與退款各最多一次

**Independent Test**: spec US4 的四個 Acceptance Scenarios 通過

- [X] T009 [US4] 在 `src/payment.ts` 為 `StockReserved`、`OrderCancelled`、`OrderPlaced` 加上狀態守衛，已處理過的輸入回傳空陣列（FR-006）
- [X] T010 [US4] 在 `src/payment.ts` 實作暫存：狀態 AWAITING_ORDER 時收到 `StockReserved` 只暫存不發事件；收到 `OrderPlaced` 時依餘額判定扣款或失敗；暫存期間若已取消則作廢（FR-007、FR-015）
- [X] T011 [US4] 在 `src/payment.ts` 實作已取消訂單的守衛：CANCELLED 狀態收到 `StockReserved` 不扣款、不發事件；先取消後到的 `OrderPlaced` 只記錄不改變狀態（FR-014）

**Checkpoint**: US1 至 US4 與所有 Edge Cases 情境都通過

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 型別、整體測試與範圍檢查

- [X] T012 [P] 執行 `npm run typecheck`，修正 `src/payment.ts` 與 `tests/` 的型別錯誤（不得使用 `any` 繞過）
- [X] T013 [P] 確認 `src/payment.ts` 只匯出 `createPaymentService`，且事件 id 在單一實例內唯一（FR-013）
- [X] T014 執行 `npm test`，確認 feature 全部通過、無 undefined 或 pending 步驟（對應 quickstart.md）

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: 世界物件與骨架先於步驟定義
- **Phase 2 → Phase 3+**: 所有實作都依賴紅燈的 feature 與步驟定義
- **Phase 3 → 4 → 5 → 6**: 同一檔案 `src/payment.ts`，依序實作（不平行）
- **Phase 7**: 依賴所有 User Story 完成

### Parallel Opportunities

- T001 與 T002 可平行（不同檔案）
- T012 與 T013 可平行（唯讀檢查）

## Implementation Strategy

### MVP First（US1）

1. Phase 1 → Phase 2（紅燈基線）
2. Phase 3（US1）→ 驗證扣款成功路徑
3. 依序完成 US2、US3、US4

### Notes

- 每個任務完成後跑一次 `npm test`，確認紅燈數量遞減
- 不得修改 `src/events.ts`、`src/shop.ts`、`src/order.ts`、`src/inventory.ts`
