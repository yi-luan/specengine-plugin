// 由負責 PaymentService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { Event, PaymentService } from './events.js';

type OrderInfo = { customerId: string; amount: number };

type PaymentRecord = {
  // 從 OrderPlaced 得知的顧客與金額；StockReserved 可能先到，所以要等兩者都齊了才扣款
  info?: OrderInfo;
  reserved: boolean;
  cancelled: boolean;
  // 扣款結果：undefined = 尚未嘗試扣款
  charge?: { outcome: 'SUCCEEDED'; amount: number } | { outcome: 'FAILED' };
  refunded: boolean;
};

function newId(): string {
  return `pay-${randomUUID()}`;
}

function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isInteger(amount) && amount >= 0;
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  // 複製一份，不去動呼叫端傳進來的物件
  const ledger: Record<string, number> = { ...balances };
  const orders = new Map<string, PaymentRecord>();
  const seenEventIds = new Set<string>();

  function record(orderId: string): PaymentRecord {
    let r = orders.get(orderId);
    if (!r) {
      r = { reserved: false, cancelled: false, refunded: false };
      orders.set(orderId, r);
    }
    return r;
  }

  // 條件齊備（有訂單資料、庫存已保留、未取消、尚未扣過）時嘗試扣款
  function tryCharge(orderId: string, r: PaymentRecord): Event[] {
    if (!r.info || !r.reserved || r.cancelled || r.charge) return [];
    const { customerId, amount } = r.info;
    const balance = ledger[customerId] ?? 0;
    if (!isValidAmount(amount) || balance < amount) {
      r.charge = { outcome: 'FAILED' };
      return [{ id: newId(), type: 'PaymentFailed', orderId }];
    }
    ledger[customerId] = balance - amount;
    r.charge = { outcome: 'SUCCEEDED', amount };
    return [{ id: newId(), type: 'PaymentSucceeded', orderId, amount }];
  }

  // 已取消、已扣款且尚未退款時退款
  function tryRefund(orderId: string, r: PaymentRecord): Event[] {
    if (!r.cancelled || r.refunded || !r.charge || r.charge.outcome !== 'SUCCEEDED' || !r.info) return [];
    const { customerId } = r.info;
    const amount = r.charge.amount;
    ledger[customerId] = (ledger[customerId] ?? 0) + amount;
    r.refunded = true;
    return [{ id: newId(), type: 'PaymentRefunded', orderId, amount }];
  }

  return {
    handle(event: Event): Event[] {
      // 至少一次送達：同一個事件 id 重複送來，直接忽略
      if (seenEventIds.has(event.id)) return [];
      seenEventIds.add(event.id);

      switch (event.type) {
        case 'OrderPlaced': {
          const r = record(event.orderId);
          // 同一張訂單重複的 OrderPlaced 以第一次為準
          if (!r.info) r.info = { customerId: event.customerId, amount: event.amount };
          return tryCharge(event.orderId, r);
        }
        case 'StockReserved': {
          const r = record(event.orderId);
          r.reserved = true;
          return tryCharge(event.orderId, r);
        }
        case 'OrderCancelled': {
          const r = record(event.orderId);
          r.cancelled = true;
          return tryRefund(event.orderId, r);
        }
        default:
          return [];
      }
    },
    getBalance(customerId: string): number {
      return ledger[customerId] ?? 0;
    },
  };
}
