# 釐清問題
`OrderPlaced` 的商品 SKU 不在庫存服務建立時的庫存表（`stock`）中，庫存服務應如何處理？

# 定位
INVENTORY 模組，Rule R-INVENTORY-000、R-INVENTORY-001（trigger: OrderPlaced）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 視為庫存為 0，庫存不足，發出 `StockRejected` |
| B | 忽略該事件，不回應任何事件 |
| C | 拋出錯誤並停止處理，不發出事件 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
影響 R-INVENTORY-001 的前置條件；影響訂單服務是否會收到無回應的訂單。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：需求方回覆「3A」，並補充：「未知 SKU 視為庫存 0，發 `StockRejected`；庫存不夠時整筆拒絕，不部分保留。」
- **寫回位置**：矩陣 R-INVENTORY-001（pre_conditions 加入未知 SKU 視為 0；post_assertions 加入整筆拒絕、不部分保留）
- **時間戳**：2026-11-01 02:48
