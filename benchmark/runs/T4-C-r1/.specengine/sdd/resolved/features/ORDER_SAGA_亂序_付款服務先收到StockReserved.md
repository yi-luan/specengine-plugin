# 釐清問題
事件不保證順序：付款服務可能先收到某訂單的 StockReserved、之後才收到它的 OrderPlaced。此時付款服務還不知道該訂單的顧客與金額，無法扣款。矩陣 R-004／R-005 只規定「已知顧客與金額」時怎麼做，沒有規定這種亂序情況。

# 定位
R-ORDER_SAGA-004、R-ORDER_SAGA-005、R-ORDER_SAGA-026，模組 ORDER_SAGA；payment_orders

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 暫存：先記下「該訂單已保留庫存」並回傳空陣列；之後收到 OrderPlaced 時若該訂單未被記為已結束，立即依餘額扣款並發出 PaymentSucceeded 或 PaymentFailed（訂單不會因亂序卡住到逾時） |
| B | 忽略：回傳空陣列，不記任何東西；該訂單將一直「處理中」直到逾時自動取消 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
PaymentService.handle(StockReserved / OrderPlaced) 的狀態機；payment_orders 需多一個「已保留待扣款」狀態。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-flow-align

---
# 最終決策
- **決策選項**：需求方於流程對齊確認時裁示「(a)、(b) 你決定，照你的最佳判斷」，授權執行者裁定。執行者選 A：暫存，等 OrderPlaced 到達時再扣款（理由：至少一次、無順序保證的傳遞下此情況必然發生，忽略會讓顧客的訂單無故等到逾時被取消；暫存可讓流程自然收斂，且與「已結束」墓碑規則相容）。
- **寫回位置**：矩陣 R-ORDER_SAGA-028（先收到 StockReserved）、R-ORDER_SAGA-029（之後收到 OrderPlaced 時扣款）；erm.dbml payment_orders.status 新增 RESERVED_AWAITING_ORDER；policy-defaults POLICY-005 補充
- **時間戳**：2026-11-01 02:52
