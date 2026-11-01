// 由負責 PaymentService 的工程師實作。
// 只保存付款服務自己的狀態：顧客餘額與每筆訂單的付款紀錄。
import type { Event, PaymentService } from './events.js';

type PaymentStatus =
  | 'AWAITING_ORDER' // 已收到庫存保留，等待訂單資訊（暫存）
  | 'UNPAID' // 已有訂單資訊，尚未扣款
  | 'CHARGED' // 已扣款成功，尚未退款
  | 'FAILED' // 付款失敗（餘額不足），終態
  | 'REFUNDED' // 已退款，終態
  | 'CANCELLED'; // 訂單已取消且未扣款

interface PaymentRecord {
  status: PaymentStatus;
  customerId?: string; // 尚未收到 OrderPlaced 時為 undefined
  amount?: number; // 尚未收到 OrderPlaced 時為 undefined
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map<string, number>(Object.entries(balances));
  const payments = new Map<string, PaymentRecord>();
  let seq = 0;
  const nextId = (): string => {
    seq += 1;
    return `pay-${seq}`;
  };

  // 依餘額判定扣款或付款失敗；僅在有訂單資訊時呼叫。
  function settle(orderId: string, rec: PaymentRecord, customerId: string, amount: number): Event[] {
    const current = balance.get(customerId) ?? 0;
    if (current >= amount) {
      balance.set(customerId, current - amount);
      rec.status = 'CHARGED';
      return [{ id: nextId(), type: 'PaymentSucceeded', orderId, amount }];
    }
    rec.status = 'FAILED';
    return [{ id: nextId(), type: 'PaymentFailed', orderId }];
  }

  function onOrderPlaced(e: Extract<Event, { type: 'OrderPlaced' }>): Event[] {
    const rec = payments.get(e.orderId);
    if (rec === undefined) {
      payments.set(e.orderId, { status: 'UNPAID', customerId: e.customerId, amount: e.amount });
      return [];
    }
    if (rec.customerId !== undefined) {
      return []; // 重複的 OrderPlaced
    }
    // 先到的庫存保留或取消：補上訂單資訊
    rec.customerId = e.customerId;
    rec.amount = e.amount;
    if (rec.status === 'AWAITING_ORDER') {
      return settle(e.orderId, rec, e.customerId, e.amount);
    }
    return [];
  }

  function onStockReserved(e: Extract<Event, { type: 'StockReserved' }>): Event[] {
    const rec = payments.get(e.orderId);
    if (rec === undefined) {
      payments.set(e.orderId, { status: 'AWAITING_ORDER' });
      return [];
    }
    if (rec.status === 'UNPAID' && rec.customerId !== undefined && rec.amount !== undefined) {
      return settle(e.orderId, rec, rec.customerId, rec.amount);
    }
    return []; // 重複、已取消、或已有結果
  }

  function onOrderCancelled(e: Extract<Event, { type: 'OrderCancelled' }>): Event[] {
    const rec = payments.get(e.orderId);
    if (rec === undefined) {
      payments.set(e.orderId, { status: 'CANCELLED' });
      return [];
    }
    if (rec.status === 'CHARGED' && rec.customerId !== undefined && rec.amount !== undefined) {
      balance.set(rec.customerId, (balance.get(rec.customerId) ?? 0) + rec.amount);
      rec.status = 'REFUNDED';
      return [{ id: nextId(), type: 'PaymentRefunded', orderId: e.orderId, amount: rec.amount }];
    }
    if (rec.status === 'UNPAID' || rec.status === 'AWAITING_ORDER') {
      rec.status = 'CANCELLED'; // 暫存的庫存保留就此作廢
    }
    return []; // FAILED / REFUNDED / CANCELLED 不再變動
  }

  return {
    handle(event: Event): Event[] {
      switch (event.type) {
        case 'OrderPlaced':
          return onOrderPlaced(event);
        case 'StockReserved':
          return onStockReserved(event);
        case 'OrderCancelled':
          return onOrderCancelled(event);
        default:
          return []; // 與付款無關的事件（含自己發出的事件）
      }
    },
    getBalance(customerId: string): number {
      return balance.get(customerId) ?? 0;
    },
  };
}
