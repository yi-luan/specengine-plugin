# 釐清問題
需求第 6 點說顧客取消訂單後，庫存服務要放回保留的庫存，但沒有說要不要對外發出事件。收到 `OrderCancelled` 並放回庫存後，庫存服務是否要發出 `StockReleased`？

# 定位
INVENTORY 模組，Rule R-INVENTORY-003（trigger: OrderCancelled）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 放回後發出 `StockReleased`，與付款失敗的放回一致 |
| B | 放回後不發出任何事件 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
影響 `StockReleased` 的語意範圍，以及 R-INVENTORY-003 的 post_assertions。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：需求方回覆「6A」，放回後發出 `StockReleased`。
- **寫回位置**：矩陣 R-INVENTORY-003 的 post_assertions（發出 StockReleased，附訂單編號）
- **時間戳**：2026-11-01 02:48
