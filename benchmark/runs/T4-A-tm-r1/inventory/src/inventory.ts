// 由負責 InventoryService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { Event, InventoryService } from './events.js';

/**
 * 每張訂單在庫存服務裡的狀態：
 * - RESERVED：已為此訂單保留 qty 個 sku，等待付款／取消。
 * - REJECTED：收到 OrderPlaced 時庫存不足（或數量無效），沒有保留任何庫存。
 * - RELEASED：保留已放回；或在 OrderPlaced 之前就先收到 PaymentFailed / OrderCancelled，
 *             之後再收到 OrderPlaced 時不再保留（訂單已經結束）。
 */
type Reservation =
  | { state: 'RESERVED'; sku: string; qty: number }
  | { state: 'REJECTED' }
  | { state: 'RELEASED' };

export function createInventoryService(stock: Record<string, number>): InventoryService {
  // 複製一份，避免與呼叫端共用可變物件。
  const available = new Map<string, number>(Object.entries(stock));
  const reservations = new Map<string, Reservation>();

  const newId = (): string => `inv-${randomUUID()}`;

  const getAvailable = (sku: string): number => available.get(sku) ?? 0;

  const reserve = (e: Extract<Event, { type: 'OrderPlaced' }>): Event[] => {
    // 重複送達／順序顛倒：這張訂單已經處理過（含已先收到釋放事件）就不再動作。
    if (reservations.has(e.orderId)) return [];

    const current = getAvailable(e.sku);
    const qtyValid = Number.isInteger(e.qty) && e.qty > 0;
    if (!qtyValid || current < e.qty) {
      reservations.set(e.orderId, { state: 'REJECTED' });
      return [{ id: newId(), type: 'StockRejected', orderId: e.orderId }];
    }

    available.set(e.sku, current - e.qty);
    reservations.set(e.orderId, { state: 'RESERVED', sku: e.sku, qty: e.qty });
    return [{ id: newId(), type: 'StockReserved', orderId: e.orderId }];
  };

  const release = (orderId: string): Event[] => {
    const r = reservations.get(orderId);
    if (!r) {
      // 釋放事件先於 OrderPlaced 到達：記住這張訂單已結束，之後的 OrderPlaced 不保留。
      reservations.set(orderId, { state: 'RELEASED' });
      return [];
    }
    if (r.state !== 'RESERVED') return []; // 已放回、或根本沒保留過：冪等，不重複放回。

    available.set(r.sku, getAvailable(r.sku) + r.qty);
    reservations.set(orderId, { state: 'RELEASED' });
    return [{ id: newId(), type: 'StockReleased', orderId }];
  };

  return {
    handle(event: Event): Event[] {
      switch (event.type) {
        case 'OrderPlaced':
          return reserve(event);
        case 'PaymentFailed':
        case 'OrderCancelled':
          return release(event.orderId);
        default:
          return [];
      }
    },
    getAvailable,
  };
}
