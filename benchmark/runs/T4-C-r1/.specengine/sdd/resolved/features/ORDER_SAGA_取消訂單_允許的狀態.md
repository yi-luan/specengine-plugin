# 釐清問題
需求只說「顧客可以取消訂單」，沒有說哪些狀態的訂單可以取消。目前矩陣只確定「處理中（PENDING）」可以取消。「已確認（CONFIRMED）」的訂單（已扣款）能不能取消？需求第 6 點提到取消時付款服務要退款，暗示已付款的訂單也可能被取消。「庫存不足（REJECTED）」「付款失敗（FAILED）」這類已經結束的訂單呢？

# 定位
R-ORDER_SAGA-010（取消訂單），模組 ORDER_SAGA；orders.status

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 只有「處理中（PENDING）」可以取消；其他狀態一律回傳 ok: false（已確認的訂單不能取消，第 6 點的退款只會發生在亂序／逾時競態下） |
| B | 「處理中（PENDING）」與「已確認（CONFIRMED）」可以取消；已確認的訂單取消後退款與放回庫存；「庫存不足」「付款失敗」「已取消」回傳 ok: false |
| C | 除了「已取消（CANCELLED）」以外任何狀態都可以取消（庫存不足、付款失敗的訂單也會變成已取消） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.cancelOrder 的前置檢查；R-ORDER_SAGA-010 的 pre_conditions；取消後庫存／付款服務的放回與退款（R-011、R-012）是否會在已確認訂單上發生。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：B：「處理中（PENDING）」與「已確認（CONFIRMED）」可以取消；已確認的訂單取消後退款與放回庫存；庫存不足／付款失敗／已取消回傳 ok: false。補充：已確認取消時 cancelReason 為 `CUSTOMER`。
- **寫回位置**：矩陣 R-ORDER_SAGA-010（pre_conditions 改為 PENDING 或 CONFIRMED；cancelReason CUSTOMER）、R-ORDER_SAGA-020（REJECTED／FAILED／CANCELLED 不可取消）
- **時間戳**：2026-11-01 02:44
