// 由負責 InventoryService 的工程師實作。
import type { Event, InventoryService } from './events.js';

type OrderStatus = 'RESERVED' | 'REJECTED' | 'RELEASED' | 'TERMINATED';

interface OrderRecord {
  status: OrderStatus;
  sku: string;
  qty: number;
}

type EmittedType = 'StockReserved' | 'StockRejected' | 'StockReleased';

/**
 * In-memory inventory service.
 *
 * - `available` holds the quantity still open for reservation per SKU.
 * - `orders` holds one record per order id so every decision (reserve/reject, release) happens
 *   at most once per order, and so a cancellation/failure that arrives before `OrderPlaced` is
 *   remembered (`TERMINATED`).
 * - `seen` holds processed event ids so a redelivered event is ignored entirely.
 */
export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>(Object.entries(stock));
  const orders = new Map<string, OrderRecord>();
  const seen = new Set<string>();

  const getAvailable = (sku: string): number => available.get(sku) ?? 0;

  const emit = (type: EmittedType, orderId: string): Event[] => [
    { id: `inventory:${type}:${orderId}`, type, orderId },
  ];

  const onOrderPlaced = (orderId: string, sku: string, qty: number): Event[] => {
    if (orders.has(orderId)) return [];
    const validQty = Number.isInteger(qty) && qty >= 1;
    if (validQty && qty <= getAvailable(sku)) {
      available.set(sku, getAvailable(sku) - qty);
      orders.set(orderId, { status: 'RESERVED', sku, qty });
      return emit('StockReserved', orderId);
    }
    orders.set(orderId, { status: 'REJECTED', sku, qty: 0 });
    return emit('StockRejected', orderId);
  };

  const onRelease = (orderId: string): Event[] => {
    const record = orders.get(orderId);
    if (!record) {
      orders.set(orderId, { status: 'TERMINATED', sku: '', qty: 0 });
      return [];
    }
    if (record.status !== 'RESERVED') return [];
    available.set(record.sku, getAvailable(record.sku) + record.qty);
    record.status = 'RELEASED';
    return emit('StockReleased', orderId);
  };

  return {
    handle(event: Event): Event[] {
      if (seen.has(event.id)) return [];
      seen.add(event.id);
      switch (event.type) {
        case 'OrderPlaced':
          return onOrderPlaced(event.orderId, event.sku, event.qty);
        case 'PaymentFailed':
        case 'OrderCancelled':
          return onRelease(event.orderId);
        default:
          return [];
      }
    },
    getAvailable,
  };
}
