# Tasks: 事件驅動下單流程（訂單、庫存、付款）

**Input**: Design documents from `/specs/001-event-order-flow/`

**Prerequisites**: plan.md（必要）、spec.md（必要，user stories）、research.md、data-model.md、contracts/shop-api.md、quickstart.md

**Tests**: 本功能需要測試。憲法 II（Gherkin 先行、TDD，NON-NEGOTIABLE）要求每個 user story 先寫 Feature 與步驟定義，並確認紅燈後才實作。

**Organization**: 任務依 user story 分組，每個 story 可獨立測試。

**注意**: `src/shop.ts` 為三個服務的共同檔案，所有實作任務皆依序執行、不標記 [P]。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案、無相依）
- **[Story]**: 對應 spec.md 的 user story（US1 至 US6）

---

## Phase 1: Setup（共用基礎設施）

**Purpose**: 建立產品碼骨架與公開介面，確保型別檢查可通過

- [X] T001 確認 `tsconfig.json` 為 strict 模式、`npm run typecheck` 可執行（檔案：`tsconfig.json`、`package.json`）
- [X] T002 建立 `src/shop.ts`：依 `contracts/shop-api.md` 逐字匯出 `Event`、`OrderStatus`、`PlaceOrderInput`、`CommandResult`、`OrderService`、`InventoryService`、`PaymentService`，以及三個工廠函式（暫時 `throw new Error('not implemented')`）（檔案：`src/shop.ts`）

---

## Phase 2: Foundational（阻塞性前置條件）

**Purpose**: 所有 story 共用的測試基礎設施與事件 id 產生機制

**⚠️ CRITICAL**: 本階段完成前不得開始任何 user story

- [X] T003 建立測試共用 world 與事件廣播 harness：`dispatch(event)` 將事件送給三個服務的 `handle`，並把回傳的新事件遞迴廣播直到沒有新事件（檔案：`tests/support/harness.ts`）
- [X] T004 在 `src/shop.ts` 實作事件 id 產生器（格式 `<service>-<seq>`，每個服務各自計數）與各服務共用的 `seenEventIds` 去重檢查（檔案：`src/shop.ts`）

**Checkpoint**: 基礎設施完成，user story 可開始

---

## Phase 3: User Story 1 - 下單並完成付款，訂單確認 (Priority: P1) 🎯 MVP

**Goal**: 下單後庫存足夠且餘額足夠時，訂單變為「已確認」，庫存與餘額各被扣減一次。

**Independent Test**: 以庫存與餘額皆足夠的顧客下單，檢查 `getOrder` 為 `CONFIRMED`、`getAvailable` 減少、`getBalance` 減少。

### Tests for User Story 1（先寫，必須紅燈）

- [X] T005 [US1] 撰寫 Gherkin：下單成功路徑（spec US1 第 1 條）於 `tests/features/us1-happy-path.feature`
- [X] T006 [US1] 撰寫 US1 步驟定義並確認紅燈（`npm test` 失敗）於 `tests/steps/us1-happy-path.steps.ts`

### Implementation for User Story 1

- [X] T007 [US1] 實作訂單服務 `placeOrder`（建立 PENDING、發 `OrderPlaced`、重複 orderId 回傳 `ok: false`）與 `getOrder`，並實作 `handle` 中的 `PaymentSucceeded` → `CONFIRMED`（檔案：`src/shop.ts`）
- [X] T008 [US1] 實作庫存服務 `handle(OrderPlaced)` 足夠時保留庫存並發 `StockReserved`，以及 `getAvailable`（檔案：`src/shop.ts`）
- [X] T009 [US1] 實作付款服務 `handle(OrderPlaced)` 記錄 `orderInfo`、`handle(StockReserved)` 扣款並發 `PaymentSucceeded`，以及 `getBalance`（檔案：`src/shop.ts`）

**Checkpoint**: `npm test` 中 US1 情境全綠，US1 可獨立運作

---

## Phase 4: User Story 2 - 庫存不足，訂單標記為庫存不足 (Priority: P1)

**Goal**: 庫存不足時不保留、不扣款，訂單變為「庫存不足」（`REJECTED`）。

**Independent Test**: 以庫存小於數量的商品下單，檢查 `getOrder` 為 `REJECTED`，庫存與餘額不變。

### Tests for User Story 2（先寫，必須紅燈）

- [X] T010 [US2] 撰寫 Gherkin：庫存不足情境（spec US2）於 `tests/features/us2-out-of-stock.feature`
- [X] T011 [US2] 撰寫 US2 步驟定義並確認紅燈於 `tests/steps/us2-out-of-stock.steps.ts`

