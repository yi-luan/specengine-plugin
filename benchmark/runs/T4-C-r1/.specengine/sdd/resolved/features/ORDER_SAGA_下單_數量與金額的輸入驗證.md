# 釐清問題
需求只說「所有金額與數量都是整數」，沒有說下單的數量或金額可不可以是 0 或負數。訂單服務要不要驗證？不合法時怎麼反應？

# 定位
R-ORDER_SAGA-001（下單建立訂單），模組 ORDER_SAGA；orders.qty、orders.amount

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 數量必須 >= 1、金額必須 >= 0（允許 0 元訂單）；不合法時回傳 ok: false，reason 為固定文案 `INVALID_ORDER`，不建立訂單、不發事件 |
| B | 數量必須 >= 1、金額必須 >= 1（不允許 0 元訂單）；不合法時回傳 ok: false，reason 為固定文案 `INVALID_ORDER`，不建立訂單、不發事件 |
| C | 不驗證：任何整數都照單全收，交給庫存與付款服務用既有規則處理 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.placeOrder 的前置檢查；terms.md 固定文案（選 A／B 時）；是否需要 Scenario Outline 列舉邊界。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：Short（自訂）：qty 或 amount 不是正整數、orderId／customerId／sku 為空字串 → `INVALID_INPUT`；不建立訂單、不發事件。
- **寫回位置**：矩陣 R-ORDER_SAGA-018、R-ORDER_SAGA-001 pre_conditions；terms.md 固定文案 MSG-004「INVALID_INPUT」；policy-defaults POLICY-003
- **時間戳**：2026-11-01 02:44
