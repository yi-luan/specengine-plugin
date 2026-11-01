// 由負責 OrderService 的工程師實作。
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

type OrderRecord = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: string;
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
};

const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

// 決定性事件 id：每筆訂單的 OrderPlaced、OrderCancelled 各只會由本服務發出一次，
// 因此 id 在全系統唯一，且重送或重試不會產生新的 id。
const placedId = (orderId: string) => `order:${orderId}:OrderPlaced`;
const cancelledId = (orderId: string) => `order:${orderId}:OrderCancelled`;

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();

  function cancel(order: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: cancelledId(order.orderId), type: 'OrderCancelled', orderId: order.orderId };
  }

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      if (!Number.isInteger(input.qty) || input.qty <= 0) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      if (!Number.isInteger(input.amount) || input.amount < 0) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      if (orders.has(input.orderId)) {
        return { ok: false, reason: 'DUPLICATE_ORDER' };
      }
      orders.set(input.orderId, {
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        placedAt: input.at,
        status: 'PENDING',
      });
      return {
        ok: true,
        events: [
          {
            id: placedId(input.orderId),
            type: 'OrderPlaced',
            orderId: input.orderId,
            customerId: input.customerId,
            sku: input.sku,
            qty: input.qty,
            amount: input.amount,
            at: input.at,
          },
        ],
      };
    },

    cancelOrder(orderId: string, _at: string): CommandResult {
      const order = orders.get(orderId);
      if (order === undefined) {
        return { ok: false, reason: 'ORDER_NOT_FOUND' };
      }
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return { ok: false, reason: 'NOT_CANCELLABLE' };
      }
      return { ok: true, events: [cancel(order, 'CUSTOMER')] };
    },

    tick(now: string): Event[] {
      const nowMs = Date.parse(now);
      const events: Event[] = [];
      for (const order of orders.values()) {
        if (order.status !== 'PENDING') continue;
        if (nowMs - Date.parse(order.placedAt) >= PAYMENT_TIMEOUT_MS) {
          events.push(cancel(order, 'TIMEOUT'));
        }
      }
      return events;
    },

    handle(event: Event): Event[] {
      // 只有來自 PENDING 的付款／庫存結果才會轉換狀態；其餘（含重複與終態後的晚到事件）忽略。
      switch (event.type) {
        case 'PaymentSucceeded':
          transitionFromPending(event.orderId, 'CONFIRMED');
          return [];
        case 'StockRejected':
          transitionFromPending(event.orderId, 'REJECTED');
          return [];
        case 'PaymentFailed':
          transitionFromPending(event.orderId, 'FAILED');
          return [];
        default:
          return [];
      }
    },

    getOrder(orderId: string) {
      const order = orders.get(orderId);
      if (order === undefined) return undefined;
      return { status: order.status, cancelReason: order.cancelReason };
    },
  };

  function transitionFromPending(orderId: string, next: OrderStatus): void {
    const order = orders.get(orderId);
    if (order !== undefined && order.status === 'PENDING') {
      order.status = next;
    }
  }
}
