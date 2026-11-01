# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 顧客下的一筆購買，含訂單編號、顧客、商品 SKU、數量、金額 | orders | EVENT_DRIVEN_ORDER |
| 處理中 | 訂單剛建立，尚未完成庫存保留與付款 | orders.status = PENDING | EVENT_DRIVEN_ORDER |
| 已確認 | 付款成功，訂單完成 | orders.status = CONFIRMED | EVENT_DRIVEN_ORDER |
| 庫存不足 | 庫存服務判定可供保留庫存不夠，訂單不再往下進行 | orders.status = REJECTED | EVENT_DRIVEN_ORDER |
| 付款失敗 | 付款服務判定顧客餘額不夠扣款 | orders.status = FAILED | EVENT_DRIVEN_ORDER |
| 已取消 | 訂單因顧客取消或逾時而取消 | orders.status = CANCELLED | EVENT_DRIVEN_ORDER |
| 取消原因 | 取消的來源，CUSTOMER（顧客取消）或 TIMEOUT（逾時自動取消） | orders.cancel_reason | EVENT_DRIVEN_ORDER |
| 保留庫存 | 為某張訂單暫時鎖定的庫存數量 | reservations（status = HELD） | EVENT_DRIVEN_ORDER |
| 放回庫存 | 把為某張訂單保留的庫存還回可供保留的數量 | reservations（status = RELEASED） | EVENT_DRIVEN_ORDER |
| 可供保留庫存 | 商品目前可以再保留給新訂單的數量（總量減去已保留） | stock.total_qty 減去 reservations（HELD）的數量，對外為 getAvailable | EVENT_DRIVEN_ORDER |
| 扣款 | 付款服務從顧客餘額扣除訂單金額 | charges（status = CHARGED） | EVENT_DRIVEN_ORDER |
| 退款 | 付款服務把已扣的訂單金額全額退還顧客 | charges（status = REFUNDED） | EVENT_DRIVEN_ORDER |
| 逾時 | 下單後 15 分鐘內沒有完成付款 | orders.cancel_reason = TIMEOUT（門檻邊界待裁示） | EVENT_DRIVEN_ORDER |
| 事件 | 服務之間唯一的溝通方式，每個事件有全系統唯一的 id | 各 Event 型別 | EVENT_DRIVEN_ORDER |
| 至少一次傳遞 | 事件保證送達，但可能重複、不保證先後順序 | 消費端需對重複與亂序容忍 | EVENT_DRIVEN_ORDER |
| SKU | 商品的庫存單位代碼 | stock.sku、orders.sku | EVENT_DRIVEN_ORDER |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| ERR-001 | INVALID_INPUT | placeOrder 輸入不合法（qty／amount 非正整數，或 orderId／customerId／sku 為空字串）的 reason | 下單_非法輸入的處理.md |
| ERR-002 | DUPLICATE_ORDER | placeOrder 的 orderId 已存在的 reason | 下單_重複訂單編號.md |
| ERR-003 | NOT_CANCELLABLE | cancelOrder 對庫存不足、付款失敗、已取消訂單的 reason | 取消_終態訂單的取消請求.md |
| ERR-004 | ORDER_NOT_FOUND | cancelOrder 找不到訂單的 reason | 取消_終態訂單的取消請求.md |
