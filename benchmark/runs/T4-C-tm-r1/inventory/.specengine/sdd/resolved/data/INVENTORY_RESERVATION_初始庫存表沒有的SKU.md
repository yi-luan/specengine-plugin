# 釐清問題
建立庫存服務時給的初始庫存表只列了部分 SKU。收到 `OrderPlaced` 的 SKU 不在表裡，或有人呼叫 `getAvailable` 查詢不在表裡的 SKU 時，怎麼處理？

# 定位
inventory_stock.sku、R-INVENTORY_RESERVATION-001、R-INVENTORY_RESERVATION-007（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 視為可用庫存 0：`getAvailable` 回傳 0，`OrderPlaced` 一律發出 `StockRejected`（最寬鬆，不會讓服務當掉） |
| B | 視為程式錯誤：`getAvailable` 與 `handle(OrderPlaced)` 都拋出例外（嚴格，能早期發現 SKU 設定遺漏；但事件匯流排收到例外可能一直重送） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-INVENTORY_RESERVATION-001／007 的 pre_conditions；是否新增「未知 SKU」Rule；`getAvailable` 與 `handle(OrderPlaced)` 的實作。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A。使用者補充：「未知 SKU 視為庫存 0，發 `StockRejected`；庫存不夠時整筆拒絕，不部分保留。」
- **寫回位置**：矩陣 R-INVENTORY_RESERVATION-001（pre_conditions「未知 SKU 視為可用庫存 0」、post_assertions「整筆拒絕，不部分保留」）；R-INVENTORY_RESERVATION-007（post_assertions「初始庫存表沒有的 SKU 回傳 0」，移除「SKU 存在」前置）；erm.dbml inventory_stock.sku note；terms.md 新增「未知 SKU」
- **時間戳**：2026-11-01 03:01
