# 釐清問題
每個事件都廣播給三個服務，但順序不保證。付款服務要扣款，必須知道顧客與金額，而這些資訊只存在於 OrderPlaced 中。如果 StockReserved 比 OrderPlaced 先抵達付款服務，付款服務還沒有該訂單的資料，目前需求沒有定義處理方式。

# 定位
MODULE_ID：EVENT_DRIVEN_ORDER；相關規則 R-EVENT_DRIVEN_ORDER-000 與 R-EVENT_DRIVEN_ORDER-002。

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 付款服務暫存這個 StockReserved，等 OrderPlaced 抵達後再扣款。需要暫存區，且要定義暫存多久。 |
| B | 付款服務立即發出 PaymentFailed。會誤判為付款失敗，並使庫存被放回，不建議。 |
| C | 付款服務忽略這個 StockReserved，不扣款也不發事件，依靠至少一次傳遞讓它稍後重送。 |
| Short | 自訂簡答（<=5 字） |

# 影響範圍
影響付款服務的內部狀態設計（是否需要暫存）；影響 R-000 主幹與 R-002 失敗路徑在亂序下的結果；測試案例需要亂序情境。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes（跨服務的事件亂序處理是通用工程議題）

# 來源
spec-01
---
# 最終決策
- **決策選項**：需求方回覆「你決定，照你的最佳判斷」，由 spec-02 代為判斷，選 A：付款服務暫存 StockReserved，等該訂單的 OrderPlaced 抵達後再依正常規則扣款。理由：至少一次傳遞下事件不會遺失；暫存可避免誤判付款失敗（B）與依賴重送的不確定性（C）。此為依授權作出的判斷，非需求方親選。
- **寫回位置**：矩陣 R-EVENT_DRIVEN_ORDER-013（新增）；erm.dbml 新增 buffered_reservations、payment_orders
- **時間戳**：2026-11-01 02:42
