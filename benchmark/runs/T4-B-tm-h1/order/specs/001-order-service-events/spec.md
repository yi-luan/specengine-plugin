# Feature Specification: 訂單服務（事件驅動下單流程）

**Feature Branch**: 未建立（本專案無 git 分支 hook）

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "事件驅動下單流程團隊版需求（訂單、庫存、付款三個服務），本次只負責訂單服務 src/order.ts；庫存與付款由同事平行開發"

**範圍說明**: 本功能只涵蓋「訂單服務」。庫存服務與付款服務由同事負責，本規格只描述它們與訂單服務之間的事件合約，不描述它們的內部行為。

## Clarifications

### Session 2026-11-01

- Q: 顧客取消訂單可在哪些狀態進行？ → A: 「處理中」與「已確認」可取消；「庫存不足」「付款失敗」「已取消」不可取消，回傳 `NOT_CANCELLABLE`（需求方裁示 Q1: B）
- Q: 訂單因逾時被取消後才收到 PaymentSucceeded，應如何？ → A: 「已取消」為終態，晚到事件不改變狀態；「庫存不足」「付款失敗」「已取消」皆為終態（需求方裁示 Q2: A）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 顧客下單並等待結果 (Priority: P1)

顧客提交訂單（訂單編號、顧客、商品 SKU、數量、金額）。訂單服務建立訂單，狀態為「處理中」，並發出 `OrderPlaced` 事件，讓庫存服務開始保留庫存。之後訂單狀態依後續事件轉為「已確認」、「庫存不足」或「付款失敗」。

**Why this priority**: 這是整個下單流程的起點與主要價值，沒有它其他流程都不會發生。

**Independent Test**: 只對訂單服務下單，檢查回傳的事件含 `OrderPlaced`、訂單狀態為「處理中」；再分別餵入 `PaymentSucceeded`、`StockRejected`、`PaymentFailed`，檢查各自的狀態轉換。

**Acceptance Scenarios**:

1. **Given** 沒有任何訂單, **When** 顧客提交一筆合法訂單, **Then** 訂單狀態為「處理中」，且回傳含一個 `OrderPlaced` 事件，其內容與輸入一致。
2. **Given** 訂單狀態為「處理中」, **When** 收到 `PaymentSucceeded`, **Then** 訂單狀態變為「已確認」。
3. **Given** 訂單狀態為「處理中」, **When** 收到 `StockRejected`, **Then** 訂單狀態變為「庫存不足」。
4. **Given** 訂單狀態為「處理中」, **When** 收到 `PaymentFailed`, **Then** 訂單狀態變為「付款失敗」。

---

### User Story 2 - 顧客取消訂單 (Priority: P2)

顧客可以取消訂單。取消後訂單狀態變為「已取消」，並發出 `OrderCancelled` 事件，由庫存與付款服務各自放回庫存、退款。

**Why this priority**: 取消是顧客的重要權利，但多數訂單走正常路徑，優先順序低於下單主流程。

**Independent Test**: 下一筆訂單後呼叫取消，檢查狀態為「已取消」、取消原因為顧客、回傳含 `OrderCancelled` 事件。

**Acceptance Scenarios**:

1. **Given** 訂單狀態為「處理中」, **When** 顧客取消, **Then** 狀態變為「已取消」，取消原因為 `CUSTOMER`，回傳含一個 `OrderCancelled` 事件。
2. **Given** 訂單狀態為「已確認」, **When** 顧客取消, **Then** 狀態變為「已取消」，取消原因為 `CUSTOMER`，回傳含一個 `OrderCancelled` 事件（庫存放回、全額退款由其他服務處理）。
3. **Given** 訂單已取消, **When** 顧客再次取消, **Then** 回傳 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，且不發出任何事件。
4. **Given** 訂單狀態為「庫存不足」或「付款失敗」, **When** 顧客取消, **Then** 回傳 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，且不發出任何事件、狀態不變。
5. **Given** 訂單不存在, **When** 顧客取消, **Then** 回傳 `{ ok: false, reason: 'ORDER_NOT_FOUND' }`，且不發出任何事件。

