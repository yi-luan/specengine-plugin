# Feature Specification: 訂單服務（事件驅動下單流程）

**Feature Branch**: `001-order-service`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "事件驅動下單流程（訂單、庫存、付款三個服務）— 團隊版需求 tasks/t4-team/requirement.md；本 feature 範圍為我負責的『訂單服務』（src/order.ts）：建立訂單並發出 OrderPlaced、依庫存/付款事件推進訂單狀態、顧客取消、15 分鐘未付款自動取消、容忍事件重複與亂序。"

## Clarifications

### Session 2026-11-01

- Q: 訂單已是「已確認」時，顧客取消要成功還是被拒絕？ → A: 允許；變為 CANCELLED（cancelReason `CUSTOMER`）並發 `OrderCancelled`。REJECTED／FAILED／CANCELLED 不能取消，回 `{ ok: false, reason: 'NOT_CANCELLABLE' }`；找不到訂單回 `ORDER_NOT_FOUND`。
- Q: `tick(now)` 推進到恰好下單時間 + 15 分 00 秒時算逾時嗎？ → A: 算；以訂單服務當下狀態判定，仍為 PENDING 且 now − 下單時間 ≥ 15 分鐘就取消（cancelReason `TIMEOUT`，發 `OrderCancelled`）。
- Q: 訂單到達 CONFIRMED／REJECTED／FAILED／CANCELLED 後再收到結果事件，是否先到者為準？ → A: 是；CANCELLED／REJECTED／FAILED 是終態，之後任何事件都不改變狀態；CONFIRMED 只會因顧客取消而變成 CANCELLED。
- Q: 以已存在的訂單編號再次下單，`placeOrder` 的失敗理由字串是什麼？ → A: `DUPLICATE_ORDER`，不建立訂單、不發事件。
- Q: 數量或金額不是正整數時要拒絕嗎？理由字串？ → A: 拒絕；qty 或 amount 不是正整數、或 orderId／customerId／sku 為空字串 → `INVALID_INPUT`，不建立訂單、不發事件。
- Q: 下單已超過 15 分鐘但 `tick` 尚未推進時顧客取消，cancelReason 是 CUSTOMER 還是 TIMEOUT？ → A: `CUSTOMER`（`cancelOrder` 不判逾時，只有 `tick` 產生 TIMEOUT）。
- Q: `PaymentSucceeded.amount` 與訂單金額不一致時仍要 CONFIRMED 嗎？ → A: 需求方授權由工程師決定；決定為「仍確認、不比對金額」（金額由付款服務負責，訂單服務只看事件類型與 orderId）。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 顧客下單並依結果推進狀態 (Priority: P1)

顧客提交訂單（訂單編號、顧客、商品 SKU、數量、金額），訂單服務建立訂單為「處理中」並對外宣告「已下單」。
之後庫存服務與付款服務各自回報結果，訂單服務依結果把訂單推進到「已確認」、「庫存不足」或「付款失敗」。

**Why this priority**: 這是訂單服務存在的核心價值；沒有它其他兩個服務無從啟動。

**Independent Test**: 不需要真正的庫存/付款服務。測試自行建立訂單，再手動餵入其他服務「會送來」的事件，觀察訂單狀態與回傳事件。

**Acceptance Scenarios**:

1. **Given** 尚無訂單 O1，**When** 顧客下單 O1（顧客 C1、SKU A、數量 2、金額 100、時間 T0），**Then** 下單成功、O1 狀態為「處理中」，並發出一個 `OrderPlaced`，內容與下單資料完全一致（orderId、customerId、sku、qty、amount、at）。
2. **Given** O1 為「處理中」，**When** 收到 O1 的 `PaymentSucceeded`，**Then** O1 變為「已確認」，不再發出任何事件。
3. **Given** O1 為「處理中」，**When** 收到 O1 的 `StockRejected`，**Then** O1 變為「庫存不足」，不再發出任何事件。
4. **Given** O1 為「處理中」，**When** 收到 O1 的 `PaymentFailed`，**Then** O1 變為「付款失敗」，不再發出任何事件。
5. **Given** O1 為「處理中」，**When** 收到 O1 的 `StockReserved`、`StockReleased`、`PaymentRefunded`、`OrderPlaced`、`OrderCancelled`（訂單服務不關心或自己發出的事件），**Then** O1 狀態不變，回傳空的事件清單。
6. **Given** 已存在 O1，**When** 再次以相同訂單編號 O1 下單，**Then** 下單失敗、理由為 `DUPLICATE_ORDER`，O1 原狀態不變，不發出事件。
7. **Given** 尚無訂單，**When** 下單的數量或金額不是正整數（0、負數、小數），**Then** 下單失敗、理由為 `INVALID_INPUT`，不建立訂單、不發出事件。
7a. **Given** 尚無訂單，**When** 下單的訂單編號、顧客或 SKU 為空字串，**Then** 下單失敗、理由為 `INVALID_INPUT`，不建立訂單、不發出事件。
7b. **Given** O1 為「處理中」且訂單金額為 100，**When** 收到 O1 的 `PaymentSucceeded`（amount=90，與訂單不符），**Then** O1 仍變為「已確認」（訂單服務不比對金額）。
8. **Given** 尚無訂單 O9，**When** 查詢 O9，**Then** 回傳「不存在」。

