// 付款服務（負責人：付款服務工程師）。
// 規格來源：.specengine/spec/features/付款服務.feature（R-PAYMENT-000 至 006）
// 決策紀錄：.specengine/sdd/resolved/features/、.specengine/spec/policy-defaults.md
import type { Event, PaymentService } from './events.js';

type ChargeRecord = { customerId: string; amount: number; status: 'CHARGED' | 'REFUNDED' };

// 測試用觀察器（不在 PaymentService 介面內）：讀取訂單紀錄，供 tests/support 使用。
export type PaymentInspection = {
  chargeOf(orderId: string): number | undefined;
  statusOf(orderId: string): 'CHARGED' | 'REFUNDED' | 'CANCELLED' | undefined;
  pendingOf(orderId: string): boolean;
};

const inspectors = new WeakMap<PaymentService, PaymentInspection>();

export function inspectPayment(service: PaymentService): PaymentInspection {
  const inspector = inspectors.get(service);
  if (!inspector) throw new Error('inspectPayment: 不是由 createPaymentService 建立的服務');
  return inspector;
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balanceOf = new Map<string, number>(Object.entries(balances));
  const orders = new Map<string, { customerId: string; amount: number }>();
  const charges = new Map<string, ChargeRecord>();
  const cancelled = new Set<string>();
  const pending = new Set<string>(); // 先到的庫存保留（等待下單事件），POLICY-004
  const processed = new Set<string>(); // 已處理過的事件 id，POLICY-001

  // 依餘額判定扣款或付款失敗（R-PAYMENT-000／001）。餘額 >= 金額視為足夠（POLICY-002）。
  // 未知顧客餘額視為 0（balanceOf 無此鍵時）。
  function settle(orderId: string): Event[] {
    const order = orders.get(orderId)!;
    const balance = balanceOf.get(order.customerId) ?? 0;
    if (balance >= order.amount) {
      balanceOf.set(order.customerId, balance - order.amount);
      charges.set(orderId, { customerId: order.customerId, amount: order.amount, status: 'CHARGED' });
      return [{ id: `PAY-${orderId}-PaymentSucceeded`, type: 'PaymentSucceeded', orderId, amount: order.amount }];
    }
    return [{ id: `PAY-${orderId}-PaymentFailed`, type: 'PaymentFailed', orderId }];
  }

  const service: PaymentService = {
    handle(event: Event): Event[] {
      switch (event.type) {
        case 'OrderPlaced': {
          orders.set(event.orderId, { customerId: event.customerId, amount: event.amount });
          if (pending.delete(event.orderId)) return settle(event.orderId); // R-PAYMENT-003
          return [];
        }
        case 'StockReserved': {
          if (processed.has(event.id)) return []; // R-PAYMENT-004
          processed.add(event.id);
          if (cancelled.has(event.orderId)) return []; // R-PAYMENT-006
          if (!orders.has(event.orderId)) {
            pending.add(event.orderId); // R-PAYMENT-003：暫存，不設時間上限
            return [];
          }
          return settle(event.orderId); // R-PAYMENT-000／001
        }
        case 'OrderCancelled': {
          if (processed.has(event.id)) return []; // R-PAYMENT-004
          processed.add(event.id);
          cancelled.add(event.orderId);
          pending.delete(event.orderId); // R-PAYMENT-005：丟棄暫存
          const charge = charges.get(event.orderId);
          if (!charge || charge.status !== 'CHARGED') return []; // R-PAYMENT-005：未扣款或已退款，不退款
          balanceOf.set(charge.customerId, (balanceOf.get(charge.customerId) ?? 0) + charge.amount);
          charge.status = 'REFUNDED'; // R-PAYMENT-002：只退一次
          return [{ id: `PAY-${event.orderId}-PaymentRefunded`, type: 'PaymentRefunded', orderId: event.orderId, amount: charge.amount }];
        }
        default:
          return [];
      }
    },
    getBalance(customerId: string): number {
      return balanceOf.get(customerId) ?? 0;
    },
  };

  inspectors.set(service, {
    chargeOf: (orderId) => charges.get(orderId)?.amount,
    statusOf: (orderId) => charges.get(orderId)?.status ?? (cancelled.has(orderId) ? 'CANCELLED' : undefined),
    pendingOf: (orderId) => pending.has(orderId),
  });

  return service;
}
