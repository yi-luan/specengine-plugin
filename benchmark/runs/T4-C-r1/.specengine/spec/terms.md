# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 顧客一次下單的紀錄，由訂單服務保存 | orders | ORDER_SAGA |
| 訂單編號 | 顧客下單時提供的識別字，全系統用它串起三個服務的事件 | orders.order_id / Event.orderId | ORDER_SAGA |
| 顧客 | 下單與被扣款的人 | orders.customer_id / customer_balances.customer_id | ORDER_SAGA |
| 商品 SKU | 商品的庫存識別字 | orders.sku / inventory_stock.sku | ORDER_SAGA |
| 數量 | 下單的商品件數，整數 | orders.qty | ORDER_SAGA |
| 金額 | 訂單要向顧客收的錢，整數 | orders.amount | ORDER_SAGA |
| 訂單狀態 | 訂單目前走到哪一步 | orders.status（OrderStatus） | ORDER_SAGA |
| 處理中 | 已下單、尚未有最終結果 | OrderStatus = PENDING | ORDER_SAGA |
| 已確認 | 付款成功，訂單成立 | OrderStatus = CONFIRMED | ORDER_SAGA |
| 庫存不足 | 庫存服務拒絕保留後的訂單狀態 | OrderStatus = REJECTED | ORDER_SAGA |
| 付款失敗 | 付款服務扣款失敗後的訂單狀態 | OrderStatus = FAILED | ORDER_SAGA |
| 已取消 | 顧客取消或逾時自動取消後的訂單狀態 | OrderStatus = CANCELLED | ORDER_SAGA |
| 取消原因 | 訂單是顧客取消還是逾時自動取消 | orders.cancel_reason（CUSTOMER / TIMEOUT） | ORDER_SAGA |
| 可用庫存 | 某 SKU 目前還能被保留的件數 | inventory_stock.available / getAvailable(sku) | ORDER_SAGA |
| 保留庫存 | 為某張訂單預先扣住的件數，付款失敗或取消時放回 | stock_reservations | ORDER_SAGA |
| 放回庫存 | 把保留的件數加回可用庫存 | stock_reservations.released = true | ORDER_SAGA |
| 餘額 | 顧客在付款服務裡可被扣的錢 | customer_balances.balance / getBalance(customerId) | ORDER_SAGA |
| 扣款 | 從顧客餘額扣除訂單金額 | payment_charges | ORDER_SAGA |
| 退款 | 把已扣的款項加回顧客餘額 | payment_charges.refunded = true | ORDER_SAGA |
| 逾時 | 下單後 15 分鐘內未完成付款 | orders.placed_at + 15 分鐘 | ORDER_SAGA |
| 時間推進 | 告訴訂單服務「現在幾點」，讓它處理逾時 | OrderService.tick(now) | ORDER_SAGA |
| 事件 | 服務之間唯一的溝通方式，會廣播給三個服務 | Event | ORDER_SAGA |
| 事件 id | 每個事件全系統唯一的識別字，用於重複送達時去重 | Event.id / processed_events.event_id | ORDER_SAGA |
| 重複送達 | 同一事件被送到同一服務超過一次 | processed_events | ORDER_SAGA |
| 亂序送達 | 事件到達順序與發出順序不同 | — | ORDER_SAGA |
| 指令結果 | placeOrder / cancelOrder 的回傳，成功帶事件、失敗帶原因 | CommandResult | ORDER_SAGA |
| 已下單 | 訂單服務建立訂單後發出的事件 | Event.type = OrderPlaced | ORDER_SAGA |
| 庫存已保留 | 庫存服務保留成功後發出的事件 | Event.type = StockReserved | ORDER_SAGA |
| 庫存已拒絕 | 庫存服務因庫存不足發出的事件 | Event.type = StockRejected | ORDER_SAGA |
| 庫存已放回 | 庫存服務放回保留庫存後發出的事件 | Event.type = StockReleased | ORDER_SAGA |
| 付款成功 | 付款服務扣款成功後發出的事件 | Event.type = PaymentSucceeded | ORDER_SAGA |
| 付款失敗事件 | 付款服務因餘額不足發出的事件 | Event.type = PaymentFailed | ORDER_SAGA |
| 已退款 | 付款服務退款後發出的事件 | Event.type = PaymentRefunded | ORDER_SAGA |
| 訂單已取消 | 訂單服務取消訂單後發出的事件 | Event.type = OrderCancelled | ORDER_SAGA |
| 已結束的訂單 | 庫存／付款服務收到終結事件（OrderCancelled；庫存服務另含 PaymentFailed）後記下的訂單，之後晚到的上游事件不再處理 | inventory_ended_orders / payment_orders.status = ENDED | ORDER_SAGA |
| 終態 | 訂單一旦進入就不再被任何事件改變的狀態：CANCELLED、REJECTED、FAILED | orders.status | ORDER_SAGA |
| 正整數 | 大於 0 的整數 | orders.qty / orders.amount | ORDER_SAGA |
| 等待下單事件的保留 | 付款服務因亂序先收到 StockReserved、尚未收到 OrderPlaced 的訂單；OrderPlaced 到達時立即扣款 | payment_orders.status = RESERVED_AWAITING_ORDER | ORDER_SAGA |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | ORDER_NOT_FOUND | R-ORDER_SAGA-019 取消不存在的訂單時 CommandResult.reason | resolved/features/ORDER_SAGA_取消訂單_拒絕時的原因文案.md |
| MSG-002 | NOT_CANCELLABLE | R-ORDER_SAGA-020 取消 REJECTED／FAILED／CANCELLED 訂單時 CommandResult.reason | resolved/features/ORDER_SAGA_取消訂單_拒絕時的原因文案.md |
| MSG-003 | DUPLICATE_ORDER | R-ORDER_SAGA-017 重複訂單編號下單時 CommandResult.reason | resolved/features/ORDER_SAGA_下單_重複的訂單編號.md |
| MSG-004 | INVALID_INPUT | R-ORDER_SAGA-018 下單輸入不合法時 CommandResult.reason | resolved/features/ORDER_SAGA_下單_數量與金額的輸入驗證.md |
