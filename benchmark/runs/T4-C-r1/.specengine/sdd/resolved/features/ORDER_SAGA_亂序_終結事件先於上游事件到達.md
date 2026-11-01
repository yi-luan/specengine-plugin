# 釐清問題
需求第 8 點說事件不保證送達順序。可能發生：庫存服務先收到某訂單的 OrderCancelled，之後才收到它的 OrderPlaced；或付款服務先收到 OrderCancelled（或 PaymentFailed 之後又來一個 StockReserved），之後才收到 StockReserved。這時「晚到的上游事件」要不要照常處理？如果照常處理，庫存會被保留、款項會被扣，但訂單其實已經取消，沒有人會再放回／退還。

# 定位
R-ORDER_SAGA-002、R-ORDER_SAGA-004、R-ORDER_SAGA-011、R-ORDER_SAGA-012，模組 ORDER_SAGA；stock_reservations、payment_charges

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 記住已結束的訂單：服務收到 OrderCancelled（庫存服務另含 PaymentFailed）時記下該訂單已結束，之後再收到它的 OrderPlaced／StockReserved 一律不保留、不扣款，回傳空陣列 |
| B | 照常處理，然後立刻補償：晚到的 OrderPlaced 仍保留庫存但立即放回並發 StockReleased；晚到的 StockReserved 仍扣款但立即退還並發 PaymentRefunded |
| C | 照常處理，不補償：晚到的上游事件照常保留／扣款，亂序造成的庫存與款項卡住視為可接受 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
InventoryService 與 PaymentService 的狀態（是否要保存「已結束訂單」集合）；R-002、R-004 的 pre_conditions；亂序 Scenario。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：記住已結束的訂單：服務收到 OrderCancelled（庫存服務另含 PaymentFailed）時記下該訂單已結束，之後再收到它的 OrderPlaced／StockReserved 一律不保留、不扣款，回傳空陣列。
- **寫回位置**：矩陣 R-ORDER_SAGA-002／003／004／005 pre_conditions、R-009／011／012／021／022 post_assertions（記為已結束）、R-ORDER_SAGA-024、R-ORDER_SAGA-025；erm.dbml 新增 inventory_ended_orders、payment_orders.status ENDED；terms.md「已結束的訂單」；policy-defaults POLICY-005
- **時間戳**：2026-11-01 02:44
