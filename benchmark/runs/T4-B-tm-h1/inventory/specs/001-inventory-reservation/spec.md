# Feature Specification: 庫存服務（事件驅動下單流程）

**Feature Branch**: `001-inventory-reservation`（未建立 git 分支，目錄即識別）

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "事件驅動下單流程（訂單、庫存、付款三個服務）— 團隊版。本次只負責庫存服務（src/inventory.ts）。庫存服務收到 OrderPlaced 後保留庫存：庫存足夠發出 StockReserved，不夠發出 StockRejected；付款失敗時放回保留的庫存並發出 StockReleased；訂單取消（OrderCancelled）時放回保留的庫存。事件可能重複且不保證順序。所有金額與數量為整數。服務只保存自己的狀態，不接資料庫或網路。"

## Clarifications

### Session 2026-11-01

- Q: 取消（OrderCancelled）先於 OrderPlaced 抵達，之後到的 OrderPlaced 怎麼處理？ → A: 庫存服務記住該訂單已取消；之後到的 OrderPlaced 不保留庫存、不發任何事件。
- Q: 訂單取消放回庫存時是否回傳 StockReleased？ → A: 是。只放回實際保留的數量，同一訂單最多放回一次；沒保留過（被拒或尚未收到下單）就不加庫存、不發 StockReleased。
- Q: 同一事件（同 `id`）重複送達時怎麼處理？ → A: 第二次起直接忽略，不改任何狀態、不發任何事件。
- Q: 同一訂單先被拒絕（StockRejected）後，不同 `id` 的重複 OrderPlaced 到達時怎麼處理？ → 自行決定（最佳判斷，見下方假設）：維持第一次的決定，仍為拒絕，不保留、不發事件。

## Scope

本功能範圍僅限於「庫存服務」。訂單服務與付款服務由同事平行開發，本功能不實作、不修改它們，也不讀取它們的狀態。庫存服務只能透過接收事件與回傳事件溝通。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 下單時保留庫存 (Priority: P1)

當庫存服務收到一筆 `OrderPlaced`（含商品 SKU 與數量）時，若該 SKU 目前可供保留的庫存足夠，就保留對應數量並發出 `StockReserved`；若不足，就不做任何保留並發出 `StockRejected`。

**Why this priority**: 這是下單流程的核心，沒有它後續的付款流程無從開始。

**Independent Test**: 只對庫存服務送入 `OrderPlaced` 事件，檢查回傳事件與可用庫存數量即可驗證，不需要其他服務。

**Acceptance Scenarios**:

1. **Given** SKU `A` 的可用庫存為 10，**When** 收到數量為 3 的 `OrderPlaced`，**Then** 回傳 `StockReserved`（同一 `orderId`），且 SKU `A` 的可用庫存變為 7。
2. **Given** SKU `A` 的可用庫存為 2，**When** 收到數量為 3 的 `OrderPlaced`，**Then** 回傳 `StockRejected`（同一 `orderId`），且 SKU `A` 的可用庫存維持 2。
3. **Given** SKU `A` 的可用庫存恰好為 3，**When** 收到數量為 3 的 `OrderPlaced`，**Then** 回傳 `StockReserved`，可用庫存變為 0。

---

### User Story 2 - 付款失敗時放回庫存 (Priority: P1)

當庫存服務收到 `PaymentFailed` 時，若該訂單有保留的庫存，就把這張訂單保留的數量全部放回，並發出 `StockReleased`。

**Why this priority**: 這是補償流程的一部分，避免付款失敗後庫存永久被佔用。

**Independent Test**: 先送入 `OrderPlaced` 使其保留成功，再送入 `PaymentFailed`，檢查可用庫存是否回到原值且回傳 `StockReleased`。

**Acceptance Scenarios**:

1. **Given** 訂單 `O1` 已保留 SKU `A` 數量 3（可用庫存為 7），**When** 收到 `PaymentFailed`（`orderId` 為 `O1`），**Then** 回傳 `StockReleased`，可用庫存變為 10。
2. **Given** 訂單 `O1` 從未保留成功（曾收到 `StockRejected` 的情況），**When** 收到 `PaymentFailed`，**Then** 可用庫存不變，且不回傳 `StockReleased`。

