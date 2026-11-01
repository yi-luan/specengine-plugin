# 釐清問題
需求只說金額是整數。若 `OrderPlaced` 的訂單金額為 0，或為負數（上游資料錯誤），付款服務收到 `StockReserved` 時要怎麼處理？

# 定位
R-PAYMENT-000 / R-PAYMENT-001（模組 PAYMENT；payment_order.amount 的邊界）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 一律照數學規則處理：金額 0 視為餘額足夠，扣 0 元並發出 `PaymentSucceeded`（amount 0）；負數也照算（餘額會增加）。實作最簡單，不做防禦。 |
| B | 金額 0 照 A 處理（扣 0 元、`PaymentSucceeded`）；負數視為無效，不扣款並發出 `PaymentFailed`。 |
| C | 金額 0 與負數都視為無效，不扣款並發出 `PaymentFailed`。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-PAYMENT-000、R-PAYMENT-001 的前置條件；`payment_order.amount` 的約束 note；邊界測試案例。

# 優先級
Low

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：使用者回覆「你決定，照你的最佳判斷」，授權執行者決定；執行者選 B（金額 0 視為餘額足夠，扣 0 元並發 PaymentSucceeded amount 0；負數視為無效，不扣款並發 PaymentFailed）。理由：0 元訂單在數學上餘額必足夠，照常成功最不意外；負數只可能是上游錯誤，照算會憑空增加餘額，故判失敗。
- **寫回位置**：矩陣 R-PAYMENT-000（修改，金額 >= 0、0 視為足夠）、R-PAYMENT-001（修改，金額 >= 0）、R-PAYMENT-010（新增，負數金額付款失敗）；erm.dbml payment_order.amount 註記
- **時間戳**：2026-11-01 02:59
