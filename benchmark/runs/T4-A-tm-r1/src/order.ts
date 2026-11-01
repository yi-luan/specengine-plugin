// 由負責 OrderService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

const TIMEOUT_MS = 15 * 60 * 1000;

type OrderRecord = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAtMs: number;
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
};

function parseIso(at: string): number | undefined {
  if (typeof at !== 'string' || at.trim() === '') return undefined;
  const ms = Date.parse(at);
  return Number.isNaN(ms) ? undefined : ms;
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function isNonNegativeInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  // 已處理過的事件 id：事件可能重複送達，用它做冪等。
  const seenEventIds = new Set<string>();

  const newId = (): string => `order-${randomUUID()}`;

  const cancel = (order: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event => {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: newId(), type: 'OrderCancelled', orderId: order.orderId };
  };

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      if (!input || typeof input.orderId !== 'string' || input.orderId === '') {
        return { ok: false, reason: '訂單編號不可為空' };
      }
      if (typeof input.customerId !== 'string' || input.customerId === '') {
        return { ok: false, reason: '顧客不可為空' };
      }
      if (typeof input.sku !== 'string' || input.sku === '') {
        return { ok: false, reason: '商品 SKU 不可為空' };
      }
      if (!isPositiveInt(input.qty)) {
        return { ok: false, reason: '數量必須是正整數' };
      }
      if (!isNonNegativeInt(input.amount)) {
        return { ok: false, reason: '金額必須是非負整數' };
      }
      const placedAtMs = parseIso(input.at);
      if (placedAtMs === undefined) {
        return { ok: false, reason: '下單時間格式錯誤' };
      }
      if (orders.has(input.orderId)) {
        return { ok: false, reason: '訂單編號已存在' };
      }

      orders.set(input.orderId, {
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        placedAtMs,
        status: 'PENDING',
      });

      return {
        ok: true,
        events: [
          {
            id: newId(),
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

    cancelOrder(orderId: string, at: string): CommandResult {
      const order = orders.get(orderId);
      if (!order) return { ok: false, reason: '找不到訂單' };
      if (parseIso(at) === undefined) return { ok: false, reason: '取消時間格式錯誤' };
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return { ok: false, reason: `訂單狀態為 ${order.status}，不可取消` };
      }
      return { ok: true, events: [cancel(order, 'CUSTOMER')] };
    },

    tick(now: string): Event[] {
      const nowMs = parseIso(now);
      if (nowMs === undefined) return [];
      const out: Event[] = [];
      for (const order of orders.values()) {
        if (order.status !== 'PENDING') continue;
        if (nowMs - order.placedAtMs >= TIMEOUT_MS) {
          out.push(cancel(order, 'TIMEOUT'));
        }
      }
      return out;
    },

    handle(event: Event): Event[] {
      if (!event || typeof event.id !== 'string') return [];
      if (seenEventIds.has(event.id)) return [];
      seenEventIds.add(event.id);

      switch (event.type) {
        case 'PaymentSucceeded':
        case 'StockRejected':
        case 'PaymentFailed': {
          const order = orders.get(event.orderId);
          // 不認識的訂單或已離開「處理中」的訂單：事件來晚了或重複了，一律忽略。
          if (!order || order.status !== 'PENDING') return [];
          if (event.type === 'PaymentSucceeded') order.status = 'CONFIRMED';
          else if (event.type === 'StockRejected') order.status = 'REJECTED';
          else order.status = 'FAILED';
          return [];
        }
        default:
          // OrderPlaced / StockReserved / StockReleased / PaymentRefunded / OrderCancelled：
          // 訂單服務不需據此改變狀態。
          return [];
      }
    },

    getOrder(orderId: string) {
      const order = orders.get(orderId);
      if (!order) return undefined;
      return order.cancelReason
        ? { status: order.status, cancelReason: order.cancelReason }
        : { status: order.status };
    },
  };
}
