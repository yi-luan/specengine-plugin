# 釐清問題
某張訂單曾因餘額不足發出 `PaymentFailed`，之後又收到同一張訂單的 `StockReserved`（重複送達）。此時顧客餘額可能已經變多（例如別的訂單退款）。付款服務要不要再試一次扣款？

# 定位
R-PAYMENT-001（模組 PAYMENT；payment_order.status 為 FAILED 時收到 StockReserved）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 不再重試：訂單已判定付款失敗，忽略並回傳空陣列。與訂單服務「付款失敗」狀態一致，不會出現訂單失敗卻被扣款的矛盾。 |
| B | 重新判斷：餘額現在足夠就扣款並發出 `PaymentSucceeded`，仍不足就再發一次 `PaymentFailed`。對顧客友善，但訂單服務可能已把訂單標為付款失敗、庫存可能已放回。 |
| C | 不重試，但再發一次 `PaymentFailed`（事件 id 為新值），讓下游靠重送也能收到失敗結果。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-PAYMENT-001 新增重複送達分支；FAILED 狀態是否為終態；冪等性測試案例。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：使用者回覆「你決定，照你的最佳判斷」並補充「同一個事件（同 id）重送一律忽略；其他情況你決定」。執行者選 A（不同 id 的 StockReserved 也不重試，忽略並回傳空陣列）。理由：訂單服務收到 PaymentFailed 後已把訂單標為付款失敗、庫存服務已放回庫存，再扣款會造成三個服務狀態矛盾；付款失敗為終態。
- **寫回位置**：矩陣 R-PAYMENT-011（同 id 忽略）、R-PAYMENT-014（新增，付款失敗後不重試）；erm.dbml payment_order.status FAILED 標為終態
- **時間戳**：2026-11-01 02:59
