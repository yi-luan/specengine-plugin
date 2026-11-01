// 由負責 OrderService 的工程師實作。
// 規格：.specengine/spec/features/訂單服務.feature；行為矩陣：.specengine/sdd/matrix/ORDER_SERVICE.json
import { randomUUID } from 'node:crypto';
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

type CancelReason = 'CUSTOMER' | 'TIMEOUT';

type OrderRecord = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: string;
  placedAtMs: number;
  status: OrderStatus;
  cancelReason?: CancelReason;
};

/** 下單後 15 分鐘未完成付款即自動取消（需求第 7 點）；剛好 15 分鐘即算逾時，決策見 .specengine/sdd/resolved/features/訂單服務_逾時15分鐘的邊界.md */
const TIMEOUT_MS = 15 * 60 * 1000;

/** 固定原因碼，逐字沿用 .specengine/spec/terms.md「固定文案」節 */
const REASON = {
  NOT_CANCELLABLE: 'NOT_CANCELLABLE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  DUPLICATE_ORDER: 'DUPLICATE_ORDER',
  INVALID_INPUT: 'INVALID_INPUT',
} as const;

const isPositiveInteger = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1;
const isNonEmptyString = (s: unknown): s is string => typeof s === 'string' && s.length > 0;

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  /** 已處理過的入站事件 id：事件至少送達一次且可能重複（需求第 8 點），以 id 去重 */
  const processedEventIds = new Set<string>();

  // 事件 id 格式為實作細節，只保證全系統唯一；裁示見 .specengine/sdd/flow-design/ORDER_SERVICE.md (d)
  const newEventId = (): string => `order-${randomUUID()}`;

  const cancel = (order: OrderRecord, reason: CancelReason): Event => {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: newEventId(), type: 'OrderCancelled', orderId: order.orderId };
  };

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      // 決策見 .specengine/sdd/resolved/features/訂單服務_數量不合法的下單.md、金額不合法的下單.md、識別字空字串的下單.md
      if (
        !isNonEmptyString(input.orderId) ||
        !isNonEmptyString(input.customerId) ||
        !isNonEmptyString(input.sku) ||
        !isPositiveInteger(input.qty) ||
        !isPositiveInteger(input.amount)
      ) {
        return { ok: false, reason: REASON.INVALID_INPUT };
      }
      // 決策見 .specengine/sdd/resolved/features/訂單服務_重複訂單編號下單.md
      if (orders.has(input.orderId)) {
        return { ok: false, reason: REASON.DUPLICATE_ORDER };
      }
      orders.set(input.orderId, {
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        placedAt: input.at,
        placedAtMs: Date.parse(input.at),
        status: 'PENDING',
      });
      const placed: Event = {
        id: newEventId(),
        type: 'OrderPlaced',
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        at: input.at,
      };
      return { ok: true, events: [placed] };
    },

    cancelOrder(orderId: string, _at: string): CommandResult {
      const order = orders.get(orderId);
      // 決策見 .specengine/sdd/resolved/features/訂單服務_取消不存在的訂單.md
      if (!order) return { ok: false, reason: REASON.ORDER_NOT_FOUND };
      // 可取消狀態：處理中、已確認；取消時間只記錄、不判定逾時。
      // 決策見 .specengine/sdd/resolved/features/訂單服務_已確認訂單可否取消.md、訂單服務_逾時後才取消的原因.md
      if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
        return { ok: true, events: [cancel(order, 'CUSTOMER')] };
      }
      // 決策見 .specengine/sdd/resolved/features/訂單服務_已結束訂單的取消.md、訂單服務_重複取消.md
      return { ok: false, reason: REASON.NOT_CANCELLABLE };
    },

    tick(now: string): Event[] {
      const nowMs = Date.parse(now);
      const emitted: Event[] = [];
      // 只有「處理中」會被逾時取消；決策見 .specengine/sdd/resolved/features/訂單服務_逾時適用的訂單狀態.md
      for (const order of orders.values()) {
        if (order.status !== 'PENDING') continue;
        if (nowMs - order.placedAtMs >= TIMEOUT_MS) emitted.push(cancel(order, 'TIMEOUT'));
      }
      return emitted;
    },

    handle(event: Event): Event[] {
      if (processedEventIds.has(event.id)) return [];
      processedEventIds.add(event.id);
      switch (event.type) {
        case 'PaymentSucceeded':
        case 'StockRejected':
        case 'PaymentFailed': {
          const order = orders.get(event.orderId);
          // 未知訂單一律忽略；決策見 .specengine/sdd/resolved/features/訂單服務_未知訂單的狀態事件.md
          if (!order) return [];
          // 終態不可逆、已確認只因顧客取消而改變；決策見 .specengine/sdd/resolved/features/訂單服務_最終狀態後再收到狀態事件.md
          if (order.status !== 'PENDING') return [];
          order.status = event.type === 'PaymentSucceeded' ? 'CONFIRMED' : event.type === 'StockRejected' ? 'REJECTED' : 'FAILED';
          return [];
        }
        default:
          // 不關心的事件（X-ORDER_SERVICE-001）直接回空陣列
          return [];
      }
    },

    getOrder(orderId: string) {
      const order = orders.get(orderId);
      if (!order) return undefined;
      return order.cancelReason === undefined
        ? { status: order.status }
        : { status: order.status, cancelReason: order.cancelReason };
    },
  };
}
