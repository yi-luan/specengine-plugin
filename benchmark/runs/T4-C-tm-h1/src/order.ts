// 由負責 OrderService 的工程師實作。
// 規格：.specengine/spec/features/訂單服務.feature（Rule R-ORDER_SERVICE-000 ～ 014）
// 規格決策：.specengine/sdd/resolved/ 與 .specengine/spec/exclusions.md
import { randomUUID } from 'node:crypto';
import type { CommandResult, Event, OrderService, OrderStatus, PlaceOrderInput } from './events.js';

const TIMEOUT_MS = 15 * 60 * 1000; // 決策：滿 15 分鐘（含）即逾時（POLICY-004）

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

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  // 決策：同一事件 id 第二次起直接忽略（R-ORDER_SERVICE-014）
  const handledEventIds = new Set<string>();

  function cancel(order: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: randomUUID(), type: 'OrderCancelled', orderId: order.orderId };
  }

  function isValidInput(input: PlaceOrderInput): boolean {
    return (
      Number.isInteger(input.qty) && input.qty > 0 &&
      Number.isInteger(input.amount) && input.amount > 0 &&
      input.orderId !== '' && input.customerId !== '' && input.sku !== ''
    );
  }

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      // 決策：輸入不合法 → INVALID_INPUT（R-004）；先於重複檢查
      if (!isValidInput(input)) return { ok: false, reason: 'INVALID_INPUT' };
      // 決策：訂單編號重複 → DUPLICATE_ORDER（R-005）
      if (orders.has(input.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER' };

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
        events: [{
          id: randomUUID(),
          type: 'OrderPlaced',
          orderId: input.orderId,
          customerId: input.customerId,
          sku: input.sku,
          qty: input.qty,
          amount: input.amount,
          at: input.at,
        }],
      };
    },

    cancelOrder(orderId: string, _at: string): CommandResult {
      // 決策：取消時間參數不寫入訂單、不影響判定（X-ORDER_SERVICE-004）
      const order = orders.get(orderId);
      if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
      // 決策：處理中與已確認可取消（R-006、R-007）；其餘為 NOT_CANCELLABLE（R-008）
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return { ok: false, reason: 'NOT_CANCELLABLE' };
      }
      return { ok: true, events: [cancel(order, 'CUSTOMER')] };
    },

    tick(now: string): Event[] {
      const events: Event[] = [];
      const nowMs = Date.parse(now);
      for (const order of orders.values()) {
        // 決策：只有處理中訂單會逾時（R-010）；現在時間早於下單時間視為未逾時（R-011）
        if (order.status !== 'PENDING') continue;
        const elapsed = nowMs - Date.parse(order.placedAt);
        if (elapsed >= TIMEOUT_MS) events.push(cancel(order, 'TIMEOUT'));
      }
      return events;
    },

    handle(event: Event): Event[] {
      if (handledEventIds.has(event.id)) return [];
      handledEventIds.add(event.id);

      // 決策：只有處理中訂單接受結果事件；終態不被覆寫（R-001～R-003、R-013）
      switch (event.type) {
        case 'PaymentSucceeded':
        case 'StockRejected':
        case 'PaymentFailed': {
          const order = orders.get(event.orderId);
          if (!order || order.status !== 'PENDING') return [];
          order.status = event.type === 'PaymentSucceeded'
            ? 'CONFIRMED'
            : event.type === 'StockRejected' ? 'REJECTED' : 'FAILED';
          return [];
        }
        default:
          // 不關心的事件型別（X-ORDER_SERVICE-001、002）
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
