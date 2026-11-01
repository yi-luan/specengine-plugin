// 由負責 PaymentService 的工程師實作。
// 規格：.specengine/spec/features/付款服務.feature；行為矩陣 .specengine/sdd/matrix/PAYMENT.json。
import { randomUUID } from 'node:crypto';
import type { Event, PaymentService } from './events.js';

/** 訂單在付款服務內的狀態，枚舉見 .specengine/spec/erm.dbml payment_order.status */
type PaymentOrderStatus = 'AWAITING_ORDER' | 'AWAITING_STOCK' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

type PaymentOrder = {
  customerId?: string;
  amount?: number;
  status: PaymentOrderStatus;
};

export function createPaymentService(balances: Record<string, number>): PaymentService {
  // 初始餘額表複製一份，避免外部物件被改動
  const balanceOf = new Map<string, number>(Object.entries(balances));
  const orders = new Map<string, PaymentOrder>();
  // 已處理過的事件 id：相同 id 第二次起一律忽略。決策見 .specengine/sdd/resolved/features/PAYMENT_F-002_重複送達已處理完的事件.md
  const processedEventIds = new Set<string>();

  // 不在初始餘額表的顧客視為餘額 0。決策見 .specengine/sdd/resolved/data/PAYMENT_D-001_初始餘額表沒有的顧客.md
  const getBalance = (customerId: string): number => balanceOf.get(customerId) ?? 0;
  const newEventId = (): string => `pay-${randomUUID()}`;

  /** 訂單已有顧客與金額、且狀態為等待扣款時，做扣款判斷並回傳結果事件（R-PAYMENT-000／001／010） */
  function settle(orderId: string, order: PaymentOrder): Event[] {
    const customerId = order.customerId as string;
    const amount = order.amount as number;
    // 金額 >= 0 且餘額 >= 金額才扣款；0 元視為足夠、負數視為無效。決策見 .specengine/sdd/resolved/features/PAYMENT_F-005_訂單金額為零或負數.md
    if (amount >= 0 && getBalance(customerId) >= amount) {
      balanceOf.set(customerId, getBalance(customerId) - amount);
      order.status = 'PAID';
      return [{ id: newEventId(), type: 'PaymentSucceeded', orderId, amount }];
    }
    order.status = 'FAILED';
    return [{ id: newEventId(), type: 'PaymentFailed', orderId }];
  }

  function handleOrderPlaced(event: Extract<Event, { type: 'OrderPlaced' }>): Event[] {
    const order = orders.get(event.orderId);
    if (!order) {
      // R-PAYMENT-002：首次收到下單事件，只記錄
      orders.set(event.orderId, { customerId: event.customerId, amount: event.amount, status: 'AWAITING_STOCK' });
      return [];
    }
    if (order.status === 'AWAITING_ORDER') {
      // R-PAYMENT-008：庫存已保留先到，補到下單資料後立即判斷。決策見 .specengine/sdd/resolved/features/PAYMENT_F-001_庫存已保留先於下單事件到達.md
      order.customerId = event.customerId;
      order.amount = event.amount;
      return settle(event.orderId, order);
    }
    // R-PAYMENT-009（已取消）／R-PAYMENT-015（已有記錄，保留第一次資料）
    return [];
  }

  function handleStockReserved(event: Extract<Event, { type: 'StockReserved' }>): Event[] {
    const order = orders.get(event.orderId);
    if (!order) {
      // R-PAYMENT-007：尚未收到下單事件，先記住庫存已保留
      orders.set(event.orderId, { status: 'AWAITING_ORDER' });
      return [];
    }
    if (order.status === 'AWAITING_STOCK') {
      // R-PAYMENT-000／001／010
      return settle(event.orderId, order);
    }
    // R-PAYMENT-009（已取消）／012（已扣款、已退款）／014（付款失敗不重試）／AWAITING_ORDER 重複保留：一律忽略
    return [];
  }

  function handleOrderCancelled(event: Extract<Event, { type: 'OrderCancelled' }>): Event[] {
    const order = orders.get(event.orderId);
    if (order && order.status === 'PAID') {
      // R-PAYMENT-003：已扣款則全額退款，同一張訂單最多退一次
      const customerId = order.customerId as string;
      const amount = order.amount as number;
      balanceOf.set(customerId, getBalance(customerId) + amount);
      order.status = 'REFUNDED';
      return [{ id: newEventId(), type: 'PaymentRefunded', orderId: event.orderId, amount }];
    }
    if (!order) {
      // R-PAYMENT-004：尚無記錄也要記住已取消。決策見 .specengine/sdd/resolved/features/PAYMENT_F-003_訂單已取消後才收到庫存已保留.md
      orders.set(event.orderId, { status: 'CANCELLED' });
      return [];
    }
    if (order.status === 'AWAITING_ORDER' || order.status === 'AWAITING_STOCK' || order.status === 'FAILED') {
      // R-PAYMENT-004：從未扣款成功，記住已取消、不退款
      order.status = 'CANCELLED';
    }
    // R-PAYMENT-013：已退款或已取消再收到取消，不重複退款
    return [];
  }

  return {
    handle(event: Event): Event[] {
      // R-PAYMENT-005：不關心的事件類型直接回傳空陣列
      if (event.type !== 'OrderPlaced' && event.type !== 'StockReserved' && event.type !== 'OrderCancelled') return [];
      // R-PAYMENT-011：相同 id 第二次起一律忽略
      if (processedEventIds.has(event.id)) return [];
      processedEventIds.add(event.id);
      switch (event.type) {
        case 'OrderPlaced':
          return handleOrderPlaced(event);
        case 'StockReserved':
          return handleStockReserved(event);
        case 'OrderCancelled':
          return handleOrderCancelled(event);
      }
    },
    getBalance,
  };
}
