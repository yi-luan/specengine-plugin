# 釐清問題
cancelOrder 不被允許時（訂單不存在、或狀態不允許取消）要回傳 `{ ok: false, reason }`，需求沒有定義 reason 的文字。要用什麼固定文案？

# 定位
R-ORDER_SAGA-010（取消訂單），模組 ORDER_SAGA；CommandResult.reason

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 分兩種：訂單不存在回傳 `ORDER_NOT_FOUND`；狀態不允許取消回傳 `ORDER_NOT_CANCELLABLE` |
| B | 不分情況，一律回傳 `CANNOT_CANCEL` |
| C | 回傳人類可讀的繁體中文，例如「訂單不存在」「訂單狀態不允許取消」 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
cancelOrder 的回傳值；terms.md 固定文案；.feature 的 Then 步驟逐字比對。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：Short（自訂）：找不到訂單 → `ORDER_NOT_FOUND`；REJECTED／FAILED／CANCELLED 不能取消 → `NOT_CANCELLABLE`，不發事件。
- **寫回位置**：terms.md 固定文案 MSG-001「ORDER_NOT_FOUND」、MSG-002「NOT_CANCELLABLE」；矩陣 R-ORDER_SAGA-019、R-ORDER_SAGA-020；policy-defaults POLICY-001
- **時間戳**：2026-11-01 02:44