---

### User Story 2 - 顧客取消訂單 (Priority: P2)

顧客對一張訂單提出取消。訂單服務把訂單標為「已取消（顧客）」並對外宣告「訂單已取消」，讓庫存服務放回庫存、付款服務退款。

**Why this priority**: 取消是顧客能主動執行的唯一另一個動作，且牽動另外兩個服務的補償流程。

**Independent Test**: 下單後呼叫取消，檢查狀態、取消原因與發出的 `OrderCancelled`；再餵入其他服務的回應事件確認狀態不被改寫。

**Acceptance Scenarios**:

1. **Given** O1 為「處理中」，**When** 顧客取消 O1，**Then** 取消成功，O1 變為「已取消」、取消原因為「顧客」，並發出一個 `OrderCancelled`（orderId=O1）。
2. **Given** O1 為「已確認」，**When** 顧客取消 O1，**Then** 取消成功，O1 變為「已取消」、取消原因為「顧客」，並發出一個 `OrderCancelled`（orderId=O1）；由付款服務依此退款。
3. **Given** O1 為「已取消」、「庫存不足」或「付款失敗」，**When** 顧客取消 O1，**Then** 取消失敗、理由為 `NOT_CANCELLABLE`，狀態與取消原因不變，不發出事件。
4. **Given** 尚無訂單 O9，**When** 顧客取消 O9，**Then** 取消失敗、理由為 `ORDER_NOT_FOUND`，不發出事件。

---

### User Story 3 - 15 分鐘未完成付款自動取消 (Priority: P2)

下單後 15 分鐘內沒有收到付款成功的訂單，在時間推進到期限之後自動取消，取消原因為「逾時」，並對外宣告「訂單已取消」。

**Why this priority**: 這是保護庫存不被長期佔用的機制，是需求明文的自動行為。

**Independent Test**: 下單後以 `tick` 推進時間，檢查在期限前不取消、期限後取消並發出 `OrderCancelled`；再確認已付款/已取消的訂單不受影響。

**Acceptance Scenarios**:

1. **Given** O1 於 T0 下單且為「處理中」，**When** 時間推進到 T0 + 14 分 59 秒，**Then** O1 仍為「處理中」，不發出事件。
2. **Given** O1 於 T0 下單且為「處理中」，**When** 時間推進到 T0 + 15 分 01 秒，**Then** O1 變為「已取消」、取消原因為「逾時」，並發出一個 `OrderCancelled`（orderId=O1）。
3. **Given** O1 於 T0 下單且為「處理中」，**When** 時間推進到恰好 T0 + 15 分 00 秒，**Then** O1 變為「已取消」、取消原因為「逾時」，並發出一個 `OrderCancelled`（now − 下單時間 ≥ 15 分鐘即逾時）。
4. **Given** O1 已為「已確認」、「庫存不足」、「付款失敗」或「已取消」，**When** 時間推進超過 15 分鐘，**Then** 狀態不變，不發出事件。
5. **Given** O1 與 O2 皆逾時，**When** 時間一次推進超過兩者期限，**Then** 兩張都取消，各發出一個 `OrderCancelled`。
6. **Given** O1 已因逾時取消，**When** 時間再次推進，**Then** 不重複發出 `OrderCancelled`。
7. **Given** O1 於 T0 下單，**When** 時間推進到 T0 + 20 分後再推進到 T0 + 5 分（時間倒退），**Then** 第二次推進不改變任何狀態、不發出事件。

---

### User Story 4 - 事件重複與亂序送達 (Priority: P1)

事件傳遞至少一次、可能重複、不保證順序。訂單服務處理同一事件多次時結果必須與處理一次相同；「已取消」「庫存不足」「付款失敗」是終態，之後收到的任何事件都不能改變狀態；「已確認」只會因顧客取消而改變，不會被任何事件改變。

**Why this priority**: 需求第 8 點明文要求；若做錯會在整合後出現狀態來回跳動或重複退款。

**Independent Test**: 對同一張訂單重複餵入同一事件、以不同順序餵入事件，檢查狀態只變一次且不再發事件。

