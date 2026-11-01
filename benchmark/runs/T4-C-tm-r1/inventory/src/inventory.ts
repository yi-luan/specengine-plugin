// 由負責 InventoryService 的工程師實作。
// 規格：.specengine/spec/features/庫存保留.feature（模組 INVENTORY_RESERVATION）
// 資料模型：.specengine/spec/erm.dbml（inventory_stock、stock_reservation、processed_event）
import { randomUUID } from 'node:crypto';
import type { Event, InventoryService } from './events.js';

/** stock_reservation.status：RESERVED 保留中｜RELEASED 已放回｜REJECTED 已拒絕｜ENDED 放回事件先到、訂單已結束 */
type ReservationStatus = 'RESERVED' | 'RELEASED' | 'REJECTED' | 'ENDED';

type Reservation = {
  sku?: string;
  qty?: number;
  status: ReservationStatus;
};

export function createInventoryService(stock: Record<string, number>): InventoryService {
  // inventory_stock：SKU → 目前可供保留的數量
  const available = new Map<string, number>(Object.entries(stock));
  // stock_reservation：訂單編號 → 保留紀錄（一張訂單至多一筆）
  const reservations = new Map<string, Reservation>();
  // processed_event：已處理過的事件 id
  // 決策見 .specengine/sdd/resolved/features/INVENTORY_RESERVATION_重複收到同一訂單OrderPlaced的回應.md（POLICY-001）
  const processedEventIds = new Set<string>();

  // 事件 id 由庫存服務自行產生，全系統唯一；格式屬實作細節（flow-design 索引裁示 (c)）
  const newId = (): string => randomUUID();

  function getAvailable(sku: string): number {
    // R-007：初始庫存表沒有的 SKU 視為 0
    // 決策見 .specengine/sdd/resolved/data/INVENTORY_RESERVATION_初始庫存表沒有的SKU.md
    return available.get(sku) ?? 0;
  }

  function onOrderPlaced(event: Extract<Event, { type: 'OrderPlaced' }>): Event[] {
    const { orderId, sku, qty } = event;

    // R-005／R-009：同一訂單編號只處理一次（已保留、已拒絕、已放回或已結束都不再動作、不發事件）
    // 決策見 .specengine/sdd/resolved/data/INVENTORY_RESERVATION_重複送達的判定依據.md、
    //        .specengine/sdd/resolved/features/INVENTORY_RESERVATION_放回事件先於下單事件到達.md
    if (reservations.has(orderId)) return [];

    // R-010：數量 0 或負數視為不合法，整筆拒絕
    // 決策見 .specengine/sdd/resolved/features/INVENTORY_RESERVATION_下單數量為零或負數.md
    if (!Number.isInteger(qty) || qty <= 0) {
      reservations.set(orderId, { sku, qty, status: 'REJECTED' });
      return [{ id: newId(), type: 'StockRejected', orderId }];
    }

    // R-001：可用庫存不足（含未知 SKU 視為 0）→ 整筆拒絕，不部分保留
    const current = getAvailable(sku);
    if (current < qty) {
      reservations.set(orderId, { sku, qty, status: 'REJECTED' });
      return [{ id: newId(), type: 'StockRejected', orderId }];
    }

    // R-000：庫存足夠 → 扣住數量並發出 StockReserved
    available.set(sku, current - qty);
    reservations.set(orderId, { sku, qty, status: 'RESERVED' });
    return [{ id: newId(), type: 'StockReserved', orderId }];
  }

  function onRelease(orderId: string): Event[] {
    const reservation = reservations.get(orderId);

    // R-008：下單事件還沒到就收到放回事件 → 記住訂單已結束，不加庫存、不發事件
    // 決策見 .specengine/sdd/resolved/features/INVENTORY_RESERVATION_放回事件先於下單事件到達.md（POLICY-003）
    if (!reservation) {
      reservations.set(orderId, { status: 'ENDED' });
      return [];
    }

    // R-006：沒有保留中的庫存（已放回、已拒絕、已結束）→ 不重複放回、不發 StockReleased
    // 決策見 .specengine/sdd/resolved/features/INVENTORY_RESERVATION_沒有可放回庫存時收到放回事件的回應.md（POLICY-002）
    if (reservation.status !== 'RESERVED' || reservation.sku === undefined || reservation.qty === undefined) return [];

    // R-002／R-003：放回實際保留的數量（最多一次），發出 StockReleased
    // 決策見 .specengine/sdd/resolved/features/INVENTORY_RESERVATION_取消訂單放回庫存時是否發出StockReleased.md
    available.set(reservation.sku, getAvailable(reservation.sku) + reservation.qty);
    reservation.status = 'RELEASED';
    return [{ id: newId(), type: 'StockReleased', orderId }];
  }

  function handle(event: Event): Event[] {
    // POLICY-001：同一事件 id 第二次起直接忽略，不改任何狀態、不發任何事件
    if (processedEventIds.has(event.id)) return [];

    switch (event.type) {
      case 'OrderPlaced':
        processedEventIds.add(event.id);
        return onOrderPlaced(event);
      case 'PaymentFailed':
      case 'OrderCancelled':
        processedEventIds.add(event.id);
        return onRelease(event.orderId);
      default:
        // R-004：不關心的事件型別（StockReserved／StockRejected／StockReleased／PaymentSucceeded／PaymentRefunded）
        return [];
    }
  }

  return { handle, getAvailable };
}
