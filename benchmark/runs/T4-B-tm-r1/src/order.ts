// 由負責 OrderService 的工程師實作。
//
// 訂單服務：記憶體內保存訂單，透過事件與庫存／付款服務溝通。
// 規格：specs/001-order-service/spec.md；契約：specs/001-order-service/contracts/order-service.md
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

type CancelReason = 'CUSTOMER' | 'TIMEOUT';

type Order = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: string;
  status: OrderStatus;
  cancelReason?: CancelReason;
};

/** 下單後 15 分鐘內未完成付款即逾時（now − placedAt ≥ 15 分鐘）。 */
const TIMEOUT_MS = 15 * 60 * 1000;

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isNonEmptyString = (s: unknown): s is string => typeof s === 'string' && s.length > 0;

export function createOrderService(): OrderService {
  const orders = new Map<string, Order>();
  /** 已處理過的事件 id；事件至少送達一次、可能重複，重複者直接忽略。 */
  const processed = new Set<string>();
  let seq = 0;
  /** 自發事件 id：服務前綴 + 遞增序號，與其他服務不碰撞。 */
  const nextId = (): string => `order-${++seq}`;

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      const { orderId, customerId, sku, qty, amount, at } = input;
      if (
        !isNonEmptyString(orderId) ||
        !isNonEmptyString(customerId) ||
        !isNonEmptyString(sku) ||
        !isPositiveInt(qty) ||
        !isPositiveInt(amount)
      ) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      if (orders.has(orderId)) {
        return { ok: false, reason: 'DUPLICATE_ORDER' };
      }
      orders.set(orderId, { orderId, customerId, sku, qty, amount, placedAt: at, status: 'PENDING' });
      return {
        ok: true,
        events: [{ id: nextId(), type: 'OrderPlaced', orderId, customerId, sku, qty, amount, at }],
      };
    },

    cancelOrder(orderId: string, _at: string): CommandResult {
      const order = orders.get(orderId);
      if (!order) {
        return { ok: false, reason: 'ORDER_NOT_FOUND' };
      }
      // 只有 PENDING 與 CONFIRMED 可由顧客取消；REJECTED／FAILED／CANCELLED 為終態。
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return { ok: false, reason: 'NOT_CANCELLABLE' };
      }
      order.status = 'CANCELLED';
      order.cancelReason = 'CUSTOMER';
      return { ok: true, events: [{ id: nextId(), type: 'OrderCancelled', orderId }] };
    },

    tick(now: string): Event[] {
      const nowMs = Date.parse(now);
      const emitted: Event[] = [];
      for (const order of orders.values()) {
        if (order.status !== 'PENDING') continue;
        if (nowMs - Date.parse(order.placedAt) >= TIMEOUT_MS) {
          order.status = 'CANCELLED';
          order.cancelReason = 'TIMEOUT';
          emitted.push({ id: nextId(), type: 'OrderCancelled', orderId: order.orderId });
        }
      }
      return emitted;
    },

    handle(event: Event): Event[] {
      if (processed.has(event.id)) return [];
      processed.add(event.id);

      const order = orders.get(event.orderId);
      // 結果事件只在 PENDING 時生效；CONFIRMED 只能由顧客取消改變，其餘為終態。
      if (!order || order.status !== 'PENDING') return [];

      switch (event.type) {
        case 'PaymentSucceeded':
          order.status = 'CONFIRMED';
          break;
        case 'StockRejected':
          order.status = 'REJECTED';
          break;
        case 'PaymentFailed':
          order.status = 'FAILED';
          break;
        default:
          // OrderPlaced / StockReserved / StockReleased / PaymentRefunded / OrderCancelled：不關心。
          break;
      }
      return [];
    },

    getOrder(orderId: string) {
      const order = orders.get(orderId);
      if (!order) return undefined;
      return order.status === 'CANCELLED' && order.cancelReason
        ? { status: order.status, cancelReason: order.cancelReason }
        : { status: order.status };
    },
  };
}
