# 釐清問題
付款服務已先收到某張訂單的 `OrderCancelled`（顧客取消或逾時自動取消；當時尚未扣款，所以沒有退款），之後才收到同一張訂單的 `StockReserved`（亂序或晚到）。這張訂單已經取消，付款服務應該怎麼做？

# 定位
R-PAYMENT-004 / R-PAYMENT-000（模組 PAYMENT；payment_order.status 為 CANCELLED 時收到 StockReserved）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 不扣款，靜默忽略，回傳空陣列。訂單已取消，不再產生任何付款事件。 |
| B | 不扣款，但發出 `PaymentFailed`，讓訂單與庫存服務知道這筆沒付款（庫存服務可據此放回庫存）。 |
| C | 照常扣款並發出 `PaymentSucceeded`，之後若再收到 `OrderCancelled` 再退款。最簡單，但已取消的訂單會被短暫扣款。 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
R-PAYMENT-004 需記住取消狀態；R-PAYMENT-000 的前置條件「訂單未取消」；亂序測試案例。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：A（不扣款，靜默忽略，回傳空陣列）。使用者補充：「付款服務記住這張訂單已取消；之後到的 StockReserved 不扣款、不發任何事件。」
- **寫回位置**：矩陣 R-PAYMENT-004（修改，記住已取消）、R-PAYMENT-009（新增，已取消後收到 StockReserved／OrderPlaced 一律忽略）；erm.dbml payment_order.status CANCELLED 註記
- **時間戳**：2026-11-01 02:59
