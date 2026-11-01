# Data Model: 訂單服務

## Order（記憶體內，`Map<string, Order>`）

| 欄位 | 型別 | 規則 |
|------|------|------|
| orderId | string | 唯一鍵；非空 |
| customerId | string | 非空 |
| sku | string | 非空 |
| qty | number | 正整數（`Number.isInteger(q) && q > 0`） |
| amount | number | 正整數 |
| placedAt | string (ISO 8601) | 來自 `PlaceOrderInput.at`；逾時起算點 |
| status | `OrderStatus` | `PENDING` → 見狀態轉移 |
| cancelReason | `'CUSTOMER' \| 'TIMEOUT' \| undefined` | 僅 `CANCELLED` 時有值 |

## 已處理事件集合

- `processedEventIds: Set<string>` — `handle` 收到的每個事件 id（不論是否關心）都加入；重複即回 `[]`。

## 事件序號

- `seq: number` — 產生 `order-${++seq}` 作為自發事件 id。

## 狀態轉移

| 目前狀態 | 觸發 | 新狀態 | cancelReason | 發出事件 |
|----------|------|--------|--------------|----------|
| (無) | `placeOrder` 合法 | PENDING | – | `OrderPlaced` |
| PENDING | `PaymentSucceeded` | CONFIRMED | – | 無 |
| PENDING | `StockRejected` | REJECTED | – | 無 |
| PENDING | `PaymentFailed` | FAILED | – | 無 |
| PENDING | `cancelOrder` | CANCELLED | CUSTOMER | `OrderCancelled` |
| CONFIRMED | `cancelOrder` | CANCELLED | CUSTOMER | `OrderCancelled` |
| PENDING | `tick(now)`，now − placedAt ≥ 15 min | CANCELLED | TIMEOUT | `OrderCancelled` |
| CONFIRMED | 任何事件 | 不變 | – | 無 |
| REJECTED / FAILED / CANCELLED | 任何事件、`cancelOrder`、`tick` | 不變 | 不變 | 無（`cancelOrder` 回 `NOT_CANCELLABLE`） |
| 任何 | `OrderPlaced`/`StockReserved`/`StockReleased`/`PaymentRefunded`/`OrderCancelled` | 不變 | – | 無 |

終態：`REJECTED`、`FAILED`、`CANCELLED`。`CONFIRMED` 僅可被 `cancelOrder` 改變。

## 命令結果

- `placeOrder`：`{ ok: true, events: [OrderPlaced] }` ／ `{ ok: false, reason: 'INVALID_INPUT' | 'DUPLICATE_ORDER' }`
- `cancelOrder`：`{ ok: true, events: [OrderCancelled] }` ／ `{ ok: false, reason: 'ORDER_NOT_FOUND' | 'NOT_CANCELLABLE' }`
- `getOrder`：`{ status }` 或 `{ status: 'CANCELLED', cancelReason }`；不存在回 `undefined`
