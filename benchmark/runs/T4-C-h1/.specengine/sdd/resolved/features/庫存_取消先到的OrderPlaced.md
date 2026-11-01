# 釐清問題
庫存服務若先收到某張訂單的 OrderCancelled，之後才收到該訂單的 OrderPlaced，目前沒有規則。若照一般流程保留庫存，訂單已取消卻仍鎖住庫存。流程對齊時（flow-align 第 1 次）需求方裁示這是缺口。

# 定位
MODULE_ID：EVENT_DRIVEN_ORDER；庫存服務的 handle 行為，相關規則 R-EVENT_DRIVEN_ORDER-001、R-EVENT_DRIVEN_ORDER-003、R-EVENT_DRIVEN_ORDER-006，以及付款服務的對等規則 R-EVENT_DRIVEN_ORDER-012。

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 庫存服務記住這張訂單已取消；之後到的 OrderPlaced 不保留庫存、不發任何事件。與付款服務的做法對等。 |
| B | 庫存服務照常保留，之後由取消流程放回。會短暫鎖住庫存，且多發一組 StockReserved／StockReleased。 |
| Short | 自訂簡答（<=5 字） |

# 影響範圍
影響庫存服務的內部狀態（需要記錄已取消的訂單編號）；新增矩陣 R-EVENT_DRIVEN_ORDER-014；影響亂序測試情境。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes（事件亂序下的補償一致性是通用議題）

# 來源
spec-flow-align
---
# 最終決策
- **決策選項**：A（需求方 2026-11-01 流程對齊回覆：「(a) 是缺口。答案：庫存服務記住這張訂單已取消；之後到的 OrderPlaced 不保留庫存、不發任何事件。」）
- **寫回位置**：矩陣 R-EVENT_DRIVEN_ORDER-014（新增）；erm.dbml 新增 cancelled_orders
- **時間戳**：2026-11-01 02:46
