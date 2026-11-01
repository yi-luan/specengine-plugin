# Contract: `src/shop.ts` public interface

Fixed by the requirement; names and shapes MUST NOT change (Constitution IV).

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

## Command results

| Call | Condition | Result |
|------|-----------|--------|
| `placeOrder` | `qty`/`amount` not positive integer, or `orderId`/`customerId`/`sku` is `''` | `{ ok: false, reason: 'INVALID_INPUT' }` |
| `placeOrder` | `orderId` already exists | `{ ok: false, reason: 'DUPLICATE_ORDER' }` |
| `placeOrder` | valid | `{ ok: true, events: [OrderPlaced] }`, order PENDING |
| `cancelOrder` | unknown order | `{ ok: false, reason: 'ORDER_NOT_FOUND' }` |
| `cancelOrder` | status REJECTED / FAILED / CANCELLED | `{ ok: false, reason: 'NOT_CANCELLABLE' }` |
| `cancelOrder` | status PENDING / CONFIRMED | `{ ok: true, events: [OrderCancelled] }`, CANCELLED/CUSTOMER |
| `tick(now)` | each PENDING order with `now >= placedAt + 15 min` | one `OrderCancelled` each, CANCELLED/TIMEOUT |
| `getOrder` | unknown | `undefined` |
| `getOrder` | CANCELLED | `{ status: 'CANCELLED', cancelReason }` |
| `getOrder` | other | `{ status }` (no `cancelReason` key) |

## Event producers and consumers

| Event | Produced by | Consumed by |
|-------|-------------|-------------|
| OrderPlaced | order (`placeOrder`) | inventory (reserve/reject), payment (remember details) |
| StockReserved | inventory | payment (charge when details known) |
| StockRejected | inventory | order (→ REJECTED) |
| StockReleased | inventory | nobody (informational) |
| PaymentSucceeded | payment | order (→ CONFIRMED) |
| PaymentFailed | payment | order (→ FAILED), inventory (release) |
| PaymentRefunded | payment | nobody (informational) |
| OrderCancelled | order (`cancelOrder`, `tick`) | inventory (release / close), payment (refund / block charge) |

Every service returns `[]` for any event type not listed as consumed by it, and for any event
whose (order, step) has already been performed.

## Delivery contract (caller side)

The caller broadcasts every returned event to all three `handle` methods. Delivery may be
duplicated and reordered; services must still converge to the states in
[data-model.md](../data-model.md).
