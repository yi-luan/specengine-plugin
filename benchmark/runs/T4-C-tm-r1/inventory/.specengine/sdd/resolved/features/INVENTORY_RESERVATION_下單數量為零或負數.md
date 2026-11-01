# 釐清問題
需求只說「所有金額與數量都是整數」，沒有說數量下限。若 `OrderPlaced` 的 `qty` 是 0 或負數（訂單服務沒擋住），庫存服務要怎麼做？

# 定位
R-INVENTORY_RESERVATION-000、R-INVENTORY_RESERVATION-001（模組 INVENTORY_RESERVATION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 照一般規則：0 永遠「庫存足夠」→ 保留 0 個並發 `StockReserved`；負數也照算（會讓可用庫存變多，有風險） |
| B | 視為不合法：`qty <= 0` 一律發出 `StockRejected`、庫存不變（庫存服務自我防禦；但「拒絕」語意與庫存不足混用） |
| C | 不是庫存服務的責任：假設訂單服務已驗證 `qty >= 1`，庫存服務不另外檢查、不寫規則（只處理 qty >= 1 的情境） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
是否新增「數量不合法」Rule 或 exclusions 條目；Scenario Outline 的邊界列。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
No

# 來源
spec-01

---
# 最終決策
- **決策選項**：使用者回覆「你決定，照你的最佳判斷」。執行者依授權選 B：`qty <= 0` 視為不合法，一律發出 `StockRejected`、庫存不變、該訂單記為已拒絕。理由：負數 qty 若照算會憑空增加可用庫存（A 的風險），C 則讓錯誤靜默通過；B 讓庫存服務自我防禦且不需新事件型別。
- **寫回位置**：矩陣新增 R-INVENTORY_RESERVATION-010；R-000／001 pre_conditions 加「qty >= 1」；erm.dbml stock_reservation.status note（REJECTED 含 qty <= 0）
- **時間戳**：2026-11-01 03:01
