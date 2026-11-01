# 釐清問題
事件不保證先後順序。`StockReserved` 只帶訂單編號，不帶顧客與金額；付款服務必須先從 `OrderPlaced` 得知這張訂單是誰的、要扣多少。若 `StockReserved` 比 `OrderPlaced` 先到，付款服務當下沒有資料可扣款，該怎麼處理？

# 定位
R-PAYMENT-000 / R-PAYMENT-002（模組 PAYMENT；payment_order.status 的轉移）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 先記住「這張訂單庫存已保留」，暫不回應（回傳空陣列）；等 `OrderPlaced` 到達時立即補做扣款判斷，並在那一刻發出 `PaymentSucceeded` 或 `PaymentFailed`。最終結果一致，但付款結果事件會從 `OrderPlaced` 的處理回傳。 |
| B | 當下無資料視同無法付款，立即發出 `PaymentFailed`，之後 `OrderPlaced` 到達只記錄不補扣。實作最簡單，但亂序會讓可付款的訂單被判失敗。 |
| C | 當下忽略（回傳空陣列），不記住任何事；之後 `OrderPlaced` 到達也只記錄不扣款，等待重複送達的 `StockReserved` 再處理。依賴重送，若不再重送則訂單永遠沒付款結果。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-PAYMENT-000、R-PAYMENT-001、R-PAYMENT-002 的前置條件；`payment_order.status` 需不需要「庫存已保留但未下單」狀態；對應的亂序測試案例。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：使用者回覆「你決定，照你的最佳判斷」，授權執行者決定；執行者選 A（先記住庫存已保留、暫不回應回傳空陣列；OrderPlaced 到達時立即補做扣款判斷並在那時發出 PaymentSucceeded／PaymentFailed）。理由：至少一次且不保證順序的傳遞下，A 是唯一不依賴重送、也不把可付款訂單誤判失敗的做法。
- **寫回位置**：矩陣 R-PAYMENT-007（新增）、R-PAYMENT-008（新增）；erm.dbml payment_order.status 新增 AWAITING_ORDER；policy-defaults POLICY-001
- **時間戳**：2026-11-01 02:59
