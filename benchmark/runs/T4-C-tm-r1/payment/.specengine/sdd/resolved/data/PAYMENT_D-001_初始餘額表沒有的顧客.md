# 釐清問題
建立付款服務時只給了部分顧客的初始餘額。若收到的 `OrderPlaced` 顧客不在初始餘額表裡，付款服務該把他的餘額當多少？查詢這位顧客的 `getBalance` 要回傳什麼？

# 定位
customer_balance.balance（模組 PAYMENT；R-PAYMENT-000 / R-PAYMENT-001 / R-PAYMENT-006 的前置資料）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 視為餘額 0：扣款會因餘額不足而發出 `PaymentFailed`（除非訂單金額為 0）；`getBalance` 回傳 0。不會中斷事件處理。 |
| B | 視為資料錯誤：`handle` 拋出例外中斷；`getBalance` 也拋出例外。能及早發現資料缺漏，但會讓事件匯流排的處理中斷。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
`customer_balance` 的建立時機；R-PAYMENT-001 與 R-PAYMENT-006 的測試案例。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A（視為餘額 0；getBalance 回傳 0）。使用者補充：「未知顧客餘額視為 0；餘額不夠就發 PaymentFailed，一毛都不扣。」
- **寫回位置**：矩陣 R-PAYMENT-001（修改，未知顧客餘額視為 0、一毛都不扣）、R-PAYMENT-006（修改，未知顧客回傳 0）；erm.dbml customer_balance.balance 註記
- **時間戳**：2026-11-01 02:59
