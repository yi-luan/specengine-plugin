# 釐清問題
某張訂單的保留庫存已經放回過（例如先收到 `PaymentFailed` 放回一次，之後又收到重複的 `PaymentFailed`，或接著收到 `OrderCancelled`），或這張訂單當初因庫存不足被拒絕、根本沒有保留。此時再收到 `PaymentFailed` 或 `OrderCancelled`，已確定「可用庫存不變（不重複放回）」。但要回傳什麼？

# 定位
R-INVENTORY_RESERVATION-006（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 回傳空陣列，什麼事件都不發（沒放回就不發放回事件，語意最乾淨） |
| B | 若該訂單曾經放回過，就再發一個 `StockReleased`（容錯重送）；當初被拒絕、從未保留的訂單則回傳空陣列 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-INVENTORY_RESERVATION-006 的 post_assertions；`handle(PaymentFailed)`／`handle(OrderCancelled)` 對無保留訂單的回傳值；對應 Scenario 的 Then 步驟。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A（回傳空陣列，不發事件）。
- **寫回位置**：矩陣 R-INVENTORY_RESERVATION-006（post_assertions「回傳空陣列，不發出 StockReleased」）；policy-defaults.md POLICY-002
- **時間戳**：2026-11-01 03:01