---

### User Story 3 - 訂單取消時放回庫存 (Priority: P2)

當庫存服務收到 `OrderCancelled` 時，若該訂單有保留的庫存，就把保留的數量放回。

**Why this priority**: 顧客取消訂單是常見操作，必須正確還原庫存；優先序低於 P1，因為它不影響核心下單與補償路徑。

**Independent Test**: 先保留成功，再送入 `OrderCancelled`，檢查可用庫存是否回到原值。

**Acceptance Scenarios**:

1. **Given** 訂單 `O1` 已保留 SKU `A` 數量 3（可用庫存為 7），**When** 收到 `OrderCancelled`（`orderId` 為 `O1`），**Then** 可用庫存變為 10。
2. **Given** 訂單 `O1` 從未保留成功，**When** 收到 `OrderCancelled`，**Then** 可用庫存不變。

---

### User Story 4 - 重複與亂序事件的穩健性 (Priority: P2)

事件可能重複送達，也可能亂序抵達。同一訂單的 `OrderPlaced` 重複送達時，庫存只能保留一次；`OrderCancelled` 比 `OrderPlaced` 先抵達時，之後才到的 `OrderPlaced` 不得再保留庫存。

**Why this priority**: 需求明定事件語意會重複與亂序，錯誤處理會直接造成庫存錯帳。

**Independent Test**: 對同一 `orderId` 連續送入兩次 `OrderPlaced`，或先送 `OrderCancelled` 再送 `OrderPlaced`，檢查可用庫存是否只變動一次（或完全不變）。

**Acceptance Scenarios**:

1. **Given** SKU `A` 可用庫存為 10，**When** 連續兩次收到 `orderId` 為 `O1`、數量為 3 的 `OrderPlaced`，**Then** 可用庫存只減少 3（變為 7）。
2. **Given** 訂單 `O1` 的 `OrderCancelled` 先於 `OrderPlaced` 抵達，**When** 之後收到 `O1` 的 `OrderPlaced`，**Then** 可用庫存不變（不保留），且不回傳任何事件。庫存服務 MUST 記住該訂單已取消（見 FR-004a）。

---

### User Story 5 - 忽略不相關的事件 (Priority: P3)

庫存服務對與它無關的事件類型（例如 `PaymentSucceeded`、`StockReserved`）回傳空陣列，不改變任何狀態。

**Why this priority**: 這是事件廣播機制的基本要求，但不影響業務邏輯。

**Independent Test**: 送入各種無關事件，檢查回傳為空陣列且可用庫存不變。

**Acceptance Scenarios**:

1. **Given** 任意庫存狀態，**When** 收到 `PaymentSucceeded`，**Then** 回傳空陣列，可用庫存不變。

---

### Edge Cases

