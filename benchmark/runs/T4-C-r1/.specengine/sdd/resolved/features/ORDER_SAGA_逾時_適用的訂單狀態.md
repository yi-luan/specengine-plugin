# 釐清問題
「沒有完成付款的訂單」字面上包含「處理中（PENDING）」，但「庫存不足（REJECTED）」和「付款失敗（FAILED）」的訂單也沒有完成付款。逾時自動取消要套用在哪些狀態？

# 定位
R-ORDER_SAGA-013（逾時自動取消），模組 ORDER_SAGA；orders.status

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 只有「處理中（PENDING）」會被逾時取消；庫存不足、付款失敗已是最終結果，維持原狀態 |
| B | 「處理中」「庫存不足」「付款失敗」三種都會在 15 分鐘後變成「已取消（TIMEOUT）」並發出 OrderCancelled |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.tick 掃描的訂單範圍；REJECTED／FAILED 訂單是否會再觸發庫存放回與退款流程。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：只有「處理中（PENDING）」會被逾時取消；庫存不足、付款失敗已是最終結果，維持原狀態。
- **寫回位置**：矩陣 R-ORDER_SAGA-013 pre_conditions
- **時間戳**：2026-11-01 02:44
