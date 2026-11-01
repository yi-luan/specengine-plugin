import { nextEventId } from './ids.js';
import type { Event, PaymentService } from './shop.js';

const ID_PREFIX = 'pay';

type Outcome = 'none' | 'succeeded' | 'failed' | 'refunded';

type Charge = {
  customerId?: string;
  amount?: number;
  reserved: boolean;
  cancelled: boolean;
  outcome: Outcome;
};

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map<string, number>(Object.entries(balances));
  const charges = new Map<string, Charge>();

  function chargeFor(orderId: string): Charge {
    let charge = charges.get(orderId);
    if (!charge) {
      charge = { reserved: false, cancelled: false, outcome: 'none' };
      charges.set(orderId, charge);
    }
    return charge;
  }

  /** Apply whatever step has become possible for this order; at most one step per call. */
  function settle(orderId: string, charge: Charge): Event[] {
    if (charge.outcome === 'none') {
      if (charge.cancelled || !charge.reserved || charge.customerId === undefined || charge.amount === undefined) {
        return [];
      }
      const current = balance.get(charge.customerId) ?? 0;
      if (current >= charge.amount) {
        balance.set(charge.customerId, current - charge.amount);
        charge.outcome = 'succeeded';
        return [{ id: nextEventId(ID_PREFIX), type: 'PaymentSucceeded', orderId, amount: charge.amount }];
      }
      charge.outcome = 'failed';
      return [{ id: nextEventId(ID_PREFIX), type: 'PaymentFailed', orderId }];
    }
    if (charge.outcome === 'succeeded' && charge.cancelled) {
      const customerId = charge.customerId as string;
      const amount = charge.amount as number;
      balance.set(customerId, (balance.get(customerId) ?? 0) + amount);
      charge.outcome = 'refunded';
      return [{ id: nextEventId(ID_PREFIX), type: 'PaymentRefunded', orderId, amount }];
    }
    return [];
  }

  function handle(event: Event): Event[] {
    switch (event.type) {
      case 'OrderPlaced': {
        const charge = chargeFor(event.orderId);
        if (charge.customerId === undefined) {
          charge.customerId = event.customerId;
          charge.amount = event.amount;
        }
        return settle(event.orderId, charge);
      }
      case 'StockReserved': {
        const charge = chargeFor(event.orderId);
        charge.reserved = true;
        return settle(event.orderId, charge);
      }
      case 'OrderCancelled': {
        const charge = chargeFor(event.orderId);
        charge.cancelled = true;
        return settle(event.orderId, charge);
      }
      default:
        return [];
    }
  }

  function getBalance(customerId: string): number {
    return balance.get(customerId) ?? 0;
  }

  return { handle, getBalance };
}
