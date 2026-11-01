// 庫存服務：負責 InventoryService。只保存自己的狀態（可供保留的庫存、每張訂單的保留紀錄），
// 不讀取其他服務的狀態。所有事件只透過 handle 的回傳值發出。
import { randomUUID } from 'node:crypto';
import type { Event, InventoryService } from './events.js';

// 每張訂單的庫存紀錄：
// - 物件：目前持有庫存（sku, qty）
// - null：已結案、不持有庫存（已放回、已拒絕、已取消，或在 OrderPlaced 前就收到終止事件）
// - 不存在：尚未見過這張訂單
type Hold = { sku: string; qty: number } | null;

function newEventId(): string {
  return `inventory-${randomUUID()}`;
}

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>(Object.entries(stock));
  const holds = new Map<string, Hold>();

  const availableOf = (sku: string): number => available.get(sku) ?? 0;

  // 放回該訂單保留的庫存（若有），回傳是否真的放回了庫存。
  const release = (orderId: string): boolean => {
    const hold = holds.get(orderId);
    holds.set(orderId, null);
    if (!hold) return false;
    available.set(hold.sku, availableOf(hold.sku) + hold.qty);
    return true;
  };

  const onOrderPlaced = (e: Extract<Event, { type: 'OrderPlaced' }>): Event[] => {
    // 重複送達，或已先收到終止事件（取消 / 付款失敗）的訂單：不再保留，也不再發事件。
    if (holds.has(e.orderId)) return [];

    const fits = Number.isInteger(e.qty) && e.qty > 0 && availableOf(e.sku) >= e.qty;
    if (!fits) {
      holds.set(e.orderId, null);
      return [{ id: newEventId(), type: 'StockRejected', orderId: e.orderId }];
    }

    available.set(e.sku, availableOf(e.sku) - e.qty);
    holds.set(e.orderId, { sku: e.sku, qty: e.qty });
    return [{ id: newEventId(), type: 'StockReserved', orderId: e.orderId }];
  };

  const onPaymentFailed = (orderId: string): Event[] => {
    // 付款失敗：放回保留的庫存並發出 StockReleased。重複送達時庫存已放回，不會再發。
    // 若 OrderPlaced 尚未到達，先記下結案，之後的 OrderPlaced 不會再保留。
    if (!holds.has(orderId)) {
      holds.set(orderId, null);
      return [];
    }
    return release(orderId)
      ? [{ id: newEventId(), type: 'StockReleased', orderId }]
      : [];
  };

  const onOrderCancelled = (orderId: string): Event[] => {
    // 取消：放回保留的庫存，但依需求不另外發出 StockReleased。
    release(orderId);
    return [];
  };

  return {
    handle(event: Event): Event[] {
      switch (event.type) {
        case 'OrderPlaced':
          return onOrderPlaced(event);
        case 'PaymentFailed':
          return onPaymentFailed(event.orderId);
        case 'OrderCancelled':
          return onOrderCancelled(event.orderId);
        default:
          return [];
      }
    },
    getAvailable(sku: string): number {
      return availableOf(sku);
    },
  };
}
