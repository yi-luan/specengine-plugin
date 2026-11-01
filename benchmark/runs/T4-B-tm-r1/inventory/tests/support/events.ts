import type { Event } from '../../src/events.js';

/**
 * Builders for the events other services would send. The order and payment services are empty
 * shells during development, so the inventory tests construct their events here.
 */
export function orderPlaced(id: string, orderId: string, sku: string, qty: number): Event {
  return {
    id,
    type: 'OrderPlaced',
    orderId,
    customerId: 'C1',
    sku,
    qty,
    amount: 10 * qty,
    at: '2026-06-15T12:00:00Z',
  };
}

export function paymentFailed(id: string, orderId: string): Event {
  return { id, type: 'PaymentFailed', orderId };
}

export function orderCancelled(id: string, orderId: string): Event {
  return { id, type: 'OrderCancelled', orderId };
}

export function paymentSucceeded(id: string, orderId: string): Event {
  return { id, type: 'PaymentSucceeded', orderId, amount: 30 };
}

export function paymentRefunded(id: string, orderId: string): Event {
  return { id, type: 'PaymentRefunded', orderId, amount: 30 };
}

export function stockReserved(id: string, orderId: string): Event {
  return { id, type: 'StockReserved', orderId };
}

export function stockRejected(id: string, orderId: string): Event {
  return { id, type: 'StockRejected', orderId };
}

export function stockReleased(id: string, orderId: string): Event {
  return { id, type: 'StockReleased', orderId };
}

/** Build any non-OrderPlaced event by its type name (used by the generic step). */
export function eventOfType(type: string, id: string, orderId: string): Event {
  switch (type) {
    case 'PaymentFailed':
      return paymentFailed(id, orderId);
    case 'OrderCancelled':
      return orderCancelled(id, orderId);
    case 'PaymentSucceeded':
      return paymentSucceeded(id, orderId);
    case 'PaymentRefunded':
      return paymentRefunded(id, orderId);
    case 'StockReserved':
      return stockReserved(id, orderId);
    case 'StockRejected':
      return stockRejected(id, orderId);
    case 'StockReleased':
      return stockReleased(id, orderId);
    default:
      throw new Error(`unsupported event type in test builder: ${type}`);
  }
}
