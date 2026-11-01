# 釐清問題
事件至少送達一次、可能重複。當某張訂單已經扣款成功（已發 `PaymentSucceeded`），又收到同一張訂單的 `StockReserved`；或已經退款（已發 `PaymentRefunded`），又收到同一張訂單的 `OrderCancelled`。付款服務確定不能重複扣款或重複退款，但要怎麼回應？

# 定位
R-PAYMENT-000 / R-PAYMENT-003（模組 PAYMENT；payment_order.status 為 PAID／REFUNDED 時的重複事件）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 以訂單狀態判斷：動作已做過就靜默忽略，回傳空陣列，餘額不變。最保守，不會製造多餘事件；但若當初的結果事件遺失，下游不會再收到。 |
| B | 以訂單狀態判斷：動作已做過不再扣款／退款，但重新發出一次相同結果的事件（`PaymentSucceeded` 或 `PaymentRefunded`，金額相同、事件 id 為新值），讓下游靠重送也能收到結果。餘額不變。 |
| C | 只用事件 id 去重：同一 id 的事件忽略；不同 id 但同訂單的 `StockReserved` 視為新的扣款要求再扣一次。最簡單，但同訂單多個不同 id 的事件會重複扣款。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-PAYMENT-000、R-PAYMENT-003 新增重複送達分支；`emitted_event`／事件 id 去重是否需要保存；冪等性測試案例。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A（看訂單狀態，做過就靜默忽略，回傳空陣列，餘額不變）。使用者補充：「同一個事件（同 id）第二次起直接忽略，不改任何狀態、不發任何事件。退款只在已扣款時全額退，同一張訂單最多退一次。」
- **寫回位置**：矩陣 R-PAYMENT-011（新增，同 id 重送忽略）、R-PAYMENT-012（新增，已扣款／已退款後再收 StockReserved）、R-PAYMENT-013（新增，已退款／已取消後再收 OrderCancelled）、R-PAYMENT-015（新增，重複 OrderPlaced 不覆寫）、R-PAYMENT-003（修改，全額退且最多一次）；erm.dbml 新增 processed_event；policy-defaults POLICY-002
- **時間戳**：2026-11-01 02:59
