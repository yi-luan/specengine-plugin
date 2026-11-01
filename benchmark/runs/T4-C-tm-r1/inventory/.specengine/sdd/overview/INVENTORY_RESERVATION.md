# 模組總覽：INVENTORY_RESERVATION（庫存保留）

- 核心切片：庫存服務收到 OrderPlaced 後保留庫存（足夠 → StockReserved；不足／未知 SKU／qty <= 0 → StockRejected），收到 PaymentFailed／OrderCancelled 後放回保留庫存並發 StockReleased；重複與亂序送達下不重複保留、不重複放回，放回事件先到則記住已結束。
- 範圍：僅 `src/inventory.ts`（`createInventoryService` 與 `InventoryService.handle`／`getAvailable`）。訂單狀態、扣款退款、事件匯流排屬其他模組（見 exclusions.md）。
- 建立版本：2.1.0

## 問題統計

| 優先級 | 待答 | 掛起 | 已解決 |
| :--- | ---: | ---: | ---: |
| High | 0 | 0 | 3 |
| Medium | 0 | 0 | 4 |
| Low | 0 | 0 | 0 |

## 待答佇列

（空；spec-02 於 2026-11-01 03:01 全部解決，歸檔於 resolved/）

## 已解決清單

1. resolved/features/INVENTORY_RESERVATION_取消訂單放回庫存時是否發出StockReleased.md → R-002／003／006
2. resolved/features/INVENTORY_RESERVATION_重複收到同一訂單OrderPlaced的回應.md → R-005、POLICY-001
3. resolved/features/INVENTORY_RESERVATION_沒有可放回庫存時收到放回事件的回應.md → R-006、POLICY-002
4. resolved/data/INVENTORY_RESERVATION_重複送達的判定依據.md → R-005、processed_event、POLICY-001
5. resolved/features/INVENTORY_RESERVATION_放回事件先於下單事件到達.md → R-008／009、POLICY-003
6. resolved/data/INVENTORY_RESERVATION_初始庫存表沒有的SKU.md → R-001／007
7. resolved/features/INVENTORY_RESERVATION_下單數量為零或負數.md → R-010

## 本輪套用的慣例

- spec-01：無（policy-defaults.md 當時尚無條目）
- spec-02 晉升：POLICY-001、POLICY-002、POLICY-003

## 流程對齊

- 矩陣 11 條 Rule（超過小模組門檻 4 條），需走 `spec flow-align`。
