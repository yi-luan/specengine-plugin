# 釐清問題
需求第 8 點：事件不保證送達的先後順序。可能發生：庫存服務先收到某訂單的 `OrderCancelled`（例如顧客下單後立刻取消）或 `PaymentFailed`，之後才收到同一訂單的 `OrderPlaced`。收到「放回」事件時這張訂單還沒有任何保留，之後 `OrderPlaced` 到達時庫存服務該怎麼做？

# 定位
R-INVENTORY_RESERVATION-000、R-INVENTORY_RESERVATION-003（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 先到的放回事件直接忽略（回傳空陣列）、不記住；之後 `OrderPlaced` 到達時照常保留並發 `StockReserved`（最簡單；但已取消的訂單會占住庫存，直到有人再次取消） |
| B | 記住「這張訂單已結束」；之後 `OrderPlaced` 到達時不保留、回傳空陣列（庫存不被已取消的訂單占住；但訂單服務收不到任何庫存回覆） |
| C | 記住「這張訂單已結束」；之後 `OrderPlaced` 到達時不保留，但發出 `StockRejected`（訂單服務有明確回覆；但「拒絕」語意與庫存不足混用） |
| D | 記住「這張訂單已結束」；之後 `OrderPlaced` 到達時先保留、立刻放回，發出 `StockReserved` 與 `StockReleased`（事件完整；庫存淨值不變） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
是否需要新增 Rule（已結束訂單的 OrderPlaced）；stock_reservation 是否需要在無保留時先建立紀錄；`handle(OrderPlaced)`／`handle(OrderCancelled)`／`handle(PaymentFailed)` 的實作。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：B。使用者補充：「『訂單已取消』先到 → B，記住這張訂單已取消，之後到的 `OrderPlaced` 不保留庫存、不發任何事件。『付款失敗』先到的情況你決定。」執行者依授權決定：`PaymentFailed` 先到比照 B（記住已結束，之後的 OrderPlaced 不保留、不發事件）——付款失敗代表該訂單已終結，與取消先到的處理一致，避免兩種先到事件走不同分支。先到的放回事件本身回傳空陣列、不加庫存（與 Q1 補充「沒保留過就不加庫存、不發 StockReleased」一致）。
- **寫回位置**：矩陣新增 R-INVENTORY_RESERVATION-008（放回事件先到：記住已結束、回空陣列）與 R-INVENTORY_RESERVATION-009（已結束訂單的 OrderPlaced：不保留、回空陣列）；R-000／001 pre_conditions 加「未被記為已結束」；erm.dbml stock_reservation.status 加 ENDED；terms.md 新增「已結束」；policy-defaults.md POLICY-003
- **時間戳**：2026-11-01 03:01
