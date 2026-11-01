// 事件驅動下單流程：訂單、庫存、付款三個服務。
// 三個服務各自只保存自己的狀態，彼此只透過事件溝通（由外部把事件廣播給三個服務的 handle）。
// 所有操作都在記憶體中完成。

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
  tick(now: string): Event[];                       // 時間推進到 now，回傳因此發出的事件
  handle(event: Event): Event[];                    // 收到一個事件，回傳因此發出的事件
  getOrder(orderId: string): { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined;
}
export interface InventoryService {
  handle(event: Event): Event[];
  getAvailable(sku: string): number;                // 目前可供保留的庫存
}
export interface PaymentService {
  handle(event: Event): Event[];
  getBalance(customerId: string): number;
}

// 事件 id 在全系統內唯一：共用一個遞增序號，並以服務名稱當前綴。
let eventSeq = 0;
function nextEventId(prefix: string): string {
  eventSeq += 1;
  return `${prefix}-${eventSeq}`;
}

const ORDER_TIMEOUT_MS = 15 * 60 * 1000;

function isPositiveInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

function parseTime(s: unknown): number | undefined {
  if (typeof s !== 'string') return undefined;
  const t = Date.parse(s);
  return Number.isNaN(t) ? undefined : t;
}

// ---------------------------------------------------------------------------
// 訂單服務
// ---------------------------------------------------------------------------

type OrderRecord = {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: number;                                 // 毫秒，用於 15 分鐘逾時
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
};

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();    // 依下單順序保存
  const seen = new Set<string>();

  function cancel(order: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: nextEventId('order'), type: 'OrderCancelled', orderId: order.orderId };
  }

  return {
    placeOrder(input: PlaceOrderInput): CommandResult {
      if (typeof input.orderId !== 'string' || input.orderId === '') {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      if (orders.has(input.orderId)) {
        return { ok: false, reason: 'DUPLICATE_ORDER' };
      }
      if (!isPositiveInteger(input.qty) || !isNonNegativeInteger(input.amount)) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      const placedAt = parseTime(input.at);
      if (placedAt === undefined) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      const order: OrderRecord = {
        orderId: input.orderId,
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        placedAt,
        status: 'PENDING',
      };
      orders.set(order.orderId, order);
      const event: Event = {
        id: nextEventId('order'),
        type: 'OrderPlaced',
        orderId: order.orderId,
        customerId: order.customerId,
        sku: order.sku,
        qty: order.qty,
        amount: order.amount,
        at: input.at,
      };
      return { ok: true, events: [event] };
    },

    cancelOrder(orderId: string, _at: string): CommandResult {
      const order = orders.get(orderId);
      if (!order) {
        return { ok: false, reason: 'NOT_FOUND' };
      }
      // 處理中與已確認的訂單可以由顧客取消；其餘狀態（已取消、庫存不足、付款失敗）不行。
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return { ok: false, reason: 'INVALID_STATE' };
      }
      return { ok: true, events: [cancel(order, 'CUSTOMER')] };
    },

    tick(now: string): Event[] {
      const t = parseTime(now);
      if (t === undefined) return [];
      const events: Event[] = [];
      for (const order of orders.values()) {
        // 下單後 15 分鐘（含）仍未付款（仍為處理中）就自動取消。
        if (order.status === 'PENDING' && order.placedAt + ORDER_TIMEOUT_MS <= t) {
          events.push(cancel(order, 'TIMEOUT'));
        }
      }
      return events;
    },

    handle(event: Event): Event[] {
      if (seen.has(event.id)) return [];
      seen.add(event.id);
      switch (event.type) {
        case 'StockRejected': {
          const order = orders.get(event.orderId);
          if (order?.status === 'PENDING') order.status = 'REJECTED';
          return [];
        }
        case 'PaymentSucceeded': {
          const order = orders.get(event.orderId);
          if (order?.status === 'PENDING') order.status = 'CONFIRMED';
          return [];
        }
        case 'PaymentFailed': {
          const order = orders.get(event.orderId);
          if (order?.status === 'PENDING') order.status = 'FAILED';
          return [];
        }
        default:
          return [];
      }
    },

    getOrder(orderId: string) {
      const order = orders.get(orderId);
      if (!order) return undefined;
      return order.cancelReason
        ? { status: order.status, cancelReason: order.cancelReason }
        : { status: order.status };
    },
  };
}

// ---------------------------------------------------------------------------
// 庫存服務
// ---------------------------------------------------------------------------

