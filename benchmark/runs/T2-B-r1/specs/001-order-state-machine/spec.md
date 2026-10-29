# Feature Specification: 訂單狀態機（Order State Machine）

**Feature Branch**: `001-order-state-machine`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "需求：訂單狀態機 — 訂單建立後為「已建立」且金額必須大於 0；已建立可付款（金額需等於訂單金額）→「已付款」；已付款可出貨 →「已出貨」；已建立或已付款可取消 →「已取消」，已付款取消需退還全部已付金額；已出貨可申請退款，可分多次，累計不得超過已付金額，累計達已付金額時 →「已退款」；每次操作成功回傳更新後訂單，失敗回傳失敗原因。技術介面固定於 src/order.ts（OrderStatus / Order / OrderResult / createOrder / pay / ship / cancel / refund），全部純函式，金額為整數元。"

## Clarifications

### Session 2026-10-20

- Q: 已出貨的訂單可以取消嗎？ → A: 不可以，拒絕，reason 為 `INVALID_TRANSITION`。
- Q: 已付款但尚未出貨的訂單可以直接申請退款嗎？ → A: 不可以，要走取消；reason 為 `INVALID_TRANSITION`。
- Q: 已取消或已退款的訂單，之後任何操作（付款、出貨、取消、退款）都要一律拒絕嗎？ → A: 是，全部拒絕，reason 為 `INVALID_TRANSITION`。
- Q: 單次退款金額超過剩餘可退金額時，整筆拒絕還是自動截斷？ → A: 整筆拒絕不截斷，reason 為 `REFUND_EXCEEDS_PAID`。
- Q: 建立訂單時需要驗證識別碼嗎（例如空字串要拒絕嗎）？ → A: 需求方交由執行者決定；採「不驗證，任何字串都接受」。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 建立訂單並付款 (Priority: P1)

商家（或系統呼叫端）為一筆交易建立訂單，訂單一開始處於「已建立」狀態；買方付款時，付款金額必須剛好等於訂單金額，付款成功後訂單進入「已付款」並記錄已付金額。

**Why this priority**: 建立與付款是所有後續流程（出貨、取消、退款）的前提，沒有它整個狀態機沒有起點；單獨實作即可交付「可建單、可收款」的最小可用價值。

**Independent Test**: 只實作建立與付款，就能驗證「金額 ≤ 0 建單失敗」、「付款金額不等於訂單金額失敗」、「正確付款後狀態為已付款」。

**Acceptance Scenarios**:

1. **Given** 無訂單, **When** 以 id `o-1`、金額 100 建立訂單, **Then** 成功，回傳訂單狀態為 `CREATED`、amount 100、paidAmount 0、refundedAmount 0。
2. **Given** 無訂單, **When** 以金額 0 建立訂單, **Then** 失敗並回傳失敗原因。
3. **Given** 無訂單, **When** 以金額 -5 建立訂單, **Then** 失敗並回傳失敗原因。
4. **Given** 狀態 `CREATED`、金額 100 的訂單, **When** 付款 100, **Then** 成功，回傳訂單狀態 `PAID`、paidAmount 100。
5. **Given** 狀態 `CREATED`、金額 100 的訂單, **When** 付款 99, **Then** 失敗並回傳失敗原因；原訂單物件未被修改。
6. **Given** 狀態 `CREATED`、金額 100 的訂單, **When** 付款 101, **Then** 失敗並回傳失敗原因。
7. **Given** 狀態 `PAID` 的訂單, **When** 再次付款 100, **Then** 失敗並回傳失敗原因（已付款訂單不可重複付款）。

---

### User Story 2 - 出貨 (Priority: P2)

已付款的訂單可以出貨；出貨後訂單進入「已出貨」。其他狀態的訂單不可出貨。

**Why this priority**: 出貨是正常履約路徑的下一步，也是進入退款流程的前提。

**Independent Test**: 以一筆已付款訂單呼叫出貨，驗證狀態變為已出貨；以已建立／已取消訂單呼叫出貨，驗證失敗。

**Acceptance Scenarios**:

1. **Given** 狀態 `PAID` 的訂單, **When** 出貨, **Then** 成功，回傳訂單狀態 `SHIPPED`，金額欄位不變。
2. **Given** 狀態 `CREATED` 的訂單, **When** 出貨, **Then** 失敗並回傳失敗原因。
3. **Given** 狀態 `SHIPPED` 的訂單, **When** 再次出貨, **Then** 失敗並回傳失敗原因。

---

### User Story 3 - 取消訂單（含已付款退還） (Priority: P2)

已建立或已付款的訂單可以取消，取消後進入「已取消」。若取消的是已付款訂單，系統必須退還全部已付金額。

**Why this priority**: 取消是最常見的例外路徑；已付款取消牽涉金錢退還，正確性影響財務。

