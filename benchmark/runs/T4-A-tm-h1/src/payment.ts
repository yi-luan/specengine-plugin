// 由負責 PaymentService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { Event, PaymentService } from './events.js';

// 每張訂單在付款服務內的狀態。
// 付款服務只靠廣播事件得知訂單資訊，各事件到達順序不保證，所以每個欄位都可能晚到。
type OrderRecord = {
  customerId?: string;      // 來自 OrderPlaced
  amount?: number;          // 來自 OrderPlaced
  reserved: boolean;        // 是否已收到 StockReserved
  cancelled: boolean;       // 是否已收到 OrderCancelled
  decided: boolean;         // 是否已做過扣款決定（成功或失敗），之後不再扣款
  outcome?: 'PAID' | 'FAILED' | 'REFUNDED';
};

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balanceOf: Record<string, number> = { ...balances };
  const orders = new Map<string, OrderRecord>();
  const seenEventIds = new Set<string>();

  function record(orderId: string): OrderRecord {
    let rec = orders.get(orderId);
    if (!rec) {
      rec = { reserved: false, cancelled: false, decided: false };
      orders.set(orderId, rec);
    }
    return rec;
  }

  function newEvent<T extends Omit<Event, 'id'>>(e: T): Event {
    return { id: `payment-${randomUUID()}`, ...e } as Event;
  }

  // 條件齊備（訂單資訊已知、庫存已保留、未取消、尚未決定）時才扣款。
  function tryCharge(orderId: string): Event[] {
    const rec = record(orderId);
    if (rec.decided || rec.cancelled || !rec.reserved || rec.customerId === undefined || rec.amount === undefined) {
      return [];
    }
    rec.decided = true;
    const customerId = rec.customerId;
    const amount = rec.amount;
    const balance = balanceOf[customerId] ?? 0;
    if (balance >= amount) {
      balanceOf[customerId] = balance - amount;
      rec.outcome = 'PAID';
      return [newEvent({ type: 'PaymentSucceeded', orderId, amount })];
    }
    rec.outcome = 'FAILED';
    return [newEvent({ type: 'PaymentFailed', orderId })];
  }

  // 只有已扣款的訂單才退款，且只退一次。
  function tryRefund(orderId: string): Event[] {
    const rec = record(orderId);
    if (rec.outcome !== 'PAID' || rec.customerId === undefined || rec.amount === undefined) {
      return [];
    }
    balanceOf[rec.customerId] = (balanceOf[rec.customerId] ?? 0) + rec.amount;
    rec.outcome = 'REFUNDED';
    return [newEvent({ type: 'PaymentRefunded', orderId, amount: rec.amount })];
  }

  return {
    handle(event: Event): Event[] {
      // 事件可能重複送達，同一個事件 id 只處理一次。
      if (seenEventIds.has(event.id)) return [];
      seenEventIds.add(event.id);

      switch (event.type) {
        case 'OrderPlaced': {
          const rec = record(event.orderId);
          if (rec.customerId === undefined) {
            rec.customerId = event.customerId;
            rec.amount = event.amount;
          }
          return tryCharge(event.orderId);
        }
        case 'StockReserved': {
          record(event.orderId).reserved = true;
          return tryCharge(event.orderId);
        }
        case 'OrderCancelled': {
          record(event.orderId).cancelled = true;
          return tryRefund(event.orderId);
        }
        // 付款服務不關心的事件（庫存結果、其他付款結果）直接忽略。
        default:
          return [];
      }
    },

    getBalance(customerId: string): number {
      return balanceOf[customerId] ?? 0;
    },
  };
}