**Acceptance Scenarios**:

1. **Given** O1 為「處理中」，**When** 收到同一個 `PaymentSucceeded`（相同事件 id）兩次，**Then** O1 為「已確認」，第二次回傳空事件清單。
2. **Given** O1 為「已確認」，**When** 之後收到 O1 的 `StockRejected` 或 `PaymentFailed`，**Then** O1 仍為「已確認」，回傳空事件清單。
2a. **Given** O1 已因逾時為「已取消」，**When** 之後收到 O1 的 `PaymentSucceeded`，**Then** O1 仍為「已取消」、取消原因仍為「逾時」，回傳空事件清單（退款由付款服務依 `OrderCancelled` 處理）。
2b. **Given** O1 為「庫存不足」或「付款失敗」，**When** 之後收到 O1 的 `PaymentSucceeded`，**Then** 狀態不變，回傳空事件清單。
3. **Given** O1 為「處理中」，**When** 先收到 `PaymentSucceeded` 再收到 `StockReserved`（亂序），**Then** O1 為「已確認」。
4. **Given** 尚無訂單 O9，**When** 收到 O9 的 `PaymentSucceeded` / `StockRejected` / `PaymentFailed`（事件比下單先到或訂單不屬於本服務），**Then** 回傳空事件清單，不建立訂單。
5. **Given** O1 為「已取消（顧客）」，**When** 收到 O1 的 `PaymentFailed` 或 `StockRejected`，**Then** O1 仍為「已取消」、取消原因仍為「顧客」，回傳空事件清單。

---

### Edge Cases

- 同一訂單編號重複下單：拒絕，原訂單不受影響（US1-6）。
- 數量／金額為 0、負數、非整數，或訂單編號／顧客／SKU 為空字串：拒絕 `INVALID_INPUT`（US1-7、US1-7a）。
- `PaymentSucceeded` 金額與訂單不符：仍確認（US1-7b）。
- 查詢、取消、事件針對不存在的訂單：查詢回「不存在」，取消失敗，事件忽略（US1-8、US2-4、US4-4）。
- 時間倒退的 `tick`：忽略（US3-7）。
- 多張訂單同時逾時：全部取消（US3-5）。
- 逾時取消與顧客取消先後發生：第一個取消生效，第二個不生效、不重複發事件（US2-3、US3-6）。
- 已確認後顧客取消：允許，之後再收到任何事件皆不改變「已取消」（US2-2、US4-5）。
- 事件 id 必須全系統唯一：訂單服務產生的每個事件 id 皆不同、且帶服務前綴以避免與其他服務碰撞。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 接受下單（訂單編號、顧客、SKU、數量、金額、時間），建立狀態為「處理中」（`PENDING`）的訂單，並發出一個內容與輸入一致的 `OrderPlaced` 事件。【需求 1】
- **FR-002**: 系統 MUST 拒絕下單並回傳失敗與理由、不建立訂單、不發事件：訂單編號已存在 → `DUPLICATE_ORDER`；數量或金額不是正整數、或訂單編號／顧客／SKU 為空字串 → `INVALID_INPUT`。輸入驗證先於重複檢查執行。【需求 9、Clarification C1/C2】
- **FR-003**: 系統 MUST 在收到 `PaymentSucceeded` 時把「處理中」的訂單變為「已確認」（`CONFIRMED`），不比對事件金額與訂單金額；收到 `StockRejected` 時變為「庫存不足」（`REJECTED`）；收到 `PaymentFailed` 時變為「付款失敗」（`FAILED`）。這些狀態變更不發出事件。【需求 4、Clarification C4】
- **FR-004**: 系統 MUST 對不關心的事件類型（`OrderPlaced`、`StockReserved`、`StockReleased`、`PaymentRefunded`、`OrderCancelled`）回傳空事件清單且不改狀態。【技術介面】
- **FR-005**: 系統 MUST 讓顧客取消「處理中」或「已確認」的訂單：狀態變為「已取消」（`CANCELLED`）、取消原因為「顧客」（`CUSTOMER`），並發出一個 `OrderCancelled`。【需求 6、Clarification Q1】
- **FR-006**: 系統 MUST 拒絕取消不存在的訂單（理由 `ORDER_NOT_FOUND`），以及已為「已取消」「庫存不足」「付款失敗」的訂單（理由 `NOT_CANCELLABLE`）；回傳失敗與理由，不改狀態、不發事件。【Clarification Q1】
- **FR-007**: 系統 MUST 在時間推進（`tick(now)`）時，以訂單服務當下的狀態判定：仍為「處理中」且 now − 下單時間 ≥ 15 分鐘的訂單自動取消：狀態「已取消」、取消原因「逾時」（`TIMEOUT`），並為每張逾時訂單發出一個 `OrderCancelled`。恰好 15 分 00 秒即視為逾時。【需求 7、Clarification Q2】
- **FR-008**: 系統 MUST 只在 `tick` 時判定逾時；時間只來自呼叫方傳入的 ISO 8601 字串，不讀取系統時鐘。`tick` 傳入的時間早於先前已推進到的時間時 MUST 不產生任何效果。
- **FR-009**: 系統 MUST 對同一事件（相同事件 id）的重複送達保持冪等：狀態只變一次、重複送達回傳空事件清單。【需求 8】
- **FR-010**: 「已取消」「庫存不足」「付款失敗」為終態：系統 MUST 在訂單到達終態後，對後續到達的任何事件保持狀態與取消原因不變、回傳空事件清單。「已確認」MUST 不被任何事件改變，只能因顧客取消（FR-005）變為「已取消」。【需求 8、Clarification Q3】
- **FR-011**: 系統 MUST 忽略針對不存在訂單的結果事件（回傳空清單、不建立訂單）。
- **FR-012**: 系統 MUST 為每個自己發出的事件產生全系統唯一的 id。【技術介面】
- **FR-013**: 系統 MUST 提供查詢：回傳訂單目前狀態與（若已取消）取消原因；不存在則回「不存在」。
- **FR-014**: 系統 MUST 只保存自己的訂單狀態，不呼叫或讀取庫存／付款服務。【需求、技術介面】