### Implementation for User Story 2

- [X] T012 [US2] 庫存服務 `handle(OrderPlaced)` 在數量不足時發 `StockRejected`（檔案：`src/shop.ts`）
- [X] T013 [US2] 訂單服務 `handle(StockRejected)`：`PENDING` → `REJECTED`（檔案：`src/shop.ts`）

**Checkpoint**: US1 與 US2 皆可獨立通過

---

## Phase 5: User Story 3 - 付款失敗，庫存回復並標記付款失敗 (Priority: P2)

**Goal**: 餘額不足時不扣款，訂單變為「付款失敗」（`FAILED`），庫存放回並發出 `StockReleased`。

**Independent Test**: 庫存足夠、餘額不足的顧客下單，檢查 `FAILED`、庫存回到下單前、餘額不變。

### Tests for User Story 3（先寫，必須紅燈）

- [X] T014 [US3] 撰寫 Gherkin：付款失敗與庫存釋放（spec US3）於 `tests/features/us3-payment-failed.feature`
- [X] T015 [US3] 撰寫 US3 步驟定義並確認紅燈於 `tests/steps/us3-payment-failed.steps.ts`

### Implementation for User Story 3

- [X] T016 [US3] 付款服務 `handle(StockReserved)` 餘額不足時發 `PaymentFailed`（檔案：`src/shop.ts`）
- [X] T017 [US3] 訂單服務 `handle(PaymentFailed)`：`PENDING` → `FAILED`（檔案：`src/shop.ts`）
- [X] T018 [US3] 庫存服務 `handle(PaymentFailed)`：有保留時放回數量、刪除保留紀錄並發 `StockReleased`；無保留時忽略（檔案：`src/shop.ts`）

**Checkpoint**: US1 至 US3 皆可獨立通過

---

## Phase 6: User Story 4 - 顧客取消訂單 (Priority: P2)

**Goal**: 顧客可取消處理中與已確認的訂單；取消後庫存放回，已扣款項全額退還；取消後才到的「庫存已保留」不扣款（Q3）。

**Independent Test**: 分別對 PENDING（未扣款）與 CONFIRMED（已扣款）訂單取消，檢查狀態、庫存、餘額；另測取消後才抵達的 `StockReserved`。

### Tests for User Story 4（先寫，必須紅燈）

- [X] T019 [US4] 撰寫 Gherkin：顧客取消的三種情境（PENDING、CONFIRMED、終態拒絕）與取消後的 `StockReserved` 不扣款（spec US4 第 1～4 條）於 `tests/features/us4-customer-cancel.feature`
- [X] T020 [US4] 撰寫 US4 步驟定義並確認紅燈於 `tests/steps/us4-customer-cancel.steps.ts`

### Implementation for User Story 4

- [X] T021 [US4] 訂單服務 `cancelOrder`：`PENDING` 或 `CONFIRMED` → `CANCELLED`（`cancelReason = 'CUSTOMER'`）並發 `OrderCancelled`；其他狀態回傳 `ok: false`（檔案：`src/shop.ts`）
- [X] T022 [US4] 庫存服務 `handle(OrderCancelled)`：放回保留數量、刪除保留紀錄、加入 `cancelledOrders`（不發 `StockReleased`）；`handle(OrderPlaced)` 若 orderId 在 `cancelledOrders` 中則忽略（檔案：`src/shop.ts`）
- [X] T023 [US4] 付款服務 `handle(OrderCancelled)`：有 charge 時全額退款、刪除 charge、發 `PaymentRefunded`；加入 `cancelledOrders`；`handle(StockReserved)` 若 orderId 在 `cancelledOrders` 中則不扣款且不發事件（Q3）（檔案：`src/shop.ts`）

**Checkpoint**: US1 至 US4 皆可獨立通過

---

## Phase 7: User Story 5 - 15 分鐘未付款自動取消 (Priority: P3)

**Goal**: `tick(now)` 對仍為 PENDING 且距下單已滿 15 分鐘（含剛好 15 分鐘）的訂單自動取消（`cancelReason = 'TIMEOUT'`）。已確認或已取消者不受影響（Q2）。

**Independent Test**: 下單後以不同 `now` 呼叫 `tick`，檢查邊界值（14:59 不取消、15:00 取消）與已確認訂單不被取消。

### Tests for User Story 5（先寫，必須紅燈）

- [X] T024 [US5] 撰寫 Gherkin：逾時邊界、已確認不受影響、取消後付款成功不改變狀態（spec US5 第 1～4 條）於 `tests/features/us5-timeout.feature`
- [X] T025 [US5] 撰寫 US5 步驟定義並確認紅燈於 `tests/steps/us5-timeout.steps.ts`

