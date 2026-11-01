# 需求：事件驅動下單流程（訂單、庫存、付款三個服務）

系統由三個獨立的服務組成，服務之間不共用資料，只透過事件溝通。

1. 顧客下單（訂單編號、顧客、商品 SKU、數量、金額），訂單服務建立訂單，狀態為「處理中」，並發出 `OrderPlaced`。
2. 庫存服務收到 `OrderPlaced` 後保留庫存：庫存足夠就發出 `StockReserved`，不夠就發出 `StockRejected`。
3. 付款服務收到 `StockReserved` 後向顧客扣款：餘額足夠就扣款並發出 `PaymentSucceeded`，不夠就發出 `PaymentFailed`。
4. 訂單服務收到 `PaymentSucceeded` 時訂單變為「已確認」；收到 `StockRejected` 時變為「庫存不足」；收到 `PaymentFailed` 時變為「付款失敗」。
5. 付款失敗時，庫存服務要把為這張訂單保留的庫存放回去，並發出 `StockReleased`。
6. 顧客可以取消訂單。取消後訂單服務發出 `OrderCancelled`，庫存服務放回保留的庫存，付款服務把已扣的款項退還給顧客並發出 `PaymentRefunded`。
7. 下單後 15 分鐘內沒有完成付款的訂單，要自動取消。
8. 事件傳遞機制保證每個事件至少送達一次，但可能重複送達，也不保證送達的先後順序。
9. 所有金額與數量都是整數。

## 技術介面（固定，不可更名）

在 `src/shop.ts` 匯出：

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
  tick(now: string): Event[];                       // 時間推進到 now，回傳因此發出的事件
  handle(event: Event): Event[];                    // 收到一個事件，回傳因此發出的事件
  getOrder(orderId: string): { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined;
}
export interface InventoryService {
  handle(event: Event): Event[];
  getAvailable(sku: string): number;                // 目前可供保留的庫存
}
export interface PaymentService {
  handle(event: Event): Event[];
  getBalance(customerId: string): number;
}

export function createOrderService(): OrderService;
export function createInventoryService(stock: Record<string, number>): InventoryService;
export function createPaymentService(balances: Record<string, number>): PaymentService;
```

- 三個服務各自只保存自己的狀態，彼此不能直接呼叫或讀取對方的狀態。
- 每個事件都會廣播給三個服務的 `handle`；服務對自己不關心的事件類型直接回傳空陣列。
- 各服務自行產生事件 `id`，必須在全系統內唯一。
- 時間一律為 ISO 8601 字串，例如 `'2026-06-15T12:00:00Z'`。
- 不碰資料庫或網路，全部在記憶體中。
