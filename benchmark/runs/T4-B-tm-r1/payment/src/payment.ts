// 由負責 PaymentService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { Event, PaymentService } from './events.js';

type PaymentState = 'NONE' | 'PAID' | 'FAILED' | 'REFUNDED';

/** Everything the payment service knows about one order (see specs/.../data-model.md). */
interface OrderRecord {
  customerId?: string;
  amount?: number;
  reserved: boolean;
  cancelled: boolean;
  payment: PaymentState;
  charged: number;
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  // Private copy so the caller's object is never mutated.
  const balanceOf = new Map<string, number>(Object.entries(balances));
  const orders = new Map<string, OrderRecord>();
  // Event-level idempotency: ids already handled (any type).
  const handled = new Set<string>();

  const newId = (): string => `pay-${randomUUID()}`;

  const getOrCreate = (orderId: string): OrderRecord => {
    let record = orders.get(orderId);
    if (!record) {
      record = { reserved: false, cancelled: false, payment: 'NONE', charged: 0 };
      orders.set(orderId, record);
    }
    return record;
  };

  /**
   * The single charge path. Runs after either OrderPlaced or StockReserved is recorded,
   * so it fires on whichever of the two arrives second. Charges only when the order
   * details are known, stock is reserved, the order is not cancelled and there is no
   * payment outcome yet (a failed charge is final).
   */
  const tryCharge = (orderId: string, record: OrderRecord): Event[] => {
    if (record.customerId === undefined || record.amount === undefined) return [];
    if (!record.reserved || record.cancelled || record.payment !== 'NONE') return [];

    const balance = balanceOf.get(record.customerId) ?? 0;
    if (balance >= record.amount) {
      balanceOf.set(record.customerId, balance - record.amount);
      record.payment = 'PAID';
      record.charged = record.amount;
      return [{ id: newId(), type: 'PaymentSucceeded', orderId, amount: record.amount }];
    }
    record.payment = 'FAILED';
    return [{ id: newId(), type: 'PaymentFailed', orderId }];
  };

  return {
    handle(event: Event): Event[] {
      if (handled.has(event.id)) return [];
      handled.add(event.id);

      switch (event.type) {
        case 'OrderPlaced': {
          const record = getOrCreate(event.orderId);
          // First details win; a later OrderPlaced for the same order changes nothing.
          if (record.customerId === undefined) {
            record.customerId = event.customerId;
            record.amount = event.amount;
          }
          return tryCharge(event.orderId, record);
        }
        case 'StockReserved': {
          const record = getOrCreate(event.orderId);
          record.reserved = true;
          return tryCharge(event.orderId, record);
        }
        case 'OrderCancelled': {
          const record = getOrCreate(event.orderId);
          record.cancelled = true;
          // Refund only what was actually charged, at most once per order.
          if (record.payment !== 'PAID' || record.customerId === undefined) return [];
          balanceOf.set(record.customerId, (balanceOf.get(record.customerId) ?? 0) + record.charged);
          record.payment = 'REFUNDED';
          return [{ id: newId(), type: 'PaymentRefunded', orderId: event.orderId, amount: record.charged }];
        }
        default:
          return [];
      }
    },
    getBalance(customerId: string): number {
      return balanceOf.get(customerId) ?? 0;
    },
  };
}
