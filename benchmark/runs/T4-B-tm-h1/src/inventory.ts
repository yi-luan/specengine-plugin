// 由負責 InventoryService 的工程師實作。
import { randomUUID } from 'node:crypto';
import type { Event, InventoryService } from './events.js';

type OrderState = 'RESERVED' | 'REJECTED' | 'RELEASED' | 'CANCELLED' | 'FAILED';
type OrderRecord = { sku: string; qty: number; status: OrderState };

export function createInventoryService(stock: Record<string, number>): InventoryService {
  // 可供保留的庫存（複製一份，不參照呼叫端的物件）。
  const available = new Map<string, number>(Object.entries(stock));
  // 每張訂單的保留紀錄與終態。
  const orders = new Map<string, OrderRecord>();
  // 已處理過的事件 id；同一事件第二次起忽略。
  const seenEventIds = new Set<string>();

  const newEventId = (): string => `inv-${randomUUID()}`;

  function placeOrder(orderId: string, sku: string, qty: number): Event[] {
    // 同一訂單的第一次結果即為最終結果（含取消或付款失敗先到的終態）。
    if (orders.has(orderId)) return [];

    const current = available.get(sku) ?? 0;
    if (Number.isInteger(qty) && qty > 0 && current >= qty) {
      available.set(sku, current - qty);
      orders.set(orderId, { sku, qty, status: 'RESERVED' });
      return [{ id: newEventId(), type: 'StockReserved', orderId }];
    }

    orders.set(orderId, { sku, qty, status: 'REJECTED' });
    return [{ id: newEventId(), type: 'StockRejected', orderId }];
  }

  function releaseOrder(orderId: string, terminal: 'CANCELLED' | 'FAILED'): Event[] {
    const record = orders.get(orderId);
    if (!record) {
      // 終態先到：記住此訂單，之後到的 OrderPlaced 不保留庫存。
      orders.set(orderId, { sku: '', qty: 0, status: terminal });
      return [];
    }
    // 只有實際保留過的訂單才放回，且只放回一次。
    if (record.status !== 'RESERVED') return [];

    available.set(record.sku, (available.get(record.sku) ?? 0) + record.qty);
    record.status = 'RELEASED';
    return [{ id: newEventId(), type: 'StockReleased', orderId }];
  }

  return {
    handle(event: Event): Event[] {
      if (seenEventIds.has(event.id)) return [];
      seenEventIds.add(event.id);

      switch (event.type) {
        case 'OrderPlaced':
          return placeOrder(event.orderId, event.sku, event.qty);
        case 'PaymentFailed':
          return releaseOrder(event.orderId, 'FAILED');
        case 'OrderCancelled':
          return releaseOrder(event.orderId, 'CANCELLED');
        default:
          return [];
      }
    },

    getAvailable(sku: string): number {
      return available.get(sku) ?? 0;
    },
  };
}