**Independent Test**: 分別取消已建立與已付款訂單，驗證狀態與金額欄位；取消已出貨／已取消訂單驗證失敗。

**Acceptance Scenarios**:

1. **Given** 狀態 `CREATED` 的訂單, **When** 取消, **Then** 成功，回傳訂單狀態 `CANCELLED`、paidAmount 0、refundedAmount 0。
2. **Given** 狀態 `PAID`、paidAmount 100 的訂單, **When** 取消, **Then** 成功，回傳訂單狀態 `CANCELLED`，paidAmount 保留 100、refundedAmount 設為 100（等於 paidAmount），反映已退還全部已付金額。
3. **Given** 狀態 `SHIPPED` 的訂單, **When** 取消, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`（已出貨不可取消，應走退款）。
4. **Given** 狀態 `CANCELLED` 的訂單, **When** 再次取消, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`。
5. **Given** 狀態 `REFUNDED` 的訂單, **When** 取消, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`。

---

### User Story 4 - 已出貨訂單分次退款 (Priority: P3)

已出貨的訂單可以申請退款；退款可以分多次進行，累計退款金額不得超過已付金額；當累計退款金額剛好達到已付金額時，訂單進入「已退款」。

**Why this priority**: 退款是售後流程，建立在前三個故事之上；分次與上限規則是本故事最需精確驗證之處。

**Independent Test**: 對一筆已出貨、已付 100 的訂單連續退 30、70，驗證中途狀態仍為已出貨、累計達 100 時變為已退款；再退任何金額失敗。

**Acceptance Scenarios**:

1. **Given** 狀態 `SHIPPED`、paidAmount 100、refundedAmount 0 的訂單, **When** 退款 30, **Then** 成功，回傳訂單狀態仍為 `SHIPPED`、refundedAmount 30。
2. **Given** 狀態 `SHIPPED`、paidAmount 100、refundedAmount 30 的訂單, **When** 退款 70, **Then** 成功，回傳訂單狀態 `REFUNDED`、refundedAmount 100。
3. **Given** 狀態 `SHIPPED`、paidAmount 100、refundedAmount 0 的訂單, **When** 退款 100, **Then** 成功，回傳訂單狀態 `REFUNDED`、refundedAmount 100。
4. **Given** 狀態 `SHIPPED`、paidAmount 100、refundedAmount 30 的訂單, **When** 退款 71, **Then** 失敗並回傳失敗原因 `REFUND_EXCEEDS_PAID`（累計 101 超過已付 100），整筆拒絕不截斷，訂單不變。
5. **Given** 狀態 `SHIPPED`、paidAmount 100 的訂單, **When** 退款 0 或負數, **Then** 失敗並回傳失敗原因 `INVALID_AMOUNT`，訂單不變。（非整數金額亦視為無效金額，同樣回傳 `INVALID_AMOUNT`。）
6. **Given** 狀態 `PAID`（尚未出貨）的訂單, **When** 退款 50, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`（未出貨訂單應走取消，不可退款）。
7. **Given** 狀態 `REFUNDED` 的訂單, **When** 退款 1, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`。
8. **Given** 狀態 `CREATED` 或 `CANCELLED` 的訂單, **When** 退款, **Then** 失敗並回傳失敗原因 `INVALID_TRANSITION`。

---

### Edge Cases

- 建立訂單金額為 0、負數：必須失敗。
- 建立訂單金額為非整數（如 10.5）：視為無效金額而失敗（金額皆為整數元）。
- 付款金額與訂單金額不符（過多或過少）：失敗，訂單不變。
- 對終態（`CANCELLED`、`REFUNDED`）訂單做任何操作（付款、出貨、取消、退款）：一律失敗，reason 為 `INVALID_TRANSITION`。
- 訂單識別碼不做驗證：空字串或任意字串皆接受；建立訂單只可能因金額而失敗。
- 退款使累計恰好等於已付金額：成功且狀態轉為 `REFUNDED`；超過一元即失敗。
- 任何失敗都不得改變傳入的訂單；任何成功都回傳新物件，傳入物件保持原值（純函式）。
- 失敗原因的格式：固定英文代碼，共四種：`INVALID_AMOUNT`（金額不合法）、`AMOUNT_MISMATCH`（付款金額不等於訂單金額）、`INVALID_TRANSITION`（目前狀態不允許此操作）、`REFUND_EXCEEDS_PAID`（累計退款超過已付金額）。
- 多重錯誤同時存在時的優先序：先檢查狀態（`INVALID_TRANSITION`）→ 再檢查金額合法性（`INVALID_AMOUNT`）→ 最後做金額比對（`AMOUNT_MISMATCH` / `REFUND_EXCEEDS_PAID`）。例如對已取消訂單付款 -1，回傳 `INVALID_TRANSITION`。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 允許以識別碼與金額建立訂單；成功後訂單狀態為「已建立」，已付金額與累計退款金額皆為 0。
- **FR-002**: 系統 MUST 拒絕金額不大於 0 的建單請求，並回傳失敗原因。
- **FR-003**: 系統 MUST 允許「已建立」訂單付款；付款金額 MUST 等於訂單金額，成功後狀態為「已付款」、已付金額等於訂單金額。
- **FR-004**: 系統 MUST 拒絕付款金額不等於訂單金額的付款，以及非「已建立」狀態訂單的付款，並回傳失敗原因。
- **FR-005**: 系統 MUST 允許「已付款」訂單出貨，成功後狀態為「已出貨」；其他狀態出貨 MUST 失敗。
- **FR-006**: 系統 MUST 允許「已建立」或「已付款」訂單取消，成功後狀態為「已取消」；其他狀態取消 MUST 失敗。
- **FR-007**: 取消「已付款」訂單時，系統 MUST 退還全部已付金額：成功後狀態為「已取消」、paidAmount 保留原值、refundedAmount 設為等於 paidAmount。取消「已建立」訂單時 paidAmount 與 refundedAmount 皆為 0。
- **FR-008**: 系統 MUST 允許「已出貨」訂單申請退款，可分多次；每次退款後累計退款金額 MUST 不超過已付金額，超過者整筆退款 MUST 失敗（不接受部分成功）。
- **FR-009**: 當累計退款金額等於已付金額時，系統 MUST 將訂單狀態改為「已退款」；未達時狀態維持「已出貨」。
- **FR-010**: 非「已出貨」狀態的訂單申請退款 MUST 失敗。
- **FR-011**: 每次操作成功 MUST 回傳更新後的訂單；失敗 MUST 回傳失敗原因，失敗原因 MUST 為下列固定代碼之一：`INVALID_AMOUNT`、`AMOUNT_MISMATCH`、`INVALID_TRANSITION`、`REFUND_EXCEEDS_PAID`。
- **FR-015**: 失敗原因的判定順序 MUST 為：狀態檢查（`INVALID_TRANSITION`）→ 金額合法性（`INVALID_AMOUNT`：非正整數）→ 金額比對（付款：`AMOUNT_MISMATCH`；退款：`REFUND_EXCEEDS_PAID`）。
- **FR-012**: 所有操作 MUST 為純函式：不修改傳入的訂單，成功時回傳新的訂單物件。
- **FR-013**: 所有金額 MUST 為整數元。
- **FR-014**: 對外介面 MUST 完全採用需求中固定的名稱與型別（`src/order.ts` 匯出 `OrderStatus`、`Order`、`OrderResult`、`createOrder`、`pay`、`ship`、`cancel`、`refund`），不得更名。

### Key Entities

- **Order（訂單）**: 一筆交易紀錄。屬性：`id`（識別碼）、`status`（狀態：CREATED／PAID／SHIPPED／CANCELLED／REFUNDED）、`amount`（訂單金額）、`paidAmount`（已付金額）、`refundedAmount`（累計退款金額）。
- **OrderResult（操作結果）**: 操作的回傳值；成功時帶更新後的訂單，失敗時帶失敗原因。
- **狀態轉移**: CREATED →(pay)→ PAID →(ship)→ SHIPPED →(refund 累計達已付)→ REFUNDED；CREATED／PAID →(cancel)→ CANCELLED。CANCELLED 與 REFUNDED 為終態。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 需求 1–8 的每一條規則都至少有一個可執行的驗收情境對應，且 100% 通過。
- **SC-002**: 所有非法轉移（每個狀態 × 每個不允許的操作）100% 被拒絕並附失敗原因。
- **SC-003**: 任一操作（成功或失敗）之後，傳入的訂單物件 100% 與呼叫前相同（純函式驗證）。
- **SC-004**: 分次退款情境下，累計退款金額永遠 ≤ 已付金額，且恰好相等時狀態 100% 為「已退款」。
- **SC-005**: 以專案標準測試指令一次執行全部驗收情境，零失敗、零未定義步驟。

## Assumptions

- 訂單識別碼由呼叫端提供，本功能不驗證其內容與唯一性，也不做持久化；狀態機只作用於傳入的訂單值。
- 訂單金額、付款金額、退款金額皆為整數元；非整數視為無效金額（`INVALID_AMOUNT`）。
- 付款必須一次付清，不支援部分付款或多次付款。
- （以下已於 Clarifications 確認）「已取消」與「已退款」為終態；已出貨不可取消；已付款未出貨不可退款；超額退款整筆拒絕。
- 本功能不處理並行、時間、通知或外部金流呼叫；「退還」僅反映在訂單紀錄上。
