# Data Model: 庫存服務

服務只在記憶體中保存以下狀態（對應 `createInventoryService(stock)` 的閉包變數）。

## SKU 庫存 `available: Map<string, number>`

- key：SKU
- value：目前可供保留的整數數量
- 初始值：複製自工廠函式的 `stock` 參數（不保留對呼叫端物件的參照）
- 不變式：`0 ≤ available[sku] ≤ 初始庫存[sku]`；缺少的 SKU 視為 0

## 訂單紀錄 `orders: Map<string, OrderRecord>`

```text
OrderRecord = { sku: string; qty: number; status: OrderState }
OrderState  = RESERVED | REJECTED | RELEASED | CANCELLED | FAILED
```

| 狀態 | 進入條件 | 之後的行為 |
|------|----------|------------|
| RESERVED | OrderPlaced 且庫存足夠 | OrderCancelled 或 PaymentFailed → 放回數量，轉為 RELEASED，回傳 StockReleased |
| REJECTED | OrderPlaced 且庫存不足、數量無效、或 SKU 未知 | 任何後續事件都不改變庫存、不回傳事件 |
| RELEASED | 從 RESERVED 放回 | 任何後續事件都不改變庫存、不回傳事件 |
| CANCELLED | OrderCancelled 先於 OrderPlaced 抵達 | 後到的 OrderPlaced 回傳 `[]`；不保留庫存 |
| FAILED | PaymentFailed 先於 OrderPlaced 抵達 | 後到的 OrderPlaced 回傳 `[]`；不保留庫存 |

## 已處理事件 id `seenEventIds: Set<string>`

- 每個進入 `handle` 的事件 `id` 都加入集合
- 集合中已存在的 `id` 直接回傳 `[]`，不改任何狀態

## 狀態轉移摘要

```text
(無紀錄) --OrderPlaced(足夠)--> RESERVED --PaymentFailed/OrderCancelled--> RELEASED
(無紀錄) --OrderPlaced(不足)--> REJECTED
(無紀錄) --OrderCancelled/PaymentFailed--> CANCELLED / FAILED   (之後的 OrderPlaced 被忽略)
```
