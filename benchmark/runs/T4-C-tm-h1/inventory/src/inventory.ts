// 由負責 InventoryService 的工程師實作。
// 行為依據：.specengine/spec/features/庫存服務.feature 與 .specengine/sdd/matrix/INVENTORY.json
import { randomUUID } from 'node:crypto';
import type { Event, InventoryService } from './events.js';

type Reservation = { sku: string; qty: number; status: 'RESERVED' | 'RELEASED' };

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const total = new Map<string, number>(Object.entries(stock));
  // 保留紀錄以訂單編號為鍵：每張訂單至多一筆（R-000、R-008）。
  const reservations = new Map<string, Reservation>();
  // 同一事件 id 只處理一次。決策見 .specengine/sdd/resolved/features/庫存_重複OrderPlaced的處理.md
  const seenEventIds = new Set<string>();
  // 已收到過 OrderPlaced 的訂單（用來區分「先到」與「已見過下單」）。
  const seenOrders = new Set<string>();
  // 取消或付款失敗先於下單抵達時，先記下來。決策見 resolved/features/庫存_亂序抵達的放回請求.md 與 庫存_付款失敗先於下單抵達.md
  const cancelledEarly = new Set<string>();
  const failedEarly = new Set<string>();

  function reservedQty(sku: string): number {
    let sum = 0;
    for (const r of reservations.values()) {
      if (r.sku === sku && r.status === 'RESERVED') sum += r.qty;
    }
    return sum;
  }

  // 未知 SKU 視為庫存 0。決策見 resolved/features/庫存_SKU不在庫存表的處理.md
  function available(sku: string): number {
    return (total.get(sku) ?? 0) - reservedQty(sku);
  }

  function newEventId(): string {
    return `INV-${randomUUID()}`;
  }

  // 只放回實際保留的數量，同一訂單最多一次。沒有保留中的庫存就不動作。決策見 resolved/features/庫存_已放回或無保留時收到放回請求.md
  function releaseOrder(orderId: string, early: Set<string>): Event[] {
    const r = reservations.get(orderId);
    if (r && r.status === 'RESERVED') {
      r.status = 'RELEASED';
      return [{ id: newEventId(), type: 'StockReleased', orderId }];
    }
    if (!seenOrders.has(orderId)) {
      early.add(orderId);
    }
    return [];
  }

  function onOrderPlaced(orderId: string, sku: string, qty: number): Event[] {
    seenOrders.add(orderId);
    if (cancelledEarly.has(orderId) || failedEarly.has(orderId)) return [];
    // 矩陣未涵蓋：同一訂單已有保留中的紀錄又收到新的下單事件（不同事件 id）。目前採不動作，待補規則。
    const existing = reservations.get(orderId);
    if (existing && existing.status === 'RESERVED') return [];
    // 數量須為正整數。決策見 resolved/features/庫存_數量為零或負數的處理.md（授權代決）
    if (!Number.isInteger(qty) || qty <= 0) {
      return [{ id: newEventId(), type: 'StockRejected', orderId }];
    }
    // 剛好相等算足夠；不足則整筆拒絕，不部分保留。決策見 resolved/features/庫存_剛好足夠的邊界.md
    if (available(sku) < qty) {
      return [{ id: newEventId(), type: 'StockRejected', orderId }];
    }
    reservations.set(orderId, { sku, qty, status: 'RESERVED' });
    return [{ id: newEventId(), type: 'StockReserved', orderId }];
  }

  return {
    handle(event: Event): Event[] {
      if (seenEventIds.has(event.id)) return [];
      seenEventIds.add(event.id);
      switch (event.type) {
        case 'OrderPlaced':
          return onOrderPlaced(event.orderId, event.sku, event.qty);
        case 'OrderCancelled':
          return releaseOrder(event.orderId, cancelledEarly);
        case 'PaymentFailed':
          return releaseOrder(event.orderId, failedEarly);
        default:
          return [];
      }
    },
    getAvailable(sku: string): number {
      return available(sku);
    },
  };
}
