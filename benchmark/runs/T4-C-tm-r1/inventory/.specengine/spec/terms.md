# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 庫存服務 | 三個服務之一，負責保留與放回商品庫存 | `src/inventory.ts` 的 `createInventoryService(stock)`，實作 `InventoryService` | INVENTORY_RESERVATION |
| 初始庫存表 | 建立庫存服務時給的「SKU → 數量」對照表 | `createInventoryService(stock: Record<string, number>)` 的參數 | INVENTORY_RESERVATION |
| SKU | 商品的唯一代號 | inventory_stock.sku；事件 `OrderPlaced.sku` | INVENTORY_RESERVATION |
| 可用庫存 | 某 SKU 目前還可以供新訂單保留的數量 | inventory_stock.available；`getAvailable(sku)` 回傳值 | INVENTORY_RESERVATION |
| 下單數量 | 一張訂單要買的數量 | 事件 `OrderPlaced.qty`（整數） | INVENTORY_RESERVATION |
| 保留 | 為一張訂單把對應數量從可用庫存扣住，不讓其他訂單使用 | stock_reservation（status = RESERVED），available 減 qty | INVENTORY_RESERVATION |
| 放回 | 把某訂單保留的數量加回可用庫存 | stock_reservation.status = RELEASED，available 加 qty | INVENTORY_RESERVATION |
| 庫存足夠 | 可用庫存 >= 下單數量 | R-INVENTORY_RESERVATION-000 的前置條件 | INVENTORY_RESERVATION |
| 庫存不足 | 可用庫存 < 下單數量 | R-INVENTORY_RESERVATION-001 的前置條件；stock_reservation.status = REJECTED | INVENTORY_RESERVATION |
| 訂單編號 | 一張訂單的唯一識別 | 事件欄位 `orderId`；stock_reservation.order_id | INVENTORY_RESERVATION |
| 事件 | 服務之間唯一的溝通方式，由事件匯流排廣播給所有服務的 `handle` | `src/events.ts` 的 `Event` 聯集型別 | INVENTORY_RESERVATION |
| 事件 id | 每個事件的唯一識別，由發出事件的服務自行產生，全系統唯一 | `Event.id` | INVENTORY_RESERVATION |
| 下單事件 | 訂單服務建立訂單後發出的事件 | `OrderPlaced { orderId, customerId, sku, qty, amount, at }` | INVENTORY_RESERVATION |
| 庫存已保留事件 | 庫存服務保留成功後發出的事件 | `StockReserved { orderId }` | INVENTORY_RESERVATION |
| 庫存不足事件 | 庫存服務因庫存不足拒絕保留時發出的事件 | `StockRejected { orderId }` | INVENTORY_RESERVATION |
| 庫存已放回事件 | 庫存服務放回保留庫存後發出的事件 | `StockReleased { orderId }` | INVENTORY_RESERVATION |
| 付款失敗事件 | 付款服務扣款失敗時發出的事件 | `PaymentFailed { orderId }` | INVENTORY_RESERVATION |
| 訂單已取消事件 | 訂單服務取消訂單（顧客取消或逾時）後發出的事件 | `OrderCancelled { orderId }` | INVENTORY_RESERVATION |
| 不關心的事件 | 庫存服務收到但與自己無關、直接回傳空陣列的事件 | `StockReserved`、`StockRejected`、`StockReleased`、`PaymentSucceeded`、`PaymentRefunded` | INVENTORY_RESERVATION |
| 重複送達 | 事件匯流排至少送達一次，同一事件可能送到兩次以上 | 需求第 8 點；R-INVENTORY_RESERVATION-005／006 | INVENTORY_RESERVATION |
| 亂序送達 | 事件匯流排不保證先後順序，後發的事件可能先到 | 需求第 8 點 | INVENTORY_RESERVATION |
| 已結束 | 放回事件（訂單已取消／付款失敗）比下單事件先到時，庫存服務記住這張訂單已結束，之後的下單事件不再保留 | stock_reservation.status = ENDED；R-INVENTORY_RESERVATION-008／009 | INVENTORY_RESERVATION |
| 已處理事件 | 庫存服務已經處理過的事件 id，同 id 第二次起忽略 | processed_event.event_id | INVENTORY_RESERVATION |
| 未知 SKU | 初始庫存表沒有列的 SKU，視為可用庫存 0 | `getAvailable` 回傳 0；R-INVENTORY_RESERVATION-001／007 | INVENTORY_RESERVATION |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