---

### User Story 3 - 下單後 15 分鐘未付款自動取消 (Priority: P3)

訂單建立後 15 分鐘內若仍未完成付款，訂單服務自動取消該訂單，取消原因為逾時，並發出 `OrderCancelled` 事件。

**Why this priority**: 逾時取消是保護庫存的機制，重要但屬於例外路徑。

**Independent Test**: 下一筆訂單，呼叫時間推進到下單後 15 分鐘，檢查狀態為「已取消」、取消原因為 `TIMEOUT`、回傳含 `OrderCancelled`；另一筆訂單在 15 分鐘內收到 `PaymentSucceeded` 後推進時間，檢查不會被取消。

**Acceptance Scenarios**:

1. **Given** 訂單狀態為「處理中」且下單時間為 T, **When** 時間推進到 T + 15 分鐘, **Then** 訂單變為「已取消」，取消原因為 `TIMEOUT`，回傳含 `OrderCancelled`。
2. **Given** 訂單狀態為「處理中」且下單時間為 T, **When** 時間推進到 T + 14 分 59 秒, **Then** 訂單狀態不變，且不發出任何事件。
3. **Given** 訂單已「已確認」, **When** 時間推進超過 15 分鐘, **Then** 訂單狀態不變，且不發出任何事件。

---

### User Story 4 - 事件重複與亂序仍得到正確結果 (Priority: P2)

事件傳遞保證至少送達一次，因此同一事件可能重複送達；事件的先後順序也不保證。訂單服務 MUST 在這兩種情況下仍得到與正常順序一致的最終狀態，且不重複發出事件。

**Why this priority**: 這是整個系統的正確性前提，任何一次錯誤都會造成錯誤的訂單狀態。

**Independent Test**: 以同一組事件用不同順序、重複次數餵入，比較最終狀態與發出的事件集合。

**Acceptance Scenarios**:

1. **Given** 訂單已「已確認」, **When** 同一個 `PaymentSucceeded` 再次送達, **Then** 狀態不變，且不發出任何新事件。
2. **Given** 訂單狀態為「處理中」, **When** 先收到 `StockRejected` 再收到 `PaymentSucceeded`（或反過來的任何順序，但僅限於合法來源狀態）, **Then** 最終狀態符合第一個合法轉換的結果，後到的不合法事件被忽略。
3. **Given** 訂單已「已取消」, **When** 晚到的 `PaymentSucceeded` 或 `StockRejected` 送達, **Then** 狀態不變，且不發出任何事件。
4. **Given** 訂單為終態（「已取消」「庫存不足」「付款失敗」其中之一）, **When** 任何事件送達, **Then** 狀態不變，且不發出任何事件。

---

### Edge Cases