### Implementation for User Story 5

- [X] T026 [US5] 訂單服務 `tick(now)`：掃描 PENDING 訂單，`Date.parse(now) - Date.parse(at) >= 900000` 時取消（`cancelReason = 'TIMEOUT'`）並回傳 `OrderCancelled`（檔案：`src/shop.ts`）
- [X] T027 [US5] 訂單服務 `handle`：`CANCELLED` 狀態下收到 `PaymentSucceeded` 不改變狀態（FR-017）（檔案：`src/shop.ts`）

**Checkpoint**: US1 至 US5 皆可獨立通過

---

## Phase 8: User Story 6 - 事件重複與亂序不影響結果 (Priority: P1)

**Goal**: 同一事件重送不產生重複效果；亂序抵達時最終狀態與順序正確時相同。

**Independent Test**: 同一組事件以重複與不同順序送入，比較三服務最終狀態。

### Tests for User Story 6（先寫，必須紅燈）

- [X] T028 [US6] 撰寫 Gherkin：重複事件、亂序事件、終態忽略不一致事件（spec US6 與 Assumptions）於 `tests/features/us6-duplicate-out-of-order.feature`
- [X] T029 [US6] 撰寫 US6 步驟定義並確認紅燈於 `tests/steps/us6-duplicate-out-of-order.steps.ts`

### Implementation for User Story 6

- [X] T030 [US6] 三個服務的 `handle` 入口統一先檢查 `seenEventIds`，已見過的事件回傳 `[]`（檔案：`src/shop.ts`）
- [X] T031 [US6] 訂單服務在終態（REJECTED、FAILED、CANCELLED）忽略與狀態不一致的事件（檔案：`src/shop.ts`）

**Checkpoint**: US1 至 US6 皆可獨立通過

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 整體驗證

- [X] T032 執行 `npm run typecheck`，確認無錯誤（檔案：`src/shop.ts`）
- [X] T033 執行 `npm test`，確認全綠（檔案：`tests/features/`、`tests/steps/`）
- [X] T034 依 `quickstart.md` 執行驗證並確認預期結果（檔案：`specs/001-event-order-flow/quickstart.md`）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，立即開始
- **Foundational (Phase 2)**: 依賴 Setup，阻塞所有 user story
- **User Stories (Phase 3–8)**: 依賴 Foundational；因皆寫在 `src/shop.ts`，實際上依序進行（P1 → P2 → P3 的順序：US1、US2、US3、US4、US5、US6）
- **Polish (Phase 9)**: 依賴所有 user story 完成

### Within Each User Story

- Gherkin 與步驟定義（紅燈）必須先於實作
- 實作完成後該 story 的情境必須轉綠

---

## Implementation Strategy

### MVP First（僅 US1）

1. 完成 Phase 1、Phase 2
2. 完成 Phase 3（US1）
3. 停下來驗證 US1 獨立通過

### Incremental Delivery

依 US1 → US2 → US3 → US4 → US5 → US6 順序逐步加入，每階段後 `npm test` 全綠。

---

## Notes

- 每個 story 的 Feature 與步驟定義彼此獨立檔案，但實作統一在 `src/shop.ts`。
- 若某 story 的紅燈測試在實作前就已通過，表示測試沒有驗證到新行為，需修正測試。
- 本 tasks.md 依 plan.md 與 contracts/shop-api.md 產生；Q2、Q3 的答覆已反映在 T023、T026。

## Phase 10: Convergence

- [X] T035 新增 Gherkin 與步驟：付款成功事件先於庫存保留抵達訂單服務時，訂單最終為 CONFIRMED 且庫存只扣一次 per US1/AC2 與 US6/AC2 (partial)
- [X] T036 新增 Gherkin 與步驟：重複送達的 StockReleased 與 PaymentRefunded 事件只回復庫存與餘額一次 per Edge Cases 與 SC-004 (partial)
- [X] T037 庫存與付款服務的初始數值（stock、balances）若非整數則拋出錯誤，確保金額與數量皆為整數 per FR-012 (partial)
- [X] T038 各服務的 seenEventIds 只記錄自己處理的事件類型，無關事件不留下任何狀態 per FR-015 (partial)
## Phase 11: Convergence

- [X] T039 新增 Gherkin 情境：同一訂單編號重複下單不改變庫存與餘額，第二次下單回傳失敗 per Assumptions（同一訂單編號）與 Edge Cases (partial)
- [X] T040 在測試 harness 中加入每個情境結束後的不變式檢查：所有庫存與餘額皆不為負數 per SC-003 (partial)