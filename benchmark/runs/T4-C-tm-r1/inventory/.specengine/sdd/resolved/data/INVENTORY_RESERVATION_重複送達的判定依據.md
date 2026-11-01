# 釐清問題
庫存服務要辨認「重複送達」的 `OrderPlaced`。重送時通常是同一個事件（同事件 id、同訂單編號）；但理論上也可能收到「同一訂單編號、不同事件 id」的 OrderPlaced。判定「這張訂單已處理過」的依據是什麼？

# 定位
stock_reservation.order_id（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 以訂單編號為準：同一訂單編號只保留一次，不管事件 id 是否相同（只需記訂單編號；同訂單不同 id 也視為重複） |
| B | 以事件 id 為準：同一事件 id 只處理一次，不同事件 id 一律視為新事件照常處理（需另外記已處理事件 id；同訂單不同 id 會重複保留） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
erm.dbml 是否新增 processed_event 表；R-INVENTORY_RESERVATION-005／006 的 pre_conditions；`handle()` 的去重邏輯。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：Short（自訂）：「同一個事件 id 一律只處理一次；同訂單但不同事件 id 的情況你決定，照你的最佳判斷。」執行者依授權決定：同訂單編號、不同事件 id 的 OrderPlaced 也視為已處理過，不重複保留、不重複拒絕、回傳空陣列（一張訂單至多一筆保留紀錄，與 R-005 「不重複保留」一致，避免同一訂單占兩份庫存）。即兩層去重：事件 id（processed_event）＋ 訂單編號（stock_reservation.order_id）。
- **寫回位置**：矩陣 R-INVENTORY_RESERVATION-005 pre_conditions（同 id 或不同 id 同訂單）；R-000／001／002／003／008／009／010 pre_conditions 加「該事件 id 未處理過」；erm.dbml processed_event 表與 stock_reservation.order_id note；policy-defaults.md POLICY-001
- **時間戳**：2026-11-01 03:01