- 同一個訂單編號再次下單時會發生什麼？（見假設：拒絕，不發出事件）
- 下單的數量或金額不是正整數時會發生什麼？（見假設：拒絕，不建立訂單）
- 訂單狀態為「處理中」時收到 `StockReserved`，狀態是否改變？（見假設：不改變，僅作為中間確認）
- 訂單逾時自動取消後，才收到 `PaymentSucceeded`，訂單應如何？（已裁示：「已取消」為終態，晚到事件不改變狀態，見 FR-009 與假設）
- 顧客可在哪些狀態下取消？（已裁示：「處理中」與「已確認」可取消；「庫存不足」「付款失敗」「已取消」不可取消，回傳 `NOT_CANCELLABLE`，見 FR-006）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 接受下單指令（訂單編號、顧客、商品 SKU、數量、金額、時間），建立狀態為「處理中」的訂單，並發出一個 `OrderPlaced` 事件，其內容與輸入一致。
- **FR-002**: 系統 MUST 只接受整數的數量（正整數）與金額（非負整數）；不合法時 MUST 回傳失敗結果並附原因，且不建立訂單、不發出事件。
- **FR-003**: 系統 MUST 拒絕重複的訂單編號；拒絕時回傳失敗結果，且不發出事件。
- **FR-004**: 系統 MUST 在收到 `StockReserved` 時維持訂單狀態不變，且不發出事件。
- **FR-005**: 系統 MUST 在訂單為「處理中」時，依事件轉換狀態：`PaymentSucceeded` → 「已確認」；`StockRejected` → 「庫存不足」；`PaymentFailed` → 「付款失敗」。
- **FR-006**: 系統 MUST 允許顧客取消狀態為「處理中」或「已確認」的訂單，取消後狀態為「已取消」、取消原因為 `CUSTOMER`，並發出一個 `OrderCancelled` 事件，回傳成功結果。對狀態為「庫存不足」「付款失敗」「已取消」的訂單取消時，MUST 回傳失敗結果 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，且不發出事件、不改變狀態。對不存在的訂單取消時，MUST 回傳失敗結果 `reason: 'ORDER_NOT_FOUND'`，且不發出事件。
- **FR-007**: 系統 MUST 在時間推進到「下單時間 + 15 分鐘」（含）且訂單仍為「處理中」時，自動取消該訂單，取消原因為 `TIMEOUT`，並發出一個 `OrderCancelled` 事件。
- **FR-008**: 系統 MUST 對重複送達的事件具冪等性：同一事件重複送達不改變狀態，也不重複發出事件。
- **FR-009**: 系統 MUST 對亂序送達的事件有確定的結果：只有在合法來源狀態下的事件才會造成狀態轉換；其餘事件被忽略且不發出事件。
- **FR-010**: 系統 MUST 為每個自己發出的事件產生全系統唯一的 `id`。
- **FR-011**: 系統 MUST 只使用外部傳入的時間字串（ISO 8601）判斷逾時，MUST NOT 讀取系統時鐘。
- **FR-012**: 系統 MUST 只保存訂單自己的狀態，MUST NOT 讀取或修改庫存與付款的狀態。
- **FR-013**: 系統 MUST 只處理本服務關心的事件類型；其他事件回傳空陣列。

### Key Entities

- **訂單 (Order)**: 訂單編號、顧客、商品 SKU、數量、金額、下單時間、狀態（處理中／已確認／庫存不足／付款失敗／已取消）、取消原因（顧客／逾時，僅已取消時有值）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 所有列於 User Story 1 至 3 的驗收情境皆可由自動化測試重現並通過。
- **SC-002**: 同一組事件以任何重複次數、任何順序餵入（僅限真實可能發生的組合），訂單最終狀態一致。
- **SC-003**: 任何單一事件重複送達，發出的事件總數與第一次送達相同（不增加）。
- **SC-004**: 訂單服務的所有行為皆可在不接觸資料庫、網路或系統時鐘的情況下測試。

## Assumptions

- 數量為正整數，金額為非負整數（需求第 9 點：金額與數量皆為整數）。
- 重複的訂單編號視為非法下單，拒絕且不發出事件。
- 「處理中」狀態收到 `StockReserved` 只是中間確認，狀態不變、不發出事件。
- 逾時判斷為「時間 ≥ 下單時間 + 15 分鐘」即逾時；僅對仍為「處理中」的訂單生效。
- 狀態轉換只接受來自「處理中」的 `PaymentSucceeded`、`StockRejected`、`PaymentFailed`；其他狀態下收到這些事件一律忽略。
- 終態為「已取消」「庫存不足」「付款失敗」（已裁示）：進入終態後，任何事件都不改變訂單狀態，也不發出事件。「已確認」不是終態，仍可由顧客取消。
- 「已確認」狀態下的逾時不生效，訂單不會因超過 15 分鐘而取消（見 User Story 3 驗收情境 3）。
- 取消後的 `OrderCancelled` 由訂單服務發出，庫存與退款的後續動作由其他服務負責，不屬於本服務範圍。
- 本服務的所有狀態只存在記憶體中，不需要持久化。
