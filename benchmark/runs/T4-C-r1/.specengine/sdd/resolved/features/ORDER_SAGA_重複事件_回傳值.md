# 釐清問題
同一個事件（相同 id）重複送達同一服務時，矩陣已確定「不會造成第二次效果」（庫存不會再扣、款項不會再扣）。但 handle 的回傳值要是什麼？

# 定位
R-ORDER_SAGA-015（重複送達），模組 ORDER_SAGA；processed_events

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 回傳空陣列：重複的事件視為已處理，不再發出任何事件 |
| B | 回傳當初產生的相同事件（相同 id）：讓下游也能靠重送補齊，下游再自行去重 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
三個服務的 handle 去重邏輯；是否需要保存每個已處理事件的輸出。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：回傳空陣列：重複的事件視為已處理，不再發出任何事件。
- **寫回位置**：矩陣 R-ORDER_SAGA-015 post_assertions；policy-defaults POLICY-007
- **時間戳**：2026-11-01 02:44
