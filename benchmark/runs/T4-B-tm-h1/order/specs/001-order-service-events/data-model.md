# Data Model: 訂單服務

僅有一個實體：訂單（Order）。只存在記憶體中，不持久化。

## OrderRecord（內部）

| 欄位 | 型別 | 說明 |
|------|------|------|
| orderId | string | 訂單編號，唯一鍵 |
| customerId | string | 顧客 |
| sku | string | 商品 SKU |
| qty | number | 數量，正整數 |
| amount | number | 金額，非負整數 |
| placedAt | string | 下單時間（ISO 8601，取自 `PlaceOrderInput.at`） |
| status | OrderStatus | `PENDING` / `CONFIRMED` / `REJECTED` / `FAILED` / `CANCELLED` |
| cancelReason | `'CUSTOMER' \| 'TIMEOUT'` \| undefined | 僅 `CANCELLED` 時有值 |

## 狀態轉換

| 目前狀態 | 事件／指令 | 新狀態 | 發出事件 |
|----------|-----------|--------|----------|
| （無） | placeOrder 合法 | PENDING | OrderPlaced |
| PENDING | PaymentSucceeded | CONFIRMED | — |
| PENDING | StockRejected | REJECTED | — |
| PENDING | PaymentFailed | FAILED | — |
| PENDING | StockReserved | PENDING（不變） | — |
| PENDING | cancelOrder | CANCELLED（CUSTOMER） | OrderCancelled |
| PENDING | tick，now ≥ placedAt + 15 分 | CANCELLED（TIMEOUT） | OrderCancelled |
| CONFIRMED | cancelOrder | CANCELLED（CUSTOMER） | OrderCancelled |
| CONFIRMED | tick | 不變（逾時不適用） | — |
| CONFIRMED | 任何付款／庫存事件 | 不變 | — |
| REJECTED／FAILED／CANCELLED | 任何事件或指令 | 不變 | — |

## 驗證規則

- `qty` 必須是正整數（`Number.isInteger(qty) && qty > 0`）。
- `amount` 必須是非負整數（`Number.isInteger(amount) && amount >= 0`）。
- `orderId` 不得已存在。
- 不合法時回傳 `{ ok: false, reason }`，不建立訂單、不發出事件。
