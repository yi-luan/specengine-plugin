# Contract: OrderService（src/order.ts）

由 `src/events.ts` 定義的 `OrderService` 介面，本服務實作並匯出：

```ts
// src/order.ts
export function createOrderService(): OrderService;
```

## 指令

| 方法 | 成功回傳 | 失敗回傳 reason |
|------|----------|-----------------|
| `placeOrder(input)` | `{ ok: true, events: [OrderPlaced] }` | `INVALID_INPUT`（數量或金額非整數／範圍不合法）、`DUPLICATE_ORDER`（orderId 已存在） |
| `cancelOrder(orderId, at)` | `{ ok: true, events: [OrderCancelled] }` | `ORDER_NOT_FOUND`、`NOT_CANCELLABLE`（狀態非 PENDING／CONFIRMED） |
| `tick(now)` | 因逾時而發出的 `OrderCancelled` 陣列（可能為空） | — |
| `handle(event)` | 因此發出的事件陣列（可能為空） | — |
| `getOrder(orderId)` | `{ status, cancelReason? }` 或 `undefined` | — |

## 事件

本服務發出的事件：

- `OrderPlaced { id: 'order:<orderId>:OrderPlaced', orderId, customerId, sku, qty, amount, at }`
- `OrderCancelled { id: 'order:<orderId>:OrderCancelled', orderId }`

本服務接收（`handle`）並處理的事件：`PaymentSucceeded`、`StockRejected`、`PaymentFailed`（僅 PENDING 來源有效）。其餘事件型別回傳 `[]`。

## 不變條件

- 同一事件重複送達：狀態與發出事件皆不變。
- 任何服務呼叫都不讀寫庫存或付款的狀態。
- 時間只來自參數（`at`、`now`），不讀系統時鐘。
