# Research: 事件驅動下單流程

本檔記錄 Phase 0 的設計決策。規格中沒有 NEEDS CLARIFICATION 殘留，以下為實作層面的決定。

## 1. 事件 id 的全系統唯一性

- **Decision**: 每個服務以「服務前綴 + 自身遞增計數器」產生 id，例如 `order-1`、`stock-1`、`payment-1`。
- **Rationale**: 三個服務彼此不共用狀態，無法共用計數器；前綴保證跨服務不重複，計數器保證同服務內不重複。
- **Alternatives considered**: UUID（非確定性，測試難以斷言）；全域計數器（違反服務隔離，FR-013）。

## 2. 重複事件的去重（FR-010）

- **Decision**: 每個服務保存 `seenEventIds: Set<string>`，`handle` 先檢查 id，已見過則回傳 `[]`。另外每個業務操作也有狀態守衛（例如庫存的保留以 `orderId` 為鍵，已保留則不再保留）。
- **Rationale**: 雙層防護。去重處理「同一事件 id 重送」；狀態守衛處理「同一業務事件以不同 id 出現」的情況（例如測試重新產生事件），兩者都不會造成重複變動。
- **Alternatives considered**: 只做狀態守衛（無法防止重送 `OrderCancelled` 造成重複退款以外的隱性副作用，且不易推理）。

## 3. 亂序抵達與終態守衛（FR-011, FR-017）

- **Decision**: 每個服務依「當前狀態」決定是否接受事件；不符合的事件被忽略（回傳 `[]`）。例如訂單在 `CANCELLED` 時收到 `PaymentSucceeded` 不改變狀態。
- **Rationale**: 規格的 Assumptions 已明定終態忽略不一致事件；這是最小且可測試的規則。
- **Alternatives considered**: 緩衝等待缺少的前置事件（需要額外狀態與逾時，違反 YAGNI）。

## 4. 取消與亂序的 tombstone（Q3 的推廣）

- **Decision**:
  - 付款服務：收到 `OrderCancelled` 時記入 `cancelledOrders`；之後的 `StockReserved` 不扣款、不發事件（Q3 答覆）。
  - 庫存服務：收到 `OrderCancelled` 時同樣記入 `cancelledOrders`；之後才抵達的 `OrderPlaced` 不保留庫存、不發事件。
- **Rationale**: 規格允許事件亂序。若取消先於 `OrderPlaced` 被庫存服務處理，不加 tombstone 會造成庫存洩漏（保留後永不釋放）。與 Q3 採用相同原則，讓行為一致。這是計畫層的推導，已列入 Assumptions 的補充。
- **Alternatives considered**: 不處理（會違反 SC-003 的「不因取消而遺失」）。

## 5. 逾時判定（Q2 答覆）

- **Decision**: `tick(now)` 掃描所有狀態為 `PENDING` 的訂單，若 `Date.parse(now) - Date.parse(at) >= 15 * 60 * 1000` 則取消（`cancelReason = 'TIMEOUT'`）並回傳 `OrderCancelled`。已取消後到達的事件不改變狀態。
- **Rationale**: 完全依訂單服務自身狀態判定，符合 Q2 答覆與服務隔離；使用 `Date.parse` 比較 ISO 字串，避免字串比較錯誤。
- **Alternatives considered**: 依事件到達時間判定（會引入實際時鐘或到達順序依賴，違反 FR-011 與憲法 IV）。

## 6. 庫存釋放事件的發出時機

- **Decision**: `StockReleased` 只在付款失敗（`PaymentFailed`）時發出（FR-006）。取消（`OrderCancelled`）時庫存服務放回庫存，但不發出 `StockReleased`。
- **Rationale**: 規格的事件清單與 FR-006 將 `StockReleased` 與付款失敗綁定；FR-008 只要求放回庫存，沒有要求事件。保持最小事件集合（YAGNI）。
- **Alternatives considered**: 取消時也發 `StockReleased`（多一個未在規格中定義的行為，且 `StockReleased` 的語意已被綁定）。

## 7. 退款金額來源

- **Decision**: 付款服務在扣款成功時記錄 `charges: Map<orderId, amount>`。收到 `OrderCancelled` 時若有扣款紀錄，退還該金額、發出 `PaymentRefunded`，並刪除紀錄；若無紀錄則不退款也不發事件（但仍記入 tombstone）。
- **Rationale**: 退款金額必須等於實際扣款金額（Edge Cases 與 SC-003），由付款服務自己的紀錄決定，不需讀取訂單狀態。
- **Alternatives considered**: 由訂單服務在取消事件中帶入金額（需修改 `OrderCancelled` 的已固定型別，違反「技術介面固定不可更名」的精神）。

## 8. 狀態名稱對應

| 規格中文狀態 | 介面 `OrderStatus` |
|-------------|-------------------|
| 處理中 | `PENDING` |
| 已確認 | `CONFIRMED` |
| 庫存不足 | `REJECTED` |
| 付款失敗 | `FAILED` |
| 已取消 | `CANCELLED` |

**Decision**: 以上列對應實作 `OrderStatus`，`cancelReason` 為 `CUSTOMER` 或 `TIMEOUT`。
