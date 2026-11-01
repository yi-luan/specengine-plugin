# Contract: `src/order.ts`

介面由 `src/events.ts` 固定（不可更名）。本檔描述訂單服務對每個方法的承諾。

```ts
export function createOrderService(): OrderService;
```

## `placeOrder(input: PlaceOrderInput): CommandResult`

| 條件 | 結果 |
|------|------|
| `orderId`／`customerId`／`sku` 為空字串，或 `qty`／`amount` 非正整數 | `{ ok: false, reason: 'INVALID_INPUT' }`，無副作用 |
| `orderId` 已存在 | `{ ok: false, reason: 'DUPLICATE_ORDER' }`，無副作用 |
| 合法 | 建立 PENDING 訂單；`{ ok: true, events: [{ id: 'order-N', type: 'OrderPlaced', orderId, customerId, sku, qty, amount, at }] }` |

## `cancelOrder(orderId: string, at: string): CommandResult`

| 條件 | 結果 |
|------|------|
| 訂單不存在 | `{ ok: false, reason: 'ORDER_NOT_FOUND' }` |
| 狀態為 REJECTED／FAILED／CANCELLED | `{ ok: false, reason: 'NOT_CANCELLABLE' }`，狀態與 cancelReason 不變 |
| 狀態為 PENDING／CONFIRMED | 狀態 → CANCELLED，cancelReason `CUSTOMER`；`{ ok: true, events: [{ id, type: 'OrderCancelled', orderId }] }` |

`at` 不用於逾時判定（C3）。

## `tick(now: string): Event[]`

- 對每張 PENDING 訂單，若 `Date.parse(now) - Date.parse(placedAt) >= 900_000`：狀態 → CANCELLED，cancelReason `TIMEOUT`，回傳陣列加入一個 `OrderCancelled`。
- 其他訂單不變。回傳順序依訂單建立順序。
- 已取消的訂單不會再次出現在後續 `tick` 的回傳中。

## `handle(event: Event): Event[]`

- 永遠回傳 `[]`（訂單服務不會因收到事件而發出事件）。
- 事件 id 已處理過 → 不變。
- `PaymentSucceeded`／`StockRejected`／`PaymentFailed`：訂單存在且 PENDING 時分別 → CONFIRMED／REJECTED／FAILED；否則不變（含訂單不存在）。
- 其他事件型別：不變。
- 不比對 `PaymentSucceeded.amount`。

## `getOrder(orderId: string)`

- 不存在 → `undefined`
- 存在 → `{ status }`；若 CANCELLED → `{ status: 'CANCELLED', cancelReason: 'CUSTOMER' | 'TIMEOUT' }`
- 回傳新物件，呼叫方修改不影響內部狀態。

## 事件 id

- 格式 `order-<n>`，n 自 1 遞增；同一服務實例內唯一，前綴避免與其他服務碰撞。