type Hold = { sku: string; qty: number; state: 'RESERVED' | 'RELEASED' | 'REJECTED' };

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>(Object.entries(stock));
  const holds = new Map<string, Hold>();
  // 訂單在收到 OrderPlaced 之前就已被取消（事件亂序）時，記下來，之後不再保留庫存。
  const cancelledEarly = new Set<string>();
  const seen = new Set<string>();

  // 放回已保留的庫存；只有實際放回時才可能發出 StockReleased（付款失敗情境）。
  function release(orderId: string, emitEvent: boolean): Event[] {
    const hold = holds.get(orderId);
    if (hold?.state !== 'RESERVED') return [];
    available.set(hold.sku, (available.get(hold.sku) ?? 0) + hold.qty);
    hold.state = 'RELEASED';
    return emitEvent ? [{ id: nextEventId('inv'), type: 'StockReleased', orderId }] : [];
  }

  return {
    handle(event: Event): Event[] {
      if (seen.has(event.id)) return [];
      seen.add(event.id);
      switch (event.type) {
        case 'OrderPlaced': {
          if (holds.has(event.orderId) || cancelledEarly.has(event.orderId)) return [];
          const avail = available.get(event.sku) ?? 0;
          if (avail >= event.qty) {
            available.set(event.sku, avail - event.qty);
            holds.set(event.orderId, { sku: event.sku, qty: event.qty, state: 'RESERVED' });
            return [{ id: nextEventId('inv'), type: 'StockReserved', orderId: event.orderId }];
          }
          holds.set(event.orderId, { sku: event.sku, qty: event.qty, state: 'REJECTED' });
          return [{ id: nextEventId('inv'), type: 'StockRejected', orderId: event.orderId }];
        }
        case 'PaymentFailed':
          return release(event.orderId, true);
        case 'OrderCancelled':
          if (!holds.has(event.orderId)) cancelledEarly.add(event.orderId);
          // 顧客取消時放回庫存，但規格只要求付款失敗時發出 StockReleased，因此這裡不發事件。
          release(event.orderId, false);
          return [];
        default:
          return [];
      }
    },

    getAvailable(sku: string): number {
      return available.get(sku) ?? 0;
    },
  };
}

// ---------------------------------------------------------------------------
// 付款服務
// ---------------------------------------------------------------------------

type Charge = {
  customerId?: string;
  amount?: number;
  reserved: boolean;                                // 是否已收到 StockReserved
  state: 'OPEN' | 'CHARGED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
};

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map<string, number>(Object.entries(balances));
  const charges = new Map<string, Charge>();
  const seen = new Set<string>();

  function chargeOf(orderId: string): Charge {
    let charge = charges.get(orderId);
    if (!charge) {
      charge = { reserved: false, state: 'OPEN' };
      charges.set(orderId, charge);
    }
    return charge;
  }

  // 只有「庫存已保留」且「知道金額與顧客」且「尚未決定」時才扣款。
  function tryCharge(orderId: string, charge: Charge): Event[] {
    if (charge.state !== 'OPEN' || !charge.reserved) return [];
    if (charge.customerId === undefined || charge.amount === undefined) return [];
    const current = balance.get(charge.customerId) ?? 0;
    if (current >= charge.amount) {
      balance.set(charge.customerId, current - charge.amount);
      charge.state = 'CHARGED';
      return [{ id: nextEventId('pay'), type: 'PaymentSucceeded', orderId, amount: charge.amount }];
    }
    charge.state = 'FAILED';
    return [{ id: nextEventId('pay'), type: 'PaymentFailed', orderId }];
  }

  return {
    handle(event: Event): Event[] {
      if (seen.has(event.id)) return [];
      seen.add(event.id);
      switch (event.type) {
        case 'OrderPlaced': {
          const charge = chargeOf(event.orderId);
          charge.customerId = event.customerId;
          charge.amount = event.amount;
          return tryCharge(event.orderId, charge);
        }
        case 'StockReserved': {
          const charge = chargeOf(event.orderId);
          charge.reserved = true;
          return tryCharge(event.orderId, charge);
        }
        case 'OrderCancelled': {
          const charge = chargeOf(event.orderId);
          if (charge.state === 'CHARGED' && charge.customerId !== undefined && charge.amount !== undefined) {
            balance.set(charge.customerId, (balance.get(charge.customerId) ?? 0) + charge.amount);
            charge.state = 'REFUNDED';
            return [{ id: nextEventId('pay'), type: 'PaymentRefunded', orderId: event.orderId, amount: charge.amount }];
          }
          if (charge.state === 'OPEN') charge.state = 'CANCELLED';
          return [];
        }
        default:
          return [];
      }
    },

    getBalance(customerId: string): number {
      return balance.get(customerId) ?? 0;
    },
  };
}
