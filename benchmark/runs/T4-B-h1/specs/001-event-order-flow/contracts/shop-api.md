# Contract: src/shop.ts 公開介面

本專案為 library，公開介面即契約。以下為必須逐字實作的內容（與需求的「技術介面（固定，不可更名）」一致）。

```ts
export type Event =
  | { id: string; type: 'OrderPlaced'; orderId: string; customerId: string; sku: string; qty: number; amount: number; at: string }
  | { id: string; type: 'StockReserved'; orderId: string }
  | { id: string; type: 'StockRejected'; orderId: string }
  | { id: string; type: 'StockReleased'; orderId: string }
  | { id: string; type: 'PaymentSucceeded'; orderId: string; amount: number }
  | { id: string; type: 'PaymentFailed'; orderId: string }
  | { id: string; type: 'PaymentRefunded'; orderId: string; amount: number }
  | { id: string; type: 'OrderCancelled'; orderId: string };

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

export type PlaceOrderInput = { orderId: string; customerId: string; sku: string; qty: number; amount: number; at: string };
export type CommandResult = { ok: true; events: Event[] } | { ok: false; reason: string };

export interface OrderService {
  placeOrder(input: PlaceOrderInput): CommandResult;
  cancelOrder(orderId: string, at: string): CommandResult;
  tick(now: string): Event[];
  handle(event: Event): Event[];
  getOrder(orderId: string): { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined;
}
export interface InventoryService {
  handle(event: Event): Event[];
  getAvailable(sku: string): number;
}
export interface PaymentService {
  handle(event: Event): Event[];
  getBalance(customerId: string): number;
}

export function createOrderService(): OrderService;
export function createInventoryService(stock: Record<string, number>): InventoryService;
export function createPaymentService(balances: Record<string, number>): PaymentService;
```

## 行為約定

- `placeOrder`：orderId 已存在時回傳 `{ ok: false, reason }`；成功時回傳 `{ ok: true, events: [OrderPlaced] }`。
- `cancelOrder(orderId, at)`：狀態為 `PENDING` 或 `CONFIRMED` 時回傳 `{ ok: true, events: [OrderCancelled] }`（`cancelReason = 'CUSTOMER'`）；其他狀態或不存在時回傳 `{ ok: false, reason }`。
- `tick(now)`：回傳因逾時而新增的 `OrderCancelled` 事件陣列（`cancelReason = 'TIMEOUT'`）。
- `handle(event)`：回傳因此事件產生的新事件；對不關心的事件型別回傳 `[]`。
- 事件由呼叫端（測試）廣播給三個服務的 `handle`。服務之間不得直接呼叫。
- 事件 id 格式 `<service>-<seq>`，例如 `order-1`、`stock-1`、`payment-1`。