- 數量為 0 或負數的 `OrderPlaced`：不保留，回傳 `StockRejected`。
- SKU 不在初始庫存表中：視為可用庫存 0，回傳 `StockRejected`。
- 初始庫存為 0 的 SKU：任何數量的 `OrderPlaced` 都回傳 `StockRejected`。
- 同一訂單的 `PaymentFailed` 與 `OrderCancelled` 都抵達（順序不定）：庫存只放回一次，不得重複放回。
- 放回庫存後，可用庫存不得超過該 SKU 的初始庫存數量（不得因重複放回而超額）。
- 不同訂單的保留與放回互不影響。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 在收到 `OrderPlaced` 時，若可用庫存 ≥ 數量，保留該數量並回傳 `StockReserved`（含同一 `orderId`）。
- **FR-002**: 系統 MUST 在收到 `OrderPlaced` 時，若可用庫存 < 數量，不保留任何庫存並回傳 `StockRejected`（含同一 `orderId`）。
- **FR-003**: 系統 MUST 在收到 `PaymentFailed` 且該訂單有保留庫存時，把該訂單保留的數量全部放回，並回傳 `StockReleased`（含同一 `orderId`）。
- **FR-004**: 系統 MUST 在收到 `OrderCancelled` 且該訂單有保留庫存時，把該訂單實際保留的數量放回，並回傳 `StockReleased`（含同一 `orderId`）。
- **FR-004a**: 系統 MUST 記住已取消的訂單；之後收到同一 `orderId` 的 `OrderPlaced` 時，不保留庫存、不回傳任何事件。
- **FR-004b**: 同一訂單的放回（不論由 `PaymentFailed` 或 `OrderCancelled` 觸發）最多發生一次；沒有保留過（被拒、或尚未收到下單）的訂單收到 `PaymentFailed` 或 `OrderCancelled` 時，不加庫存、不發 `StockReleased`。
- **FR-005**: 系統 MUST 對同一 `orderId` 的 `OrderPlaced` 保持冪等：一個訂單的第一次處理結果（保留或拒絕）即為最終結果，之後不同 `id` 的 `OrderPlaced` 不改變結果、不回傳事件。同一事件 `id` 重複送達時，第二次起直接忽略，不改任何狀態、不發任何事件。
- **FR-006**: 系統 MUST 對同一訂單的放回操作保持冪等：同一訂單保留的數量只能放回一次。
- **FR-007**: 系統 MUST 只放回「該訂單實際保留的數量」，不得放回超過保留量的庫存，也不得使可用庫存超過初始庫存。
- **FR-008**: 系統 MUST 對沒有保留紀錄的訂單收到 `PaymentFailed` 或 `OrderCancelled` 時，不改變庫存、不回傳 `StockReleased`。
- **FR-009**: 系統 MUST 提供 `getAvailable(sku)`，回傳該 SKU 目前可供保留的庫存數量。
- **FR-010**: 系統 MUST 只保存自己的狀態（SKU 庫存與訂單保留紀錄），在記憶體中運作，不讀寫其他服務的狀態。
- **FR-011**: 系統 MUST 對與庫存無關的事件類型回傳空陣列且不改變狀態。
- **FR-012**: 系統 MUST 為每個回傳的事件產生全系統唯一的 `id`，且時間資訊遵循 ISO 8601 字串（若事件需要時間）。
- **FR-013**: 系統 MUST 把所有數量視為整數；非整數數量視為無效輸入，回傳 `StockRejected`。

### Key Entities

- **SKU 庫存**: 每個商品 SKU 的目前可供保留數量，初始值由建立服務時提供。
- **訂單保留紀錄**: 每張訂單保留了哪個 SKU、保留多少數量，以及該保留是否已被放回。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 所有 User Story 的 Acceptance Scenarios 都能以自動化測試驗證並全部通過。
- **SC-002**: 同一訂單的 `OrderPlaced` 重複送達 N 次（N ≥ 2）時，可用庫存的變動量永遠等於單次送達。
- **SC-003**: 任意順序送入 `PaymentFailed` 與 `OrderCancelled`（包含重複），可用庫存的最終值與只送一次時相同。
- **SC-004**: 庫存服務在無任何其他服務存在下，單獨即可完成所有上述情境的驗證。

## Assumptions

- 付款成功（`PaymentSucceeded`）後，已保留的庫存維持被佔用狀態，不另行放回；只有付款失敗或訂單取消才會放回。
- 初始庫存在服務建立時一次給定，服務執行期間不補貨。
- 「訂單保留紀錄」只需在記憶體中維持，不需持久化。
- 亂序或重複事件的判斷只依 `orderId`，不依事件 `id`。
- 數量與金額皆為整數；金額與庫存服務無關，庫存服務不檢查金額。
- 庫存服務自行產生的事件 `id` 由服務內部產生，只需保證本次執行內唯一。
- 訂單服務的 15 分鐘逾時取消不屬於庫存服務範圍，庫存服務只對收到的 `OrderCancelled` 作出反應。
- 依需求，本範圍不包含 `order` 與 `payment` 服務的任何實作。
- 同一訂單先被拒絕後，即使之後庫存足夠，不同 `id` 的重複 OrderPlaced 仍維持拒絕（自行決定，依 FR-005 的「第一次結果為最終結果」）。
