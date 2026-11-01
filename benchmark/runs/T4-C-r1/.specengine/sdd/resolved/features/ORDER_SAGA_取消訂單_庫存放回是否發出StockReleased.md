# 釐清問題
需求第 5 點說付款失敗時庫存服務放回庫存「並發出 StockReleased」；第 6 點說取消時庫存服務「放回保留的庫存」，但沒有說要不要發出 StockReleased。取消時放回庫存，要不要也發 StockReleased？

# 定位
R-ORDER_SAGA-011（取消時放回庫存），模組 ORDER_SAGA

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 要，與付款失敗一致：放回庫存後發出 StockReleased |
| B | 不要，只放回庫存，回傳空陣列 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
InventoryService.handle(OrderCancelled) 的回傳值；R-ORDER_SAGA-011 的 post_assertions。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：要，與付款失敗一致：放回庫存後發出 StockReleased。
- **寫回位置**：矩陣 R-ORDER_SAGA-011 post_assertions 新增「回傳恰含一個 StockReleased」
- **時間戳**：2026-11-01 02:44
