# 釐清問題
訂單編號是顧客下單時提供的。如果同一個訂單編號被下單兩次（例如顧客快速連點），訂單服務要怎麼處理？

# 定位
R-ORDER_SAGA-001（下單建立訂單），模組 ORDER_SAGA；orders.order_id

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 拒絕：回傳 ok: false，reason 為固定文案 `DUPLICATE_ORDER`；既有訂單不變，不發事件 |
| B | 視為冪等重送：回傳 ok: true 但 events 為空陣列，既有訂單不變 |
| C | 覆蓋：以新的內容重建訂單並再發一次 OrderPlaced |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.placeOrder 的前置檢查與回傳；terms.md 固定文案（選 A 時）。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：拒絕：回傳 ok: false，reason 為固定文案 `DUPLICATE_ORDER`；既有訂單不變，不發事件。
- **寫回位置**：矩陣 R-ORDER_SAGA-017；terms.md 固定文案 MSG-003「DUPLICATE_ORDER」；policy-defaults POLICY-002
- **時間戳**：2026-11-01 02:44
