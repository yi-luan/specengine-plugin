# 釐清問題
需求第 8 點說事件可能重複送達。同一張訂單的 `OrderPlaced` 第二次抵達時，庫存服務應如何處理？

# 定位
INVENTORY 模組，Rule R-INVENTORY-000、R-INVENTORY-001（trigger: OrderPlaced）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 同一訂單只保留一次；重複的 `OrderPlaced` 直接忽略，不再發出任何事件 |
| B | 同一訂單只保留一次；重複的 `OrderPlaced` 不動庫存，但重發上次的結果事件 |
| C | 每次收到都重新判斷並保留，可能重複扣減庫存 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
影響 R-INVENTORY-000 與 R-INVENTORY-001 的前置條件（是否已有保留紀錄）。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：需求方回覆「1A」，並補充：「同一個事件（同 id）重複送達，第二次起直接忽略，不改任何狀態、不發任何事件。」依事件 id 去重，比原選項 A 的「同一訂單」更細。
- **寫回位置**：矩陣 R-INVENTORY-005（新增）
- **時間戳**：2026-11-01 02:48
