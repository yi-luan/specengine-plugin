# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 顧客下單後由訂單服務建立並保存的一筆紀錄 | orders | ORDER_SERVICE |
| 訂單編號 | 顧客下單時指定、用來識別訂單的字串 | orders.order_id / PlaceOrderInput.orderId | ORDER_SERVICE |
| 顧客 | 下單與取消訂單的人 | orders.customer_id / PlaceOrderInput.customerId | ORDER_SERVICE |
| 商品 SKU | 被訂購商品的識別字 | orders.sku / PlaceOrderInput.sku | ORDER_SERVICE |
| 數量 | 訂購件數，整數 | orders.qty / PlaceOrderInput.qty | ORDER_SERVICE |
| 金額 | 訂單應付金額，整數 | orders.amount / PlaceOrderInput.amount | ORDER_SERVICE |
| 下單時間 | 顧客下單的時間，ISO 8601 字串 | orders.placed_at / PlaceOrderInput.at | ORDER_SERVICE |
| 處理中 | 訂單剛建立、尚未得到庫存與付款結果的狀態 | OrderStatus 'PENDING' | ORDER_SERVICE |
| 已確認 | 付款成功後的訂單狀態 | OrderStatus 'CONFIRMED' | ORDER_SERVICE |
| 庫存不足 | 庫存服務拒絕保留後的訂單狀態 | OrderStatus 'REJECTED' | ORDER_SERVICE |
| 付款失敗 | 付款服務扣款失敗後的訂單狀態 | OrderStatus 'FAILED' | ORDER_SERVICE |
| 已取消 | 顧客取消或逾時自動取消後的訂單狀態 | OrderStatus 'CANCELLED' | ORDER_SERVICE |
| 取消原因 | 訂單被取消的原因：顧客取消或逾時 | getOrder().cancelReason 'CUSTOMER' / 'TIMEOUT' | ORDER_SERVICE |
| 逾時 | 下單後 15 分鐘內沒有完成付款 | R-ORDER_SERVICE-005；cancelReason 'TIMEOUT' | ORDER_SERVICE |
| 時間推進 | 整合端告知訂單服務「現在時間是 now」，訂單服務據此處理逾時 | OrderService.tick(now) | ORDER_SERVICE |
| 下單 | 顧客建立訂單的動作 | OrderService.placeOrder(input) | ORDER_SERVICE |
| 取消訂單 | 顧客主動取消訂單的動作 | OrderService.cancelOrder(orderId, at) | ORDER_SERVICE |
| 查詢訂單 | 讀取某張訂單目前狀態與取消原因 | OrderService.getOrder(orderId) | ORDER_SERVICE |
| 命令結果 | 下單或取消的回傳：成功帶事件清單，失敗帶原因文字 | CommandResult | ORDER_SERVICE |
| 事件 | 服務之間唯一的溝通方式，每個事件有全系統唯一 id | Event | ORDER_SERVICE |
| 已下單事件 | 訂單服務建立訂單後發出的事件 | Event 'OrderPlaced' | ORDER_SERVICE |
| 庫存已保留事件 | 庫存服務保留庫存成功時發出 | Event 'StockReserved' | ORDER_SERVICE |
| 庫存不足事件 | 庫存服務庫存不夠時發出 | Event 'StockRejected' | ORDER_SERVICE |
| 庫存已放回事件 | 庫存服務放回保留庫存時發出 | Event 'StockReleased' | ORDER_SERVICE |
| 付款成功事件 | 付款服務扣款成功時發出 | Event 'PaymentSucceeded' | ORDER_SERVICE |
| 付款失敗事件 | 付款服務餘額不足時發出 | Event 'PaymentFailed' | ORDER_SERVICE |
| 已退款事件 | 付款服務退款後發出 | Event 'PaymentRefunded' | ORDER_SERVICE |
| 訂單已取消事件 | 訂單服務取消訂單（顧客或逾時）後發出 | Event 'OrderCancelled' | ORDER_SERVICE |
| 重複送達 | 同一事件（相同 id）被傳遞機制送達一次以上 | R-ORDER_SERVICE-006 | ORDER_SERVICE |
| 庫存服務 | 同事負責、處理庫存保留與放回的服務 | InventoryService（src/inventory.ts，本專案中為空殼） | ORDER_SERVICE |
| 付款服務 | 同事負責、處理扣款與退款的服務 | PaymentService（src/payment.ts，本專案中為空殼） | ORDER_SERVICE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | NOT_CANCELLABLE | R-ORDER_SERVICE-009：對「庫存不足」「付款失敗」「已取消」的訂單取消時的 CommandResult.reason | resolved/features/訂單服務_已結束訂單的取消.md、resolved/features/訂單服務_重複取消.md |
| MSG-002 | ORDER_NOT_FOUND | R-ORDER_SERVICE-010：取消不存在訂單時的 CommandResult.reason | resolved/features/訂單服務_取消不存在的訂單.md |
| MSG-003 | DUPLICATE_ORDER | R-ORDER_SERVICE-011：以已使用的訂單編號再次下單時的 CommandResult.reason | resolved/features/訂單服務_重複訂單編號下單.md |
| MSG-004 | INVALID_INPUT | R-ORDER_SERVICE-012：數量／金額非正整數或識別字為空字串時的 CommandResult.reason | resolved/features/訂單服務_數量不合法的下單.md、resolved/features/訂單服務_金額不合法的下單.md、resolved/features/訂單服務_識別字空字串的下單.md |

註：上列文案為機器可讀的原因碼（全大寫 SNAKE_CASE），`.feature` 的 Then 與產品代碼逐字沿用。
