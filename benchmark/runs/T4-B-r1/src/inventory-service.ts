import { nextEventId } from './ids.js';
import type { Event, InventoryService } from './shop.js';

const ID_PREFIX = 'inv';

type ReservationState = 'reserved' | 'rejected' | 'released' | 'closed';

type Reservation = {
  sku: string;
  qty: number;
  state: ReservationState;
};

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>(Object.entries(stock));
  // One record per order id; its presence is the dedup key for OrderPlaced.
  const reservations = new Map<string, Reservation>();

  function release(orderId: string): Event[] {
    const reservation = reservations.get(orderId);
    if (!reservation) {
      // Cancellation / failure seen before OrderPlaced: never reserve for this order.
      reservations.set(orderId, { sku: '', qty: 0, state: 'closed' });
      return [];
    }
    if (reservation.state !== 'reserved') return [];
    available.set(reservation.sku, (available.get(reservation.sku) ?? 0) + reservation.qty);
    reservation.state = 'released';
    return [{ id: nextEventId(ID_PREFIX), type: 'StockReleased', orderId }];
  }

  function handle(event: Event): Event[] {
    switch (event.type) {
      case 'OrderPlaced': {
        if (reservations.has(event.orderId)) return [];
        const current = available.get(event.sku) ?? 0;
        if (current >= event.qty) {
          available.set(event.sku, current - event.qty);
          reservations.set(event.orderId, { sku: event.sku, qty: event.qty, state: 'reserved' });
          return [{ id: nextEventId(ID_PREFIX), type: 'StockReserved', orderId: event.orderId }];
        }
        reservations.set(event.orderId, { sku: event.sku, qty: event.qty, state: 'rejected' });
        return [{ id: nextEventId(ID_PREFIX), type: 'StockRejected', orderId: event.orderId }];
      }
      case 'PaymentFailed':
      case 'OrderCancelled':
        return release(event.orderId);
      default:
        return [];
    }
  }

  function getAvailable(sku: string): number {
    return available.get(sku) ?? 0;
  }

  return { handle, getAvailable };
}
