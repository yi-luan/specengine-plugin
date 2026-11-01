# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 付款服務 | 三個服務之一，負責向顧客扣款、退款，並回報付款結果 | `PaymentService`（`src/payment.ts` 的 `createPaymentService`） | PAYMENT |
| 顧客 | 下單並被扣款的人 | `customerId`（`customer_balance.customer_id`） | PAYMENT |
| 餘額 | 顧客目前可用來付款的錢，整數 | `customer_balance.balance`、`getBalance(customerId)` | PAYMENT |
| 初始餘額表 | 建立付款服務時給的每位顧客起始餘額 | `createPaymentService(balances)` 的 `balances` | PAYMENT |
| 訂單 | 顧客的一次下單，付款服務以訂單編號辨識 | `payment_order`（`orderId`） | PAYMENT |
| 訂單金額 | 這張訂單要向顧客收的錢，整數 | `OrderPlaced.amount`、`payment_order.amount` | PAYMENT |
| 扣款 | 從顧客餘額減去訂單金額 | `balance -= amount` | PAYMENT |
| 退款 | 把已扣的訂單金額加回顧客餘額 | `balance += amount` | PAYMENT |
| 事件 | 服務之間唯一的溝通方式，每個事件有全系統唯一的 id | `Event`（`src/events.ts`） | PAYMENT |
| 下單事件 | 訂單服務建立訂單時發出，帶顧客、金額等資料 | `OrderPlaced` | PAYMENT |
| 庫存已保留 | 庫存服務保留成功時發出，付款服務收到後扣款 | `StockReserved` | PAYMENT |
| 付款成功 | 付款服務扣款成功後發出 | `PaymentSucceeded`（含 `amount`） | PAYMENT |
| 付款失敗 | 付款服務餘額不足時發出 | `PaymentFailed` | PAYMENT |
| 已退款 | 付款服務退款後發出 | `PaymentRefunded`（含 `amount`） | PAYMENT |
| 訂單已取消 | 訂單服務在顧客取消或逾時自動取消時發出 | `OrderCancelled` | PAYMENT |
| 不關心的事件 | 付款服務收到後直接回傳空陣列的事件類型 | `StockRejected`、`StockReleased`、`PaymentSucceeded`、`PaymentFailed`、`PaymentRefunded` | PAYMENT |
| 至少一次送達 | 事件可能重複送達、也不保證先後順序 | 需求第 8 點 | PAYMENT |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
