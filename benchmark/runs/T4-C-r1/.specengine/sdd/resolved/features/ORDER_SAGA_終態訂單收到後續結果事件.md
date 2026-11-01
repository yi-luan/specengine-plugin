# 釐清問題
訂單已經不是「處理中」之後（例如已取消、庫存不足、付款失敗），因為亂序或延遲，訂單服務可能才收到 PaymentSucceeded／StockRejected／PaymentFailed。例如：訂單逾時取消後 PaymentSucceeded 才到；或顧客取消後 StockRejected 才到。訂單狀態要不要被這些晚到的結果改寫？

# 定位
R-ORDER_SAGA-006、R-ORDER_SAGA-007、R-ORDER_SAGA-008，模組 ORDER_SAGA；orders.status

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 忽略：只有「處理中」的訂單會被結果事件改狀態；其他狀態收到結果事件一律不變，回傳空陣列（已取消的訂單永遠是已取消） |
| B | 覆寫：以最後收到的結果事件為準，例如已取消的訂單收到 PaymentSucceeded 變成已確認 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.handle 的狀態機守衛；R-006／007／008 的 pre_conditions 是否維持「狀態為 PENDING」。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：忽略：只有「處理中」的訂單會被結果事件改狀態；其他狀態收到結果事件一律不變，回傳空陣列。補充：CANCELLED／REJECTED／FAILED 是終態，之後任何事件都不改變訂單狀態；CONFIRMED 只會因顧客取消而變成 CANCELLED。
- **寫回位置**：矩陣 R-ORDER_SAGA-023；terms.md「終態」；policy-defaults POLICY-006
- **時間戳**：2026-11-01 02:44
