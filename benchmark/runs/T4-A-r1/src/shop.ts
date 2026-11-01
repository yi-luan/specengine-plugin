import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// 固定技術介面（不可更名）
// ---------------------------------------------------------------------------

export type Event =
  | { id: string; type: 'OrderPlaced'; orderId: string; customerId: string; sku: string; qty: number; amount: number; at: string }
  | { id: string; type: 'StockReserved'; orderId: string }
  | { id: string; type: 'StockRejected'; orderId: string }
  | { id: string; type: 'StockReleased'; orderId: string }
  | { id: string; type: 'PaymentSucceeded'; orderId: string; amount: number }
  | { id: string; type: 'PaymentFailed'; orderId: string }
  | { id: string; type: 'PaymentRefunded'; orderId: string; amount: number }
  | { id: string; type: 'OrderCancelled'; orderId: string };

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'FAILED' | 'CANCELLED';

export type PlaceOrderInput = { orderId: string; customerId: string; sku: string; qty: number; amount: number; at: string };
export type CommandResult = { ok: true; events: Event[] } | { ok: false; reason: string };

export interface OrderService {
  placeOrder(input: PlaceOrderInput): CommandResult;
  cancelOrder(orderId: string, at: string): CommandResult;
  tick(now: string): Event[];
  handle(event: Event): Event[];
  getOrder(orderId: string): { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined;
}
export interface InventoryService {
  handle(event: Event): Event[];
  getAvailable(sku: string): number;
}
export interface PaymentService {
  handle(event: Event): Event[];
  getBalance(customerId: string): number;
}

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

/** 下單後逾時自動取消的時限（毫秒）。 */
export const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

/** 產生全系統唯一的事件 id：服務前綴 + UUID v4。 */
function newEventId(prefix: 'ord' | 'inv' | 'pay'): string {
  return `${prefix}-${randomUUID()}`;
}

function parseIso(value: string): number | undefined {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * 「至少一次、可能重複」的送達機制 → 每個服務各自記住處理過的事件 id，
 * 重複送達的事件一律視為已處理、回傳空陣列。
 */
class Dedup {
  private readonly seen = new Set<string>();
  /** 第一次看到回傳 true，之後回傳 false。 */
  first(eventId: string): boolean {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
}

// ---------------------------------------------------------------------------
// 訂單服務
// ---------------------------------------------------------------------------

type OrderRecord = {
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
  placedAtMs: number;
};

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  const dedup = new Dedup();

  function cancel(orderId: string, record: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event {
    record.status = 'CANCELLED';
    record.cancelReason = reason;
    return { id: newEventId('ord'), type: 'OrderCancelled', orderId };
  }

  return {
    placeOrder(input) {
      if (!input || typeof input.orderId !== 'string' || input.orderId === '') {
        return { ok: false, reason: 'INVALID_ORDER_ID' };
      }
      if (orders.has(input.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER_ID' };
      if (typeof input.customerId !== 'string' || input.customerId === '') {
        return { ok: false, reason: 'INVALID_CUSTOMER_ID' };
      }
      if (typeof input.sku !== 'string' || input.sku === '') return { ok: false, reason: 'INVALID_SKU' };
      if (!Number.isInteger(input.qty) || input.qty <= 0) return { ok: false, reason: 'INVALID_QTY' };
      if (!Number.isInteger(input.amount) || input.amount < 0) return { ok: false, reason: 'INVALID_AMOUNT' };
      const placedAtMs = parseIso(input.at);
      if (placedAtMs === undefined) return { ok: false, reason: 'INVALID_TIME' };

      orders.set(input.orderId, { status: 'PENDING', placedAtMs });
      const event: Event = {
        id: newEventId('ord'),
        type: 'OrderPlaced',
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        at: input.at,
      };
      return { ok: true, events: [event] };
    },

    cancelOrder(orderId, at) {
      const record = orders.get(orderId);
      if (!record) return { ok: false, reason: 'ORDER_NOT_FOUND' };
      if (parseIso(at) === undefined) return { ok: false, reason: 'INVALID_TIME' };
      if (record.status === 'CANCELLED') return { ok: false, reason: 'ALREADY_CANCELLED' };
      if (record.status !== 'PENDING' && record.status !== 'CONFIRMED') {
        return { ok: false, reason: `ORDER_${record.status}` };
      }
      return { ok: true, events: [cancel(orderId, record, 'CUSTOMER')] };
    },

    tick(now) {
      const nowMs = parseIso(now);
      if (nowMs === undefined) return [];
      const out: Event[] = [];
      for (const [orderId, record] of orders) {
        if (record.status !== 'PENDING') continue;
        if (nowMs - record.placedAtMs >= PAYMENT_TIMEOUT_MS) {
          out.push(cancel(orderId, record, 'TIMEOUT'));
        }
      }
      return out;
    },

    handle(event) {
      if (!dedup.first(event.id)) return [];
      const record = orders.get(event.orderId);
      if (!record) return [];
      // 只有仍在處理中的訂單才會被結果事件推進；已取消 / 已終結的訂單維持原狀。
      if (record.status !== 'PENDING') return [];
      switch (event.type) {
        case 'PaymentSucceeded':
          record.status = 'CONFIRMED';
          return [];
        case 'StockRejected':
          record.status = 'REJECTED';
          return [];
        case 'PaymentFailed':
          record.status = 'FAILED';
          return [];
        default:
          return [];
      }
    },

    getOrder(orderId) {
      const record = orders.get(orderId);
      if (!record) return undefined;
      return record.cancelReason
        ? { status: record.status, cancelReason: record.cancelReason }
        : { status: record.status };
    },
  };
}

// ---------------------------------------------------------------------------
// 庫存服務
// ---------------------------------------------------------------------------

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>();
  for (const [sku, qty] of Object.entries(stock)) {
    available.set(sku, Number.isInteger(qty) && qty > 0 ? qty : 0);
  }
  const reservations = new Map<string, { sku: string; qty: number }>();
  /** 已結案（已拒絕 / 已放回 / 已取消）的訂單：之後再收到 OrderPlaced 不得再保留。 */
  const closed = new Set<string>();
  const dedup = new Dedup();

  function release(orderId: string): Event[] {
    closed.add(orderId);
    const reservation = reservations.get(orderId);
    if (!reservation) return [];
    reservations.delete(orderId);
    available.set(reservation.sku, (available.get(reservation.sku) ?? 0) + reservation.qty);
    return [{ id: newEventId('inv'), type: 'StockReleased', orderId }];
  }

  return {
    handle(event) {
      if (!dedup.first(event.id)) return [];
      switch (event.type) {
        case 'OrderPlaced': {
          if (closed.has(event.orderId) || reservations.has(event.orderId)) return [];
          const current = available.get(event.sku) ?? 0;
          if (current >= event.qty) {
            available.set(event.sku, current - event.qty);
            reservations.set(event.orderId, { sku: event.sku, qty: event.qty });
            return [{ id: newEventId('inv'), type: 'StockReserved', orderId: event.orderId }];
          }
          closed.add(event.orderId);
          return [{ id: newEventId('inv'), type: 'StockRejected', orderId: event.orderId }];
        }
        case 'PaymentFailed':
        case 'OrderCancelled':
          return release(event.orderId);
        default:
          return [];
      }
    },

    getAvailable(sku) {
      return available.get(sku) ?? 0;
    },
  };
}

// ---------------------------------------------------------------------------
// 付款服務
// ---------------------------------------------------------------------------

type PaymentRecord = {
  /** 來自 OrderPlaced 的顧客與金額；可能晚於 StockReserved 才到。 */
  placed?: { customerId: string; amount: number };
  reserved: boolean;
  charged?: { customerId: string; amount: number };
  /** 已結案：付款失敗、已取消、已退款。結案後不再扣款。 */
  closed: boolean;
};

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map<string, number>();
  for (const [customerId, amount] of Object.entries(balances)) {
    balance.set(customerId, Number.isInteger(amount) ? amount : 0);
  }
  const records = new Map<string, PaymentRecord>();
  const dedup = new Dedup();

  function recordOf(orderId: string): PaymentRecord {
    let record = records.get(orderId);
    if (!record) {
      record = { reserved: false, closed: false };
      records.set(orderId, record);
    }
    return record;
  }

  /** 同時具備 OrderPlaced 與 StockReserved、尚未扣款且未結案時才扣款。 */
  function tryCharge(orderId: string, record: PaymentRecord): Event[] {
    if (!record.placed || !record.reserved || record.charged || record.closed) return [];
    const { customerId, amount } = record.placed;
    const current = balance.get(customerId) ?? 0;
    if (current >= amount) {
      balance.set(customerId, current - amount);
      record.charged = { customerId, amount };
      return [{ id: newEventId('pay'), type: 'PaymentSucceeded', orderId, amount }];
    }
    record.closed = true;
    return [{ id: newEventId('pay'), type: 'PaymentFailed', orderId }];
  }

  return {
    handle(event) {
      if (!dedup.first(event.id)) return [];
      switch (event.type) {
        case 'OrderPlaced': {
          const record = recordOf(event.orderId);
          if (!record.placed) record.placed = { customerId: event.customerId, amount: event.amount };
          return tryCharge(event.orderId, record);
        }
        case 'StockReserved': {
          const record = recordOf(event.orderId);
          record.reserved = true;
          return tryCharge(event.orderId, record);
        }
        case 'OrderCancelled': {
          const record = recordOf(event.orderId);
          const wasClosed = record.closed;
          record.closed = true;
          if (!record.charged || wasClosed) return [];
          const { customerId, amount } = record.charged;
          balance.set(customerId, (balance.get(customerId) ?? 0) + amount);
          return [{ id: newEventId('pay'), type: 'PaymentRefunded', orderId: event.orderId, amount }];
        }
        default:
          return [];
      }
    },

    getBalance(customerId) {
      return balance.get(customerId) ?? 0;
    },
  };
}
