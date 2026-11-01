# 釐清問題
createInventoryService(stock) 與 createPaymentService(balances) 用初始表建立服務。如果訂單的 SKU 不在庫存表裡、或顧客不在餘額表裡，服務要怎麼看待？

# 定位
inventory_stock.available、customer_balances.balance，模組 ORDER_SAGA；R-ORDER_SAGA-003、R-ORDER_SAGA-005

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 視為 0：未登錄的 SKU 可用庫存為 0（下單會收到 StockRejected），未登錄的顧客餘額為 0（會收到 PaymentFailed）；getAvailable／getBalance 回傳 0 |
| B | 忽略：未登錄的 SKU／顧客的事件直接回傳空陣列，不發 StockRejected／PaymentFailed（訂單會一直處理中直到逾時） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
getAvailable／getBalance 對未知鍵的回傳；R-003、R-005 的 pre_conditions。

# 優先級
Low

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：視為 0：未登錄的 SKU 可用庫存為 0（StockRejected），未登錄的顧客餘額為 0（PaymentFailed）；getAvailable／getBalance 回傳 0。
- **寫回位置**：矩陣 R-ORDER_SAGA-027、R-ORDER_SAGA-003／005 pre_conditions 註記
- **時間戳**：2026-11-01 02:44
