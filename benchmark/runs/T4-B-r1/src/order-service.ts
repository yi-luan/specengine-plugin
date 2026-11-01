import { nextEventId } from './ids.js';
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './shop.js';

const TIMEOUT_MS = 15 * 60 * 1000;
const ID_PREFIX = 'ord';

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

const TERMINAL: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['CANCELLED', 'REJECTED', 'FAILED']);
const CANCELLABLE: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['PENDING', 'CONFIRMED']);

function isPositiveInteger(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1;
}

function isNonEmptyString(s: unknown): boolean {
  return typeof s === 'string' && s.length > 0;
}

export function createOrderService(): OrderService {
  // Insertion-ordered so tick() emits cancellations in placement order.
  const orders = new Map<string, Order>();

  function cancel(order: Order, reason: CancelReason): Event {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: nextEventId(ID_PREFIX), type: 'OrderCancelled', orderId: order.orderId };
  }

  function placeOrder(input: PlaceOrderInput): CommandResult {
    if (
      !isNonEmptyString(input.orderId) ||
      !isNonEmptyString(input.customerId) ||
      !isNonEmptyString(input.sku) ||
      !isPositiveInteger(input.qty) ||
      !isPositiveInteger(input.amount)
    ) {
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
    const placed: Event = {
      id: nextEventId(ID_PREFIX),
      type: 'OrderPlaced',
      orderId: input.orderId,
      customerId: input.customerId,
      sku: input.sku,
      qty: input.qty,
      amount: input.amount,
      at: input.at,
    };
    return { ok: true, events: [placed] };
  }

  function cancelOrder(orderId: string, _at: string): CommandResult {
    const order = orders.get(orderId);
    if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
    if (!CANCELLABLE.has(order.status)) return { ok: false, reason: 'NOT_CANCELLABLE' };
    return { ok: true, events: [cancel(order, 'CUSTOMER')] };
  }

  function tick(now: string): Event[] {
    const nowMs = Date.parse(now);
    const emitted: Event[] = [];
    for (const order of orders.values()) {
      if (order.status !== 'PENDING') continue;
      if (nowMs >= Date.parse(order.placedAt) + TIMEOUT_MS) {
        emitted.push(cancel(order, 'TIMEOUT'));
      }
    }
    return emitted;
  }

  function handle(event: Event): Event[] {
    const order = orders.get(event.orderId);
    if (!order || TERMINAL.has(order.status)) return [];
    // Only PENDING orders transition on events; CONFIRMED changes solely via cancelOrder.
    if (order.status !== 'PENDING') return [];
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
        break;
    }
    return [];
  }

  function getOrder(orderId: string): { status: OrderStatus; cancelReason?: CancelReason } | undefined {
    const order = orders.get(orderId);
    if (!order) return undefined;
    return order.status === 'CANCELLED' && order.cancelReason
      ? { status: order.status, cancelReason: order.cancelReason }
      : { status: order.status };
  }

  return { placeOrder, cancelOrder, tick, handle, getOrder };
}
