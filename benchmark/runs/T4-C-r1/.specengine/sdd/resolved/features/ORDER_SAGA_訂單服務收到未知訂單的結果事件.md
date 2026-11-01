# 釐清問題
訂單服務可能收到「從未下過單的 orderId」的結果事件（PaymentSucceeded／StockRejected／PaymentFailed），例如來自其他系統或錯誤的事件。R-ORDER_SAGA-023 只涵蓋「訂單存在但狀態不是處理中」，沒有涵蓋「訂單不存在」。

# 定位
R-ORDER_SAGA-023，模組 ORDER_SAGA；orders

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 忽略：回傳空陣列，不建立任何訂單（getOrder 仍回傳 undefined） |
| B | 以該事件建立一張對應狀態的訂單（資訊不足，無法填 customerId、sku 等欄位） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.handle 對未知 orderId 的守衛。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-flow-align

---
# 最終決策
- **決策選項**：需求方於流程對齊確認時裁示「(a)、(b) 你決定，照你的最佳判斷」，授權執行者裁定。執行者選 A：忽略、回傳空陣列（理由：結果事件沒有足夠欄位可建立訂單，且訂單只能由 placeOrder 建立）。
- **寫回位置**：矩陣 R-ORDER_SAGA-023 pre_conditions 擴充為「訂單不存在，或狀態不是 PENDING」
- **時間戳**：2026-11-01 02:52
