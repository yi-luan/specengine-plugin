# 釐清問題
庫存服務收到 OrderCancelled 或 PaymentFailed、付款服務收到 OrderCancelled 時，可能根本沒有東西可以放回或退還：例如庫存不足被拒的訂單（從未保留）、餘額不足的訂單（從未扣款）、或已經放回／退過一次。這時服務要不要仍然發出 StockReleased／PaymentRefunded？

# 定位
R-ORDER_SAGA-009、R-ORDER_SAGA-011、R-ORDER_SAGA-012，模組 ORDER_SAGA

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 不發：沒有保留就不發 StockReleased、沒有扣款就不發 PaymentRefunded，回傳空陣列（事件代表真的有東西被放回／退還） |
| B | 仍發：收到 OrderCancelled 一律發 StockReleased 與 PaymentRefunded（amount 為 0），讓下游知道取消已被處理 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
InventoryService.handle(OrderCancelled / PaymentFailed)、PaymentService.handle(OrderCancelled) 在「無保留／無扣款」情況下的回傳值。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：不發：沒有保留就不發 StockReleased、沒有扣款就不發 PaymentRefunded，回傳空陣列。
- **寫回位置**：矩陣 R-ORDER_SAGA-021（庫存服務無保留）、R-ORDER_SAGA-022（付款服務無扣款）
- **時間戳**：2026-11-01 02:44
