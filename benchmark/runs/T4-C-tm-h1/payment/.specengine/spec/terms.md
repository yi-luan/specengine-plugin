# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 顧客 | 下單與付款的對象 | customerId（字串） | PAYMENT |
| 顧客餘額 | 顧客目前可用於付款的金額 | balance_account.balance；PaymentService.getBalance(customerId) | PAYMENT |
| 訂單金額 | 訂單應付的整數金額 | OrderPlaced.amount | PAYMENT |
| 扣款 | 從顧客餘額扣除訂單金額 | 餘額減少，記錄 payment_charge | PAYMENT |
| 退款 | 把已扣的全額退回顧客餘額 | 餘額增加，payment_charge.status 改為 REFUNDED | PAYMENT |
| 付款服務 | 本模組，負責扣款與退款，不管訂單狀態與庫存 | src/payment.ts（createPaymentService） | PAYMENT |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |

# 命名規則

| 項目 | 規則 | 來源決策 |
| :--- | :--- | :--- |
| 付款服務發出的事件 id | `PAY-<orderId>-<事件類型>`，同一業務事件重發時 id 相同 | resolved/features/付款_事件識別碼產生方式.md |