### Key Entities

- **訂單（Order）**：訂單編號（唯一）、顧客、SKU、數量（正整數）、金額（正整數）、下單時間、狀態（處理中／已確認／庫存不足／付款失敗／已取消）、取消原因（顧客／逾時，僅已取消時有值）。
  - 狀態轉移：處理中 →(`PaymentSucceeded`) 已確認；處理中 →(`StockRejected`) 庫存不足；處理中 →(`PaymentFailed`) 付款失敗；處理中／已確認 →(顧客取消) 已取消(顧客)；處理中 →(逾時) 已取消(逾時)。終態：已取消、庫存不足、付款失敗。
- **事件（Event）**：訂單服務發出 `OrderPlaced`、`OrderCancelled`；消費 `PaymentSucceeded`、`StockRejected`、`PaymentFailed`；忽略其他。每個事件有全系統唯一 id。
- **已處理事件 id 集合**：用於辨識重複送達。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 需求第 1、4、6、7 點對訂單服務的每一條行為都有對應的驗收情境，且 100% 自動化通過。
- **SC-002**: 對任何結果事件重複送達 2 次以上，訂單狀態與只送達 1 次時完全相同，且不多發任何事件（0 個額外事件）。
- **SC-003**: 任何一張「處理中」訂單在時間推進超過期限後，於同一次推進內被取消並恰好發出 1 個 `OrderCancelled`；已到終態的訂單在時間推進後 0 次改變。
- **SC-004**: 整合人員只需把 `src/order.ts` 放進專案即可接上，不需修改任何共用檔案（0 個共用檔案變更）。
- **SC-005**: 所有非法輸入（重複編號、非正整數數量／金額、不存在訂單）100% 以失敗結果回報，不拋出例外。

## Assumptions

- 訂單服務只在 `tick` 判定逾時；`placeOrder`、`cancelOrder`、`handle` 不觸發逾時判定（`handle` 沒有時間參數，為保持一致，其他命令亦不判定）。
- 顧客在期限後、`tick` 尚未推進前取消訂單：視為顧客取消（原因「顧客」）。【Clarification C3 確認】
- `PaymentSucceeded` 的金額與訂單金額不符時仍確認（工程師依 C4 授權決定）。
- 15 分鐘以下單輸入的 `at` 時間起算，不以服務收到的時間起算。
- 「處理中」訂單是唯一會逾時的狀態；「已確認」「庫存不足」「付款失敗」「已取消」不會逾時取消。
- 訂單服務不需要知道庫存是否已保留（`StockReserved` 忽略），只以付款結果判定確認。
- 重複送達以事件 id 辨識；同一訂單收到兩個不同 id 但同類型的事件，視為不同事件，但因 FR-010 的狀態規則而不會再改變狀態。
- 下單時的訂單編號、顧客、SKU 若為空字串則拒絕（`INVALID_INPUT`）；時間為合法 ISO 8601 字串（由呼叫方保證，不驗證）。
- 事件 id 以 `order-` 前綴加上服務內遞增序號，確保與其他服務不碰撞。
- 開發期間庫存／付款服務為空殼，測試自行構造這兩個服務會送來的事件。
