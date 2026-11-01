# 釐清問題
需求第 5 點明寫「付款失敗時，庫存服務要把保留的庫存放回去，並發出 `StockReleased`」；但第 6 點「顧客取消訂單」只寫「庫存服務放回保留的庫存」，沒有寫要不要發出 `StockReleased`。庫存服務收到 `OrderCancelled` 並放回庫存後，要不要也發出 `StockReleased` 事件？

# 定位
R-INVENTORY_RESERVATION-003（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 發出 `StockReleased`（與付款失敗一致，所有放回都有事件可追蹤；下游若不需要可忽略） |
| B | 不發出任何事件，只在內部放回庫存（嚴格照需求字面；但取消的放回無事件可稽核） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-INVENTORY_RESERVATION-003 的 post_assertions；`handle(OrderCancelled)` 的回傳值；對應 Scenario 的 Then 步驟。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A。使用者補充：「只放回實際保留的數量，同一張訂單最多放回一次，放回時發 `StockReleased`；沒保留過就不加庫存、不發 `StockReleased`。」
- **寫回位置**：矩陣 R-INVENTORY_RESERVATION-003（post_assertions 加「回傳 StockReleased」、「實際保留的數量」、「最多放回一次」）；R-INVENTORY_RESERVATION-002 同步補「實際保留的數量」「最多放回一次」；R-INVENTORY_RESERVATION-006 補「沒保留過就不加庫存、不發 StockReleased」
- **時間戳**：2026-11-01 03:01
