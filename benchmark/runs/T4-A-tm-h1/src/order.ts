// 由負責 OrderService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

// 下單後 15 分鐘內未完成付款，自動取消。
const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

type CancelReason = 'CUSTOMER' | 'TIMEOUT';

type Order = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: number;
  status: OrderStatus;
  cancelReason?: CancelReason;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// 解析 ISO 8601 時間字串；無法解析回傳 undefined。
function parseTime(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

function newEventId(): string {
  return `order-evt-${randomUUID()}`;
}

export function createOrderService(): OrderService {
  const orders = new Map<string, Order>();
  // 已處理過的事件 id，用來吸收重複送達。
  const seenEventIds = new Set<string>();

  function placeOrder(input: PlaceOrderInput): CommandResult {
    if (!isNonEmptyString(input.orderId)) return { ok: false, reason: 'INVALID_ORDER_ID' };
    if (!isNonEmptyString(input.customerId)) return { ok: false, reason: 'INVALID_CUSTOMER_ID' };
    if (!isNonEmptyString(input.sku)) return { ok: false, reason: 'INVALID_SKU' };
    if (!isPositiveInteger(input.qty)) return { ok: false, reason: 'INVALID_QTY' };
    if (!isPositiveInteger(input.amount)) return { ok: false, reason: 'INVALID_AMOUNT' };
    const placedAt = parseTime(input.at);
    if (placedAt === undefined) return { ok: false, reason: 'INVALID_TIME' };
    if (orders.has(input.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER' };

    orders.set(input.orderId, {
      orderId: input.orderId,
      customerId: input.customerId,
      sku: input.sku,
      qty: input.qty,
      amount: input.amount,
      placedAt,
      status: 'PENDING',
    });

    return {
      ok: true,
      events: [
        {
          id: newEventId(),
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
  }

  function cancelOrder(orderId: string, at: string): CommandResult {
    if (parseTime(at) === undefined) return { ok: false, reason: 'INVALID_TIME' };
    const order = orders.get(orderId);
    if (!order) return { ok: false, reason: 'NOT_FOUND' };
    // 只有處理中（尚未付款成功）或已確認的訂單可以取消；
    // 已被拒絕、付款失敗或已取消的訂單不能再取消。
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      return { ok: false, reason: `INVALID_STATE:${order.status}` };
    }
    order.status = 'CANCELLED';
    order.cancelReason = 'CUSTOMER';
    return { ok: true, events: [{ id: newEventId(), type: 'OrderCancelled', orderId }] };
  }

  function tick(now: string): Event[] {
    const nowMs = parseTime(now);
    if (nowMs === undefined) return [];
    const events: Event[] = [];
    for (const order of orders.values()) {
      if (order.status !== 'PENDING') continue;
      if (nowMs - order.placedAt >= PAYMENT_TIMEOUT_MS) {
        order.status = 'CANCELLED';
        order.cancelReason = 'TIMEOUT';
        events.push({ id: newEventId(), type: 'OrderCancelled', orderId: order.orderId });
      }
    }
    return events;
  }

  function handle(event: Event): Event[] {
    if (seenEventIds.has(event.id)) return [];
    seenEventIds.add(event.id);

    switch (event.type) {
      case 'StockRejected': {
        const order = orders.get(event.orderId);
        if (order?.status === 'PENDING') order.status = 'REJECTED';
        return [];
      }
      case 'PaymentSucceeded': {
        const order = orders.get(event.orderId);
        if (order?.status === 'PENDING') order.status = 'CONFIRMED';
        return [];
      }
      case 'PaymentFailed': {
        const order = orders.get(event.orderId);
        if (order?.status === 'PENDING') order.status = 'FAILED';
        return [];
      }
      default:
        // 其他事件與訂單服務無關，直接忽略。
        return [];
    }
  }

  function getOrder(orderId: string): { status: OrderStatus; cancelReason?: CancelReason } | undefined {
    const order = orders.get(orderId);
    if (!order) return undefined;
    return order.cancelReason === undefined
      ? { status: order.status }
      : { status: order.status, cancelReason: order.cancelReason };
  }

  return { placeOrder, cancelOrder, tick, handle, getOrder };
}
