# 釐清問題
需求第 8 點：事件可能重複送達。同一張訂單的 `OrderPlaced` 第二次送到庫存服務時，已確定「不重複保留、不重複拒絕」（可用庫存不再變動）。但第二次要回傳什麼？

# 定位
R-INVENTORY_RESERVATION-005（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 回傳空陣列，什麼事件都不發（最簡單；但若第一次發出的 StockReserved／StockRejected 在匯流排上遺失，下游永遠等不到） |
| B | 重新發出與第一次相同結果的事件（第一次保留成功就再發一個 StockReserved、第一次拒絕就再發一個 StockRejected，事件 id 為新的）（容錯較強；下游必須自行處理重複的 StockReserved） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-INVENTORY_RESERVATION-005 的 post_assertions；`handle(OrderPlaced)` 對重複訂單的回傳值；對應 Scenario 的 Then 步驟。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A。使用者補充：「同一個事件（同 id）重複送達，第二次起直接忽略，不改任何狀態、不發任何事件。」
- **寫回位置**：矩陣 R-INVENTORY_RESERVATION-005（post_assertions「回傳空陣列，不發出任何事件」）；erm.dbml 新增 processed_event 表；policy-defaults.md POLICY-001
- **時間戳**：2026-11-01 03:01
