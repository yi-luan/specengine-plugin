// 事件驅動下單流程（模組 ORDER_SAGA）：訂單、庫存、付款三個記憶體內服務，只透過事件溝通。
// 規格：.specengine/spec/features/事件驅動下單流程.feature；行為矩陣：.specengine/sdd/matrix/ORDER_SAGA.json
import { randomUUID } from 'node:crypto';

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

// 事件 id 全系統唯一（R-ORDER_SAGA-016）：以 UUID v4 產生，不依賴各服務的計數器。
const newId = (): string => randomUUID();

/** 逾時門檻：下單後 15 分鐘（含剛好 15 分鐘整；決策見 .specengine/sdd/resolved/features/ORDER_SAGA_逾時_剛好15分鐘的邊界.md） */
const TIMEOUT_MS = 15 * 60 * 1000;

const isPositiveInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isNonEmpty = (s: unknown): s is string => typeof s === 'string' && s.length > 0;

/** 重複送達去重（R-ORDER_SAGA-015）：每個服務各自記住處理過的事件 id；重複事件回傳 true。 */
function makeDedupe(): (event: Event) => boolean {
  const seen = new Set<string>();
  return (event) => {
    if (seen.has(event.id)) return true;
    seen.add(event.id);
    return false;
  };
}

// ---------------------------------------------------------------------------
// 訂單服務
// ---------------------------------------------------------------------------
type OrderRecord = {
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: number;
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
};

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  const isDuplicate = makeDedupe();

  const cancel = (orderId: string, order: OrderRecord, reason: 'CUSTOMER' | 'TIMEOUT'): Event => {
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    return { id: newId(), type: 'OrderCancelled', orderId };
  };

  return {
    placeOrder(input) {
      // 決策見 .specengine/sdd/resolved/features/ORDER_SAGA_下單_數量與金額的輸入驗證.md
      if (!isNonEmpty(input.orderId) || !isNonEmpty(input.customerId) || !isNonEmpty(input.sku) || !isPositiveInt(input.qty) || !isPositiveInt(input.amount)) {
        return { ok: false, reason: 'INVALID_INPUT' };
      }
      // 決策見 .specengine/sdd/resolved/features/ORDER_SAGA_下單_重複的訂單編號.md
      if (orders.has(input.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER' };
      orders.set(input.orderId, {
        customerId: input.customerId,
        sku: input.sku,
        qty: input.qty,
        amount: input.amount,
        placedAt: Date.parse(input.at),
        status: 'PENDING',
      });
      return { ok: true, events: [{ id: newId(), type: 'OrderPlaced', ...input }] };
    },

    cancelOrder(orderId) {
      // 決策見 .specengine/sdd/resolved/features/ORDER_SAGA_取消訂單_允許的狀態.md、ORDER_SAGA_取消訂單_拒絕時的原因文案.md
      const order = orders.get(orderId);
      if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') return { ok: false, reason: 'NOT_CANCELLABLE' };
      return { ok: true, events: [cancel(orderId, order, 'CUSTOMER')] };
    },

    tick(now) {
      // 只有 PENDING 會逾時；決策見 .specengine/sdd/resolved/features/ORDER_SAGA_逾時_適用的訂單狀態.md
      const t = Date.parse(now);
      const out: Event[] = [];
      for (const [orderId, order] of orders) {
        if (order.status === 'PENDING' && t - order.placedAt >= TIMEOUT_MS) out.push(cancel(orderId, order, 'TIMEOUT'));
      }
      return out;
    },

    handle(event) {
      if (isDuplicate(event)) return [];
      if (event.type !== 'PaymentSucceeded' && event.type !== 'StockRejected' && event.type !== 'PaymentFailed') return [];
      // 不存在或非 PENDING 一律忽略；決策見 .specengine/sdd/resolved/features/ORDER_SAGA_終態訂單收到後續結果事件.md、ORDER_SAGA_訂單服務收到未知訂單的結果事件.md
      const order = orders.get(event.orderId);
      if (!order || order.status !== 'PENDING') return [];
      if (event.type === 'PaymentSucceeded') order.status = 'CONFIRMED';
      else if (event.type === 'StockRejected') order.status = 'REJECTED';
      else order.status = 'FAILED';
      return [];
    },

    getOrder(orderId) {
      const order = orders.get(orderId);
      if (!order) return undefined;
      return order.cancelReason ? { status: order.status, cancelReason: order.cancelReason } : { status: order.status };
    },
  };
}

// ---------------------------------------------------------------------------
// 庫存服務
// ---------------------------------------------------------------------------
export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map<string, number>(Object.entries(stock));
  const reservations = new Map<string, { sku: string; qty: number }>();
  // 已結束的訂單（收到 OrderCancelled／PaymentFailed）：之後晚到的 OrderPlaced 不再保留；
  // 決策見 .specengine/sdd/resolved/features/ORDER_SAGA_亂序_終結事件先於上游事件到達.md
  const ended = new Set<string>();
  const isDuplicate = makeDedupe();

  return {
    handle(event) {
      if (isDuplicate(event)) return [];
      switch (event.type) {
        case 'OrderPlaced': {
          if (ended.has(event.orderId) || reservations.has(event.orderId)) return [];
          const current = available.get(event.sku) ?? 0; // 未登錄 SKU 視為 0（R-ORDER_SAGA-027）
          if (current >= event.qty) {
            available.set(event.sku, current - event.qty);
            reservations.set(event.orderId, { sku: event.sku, qty: event.qty });
            return [{ id: newId(), type: 'StockReserved', orderId: event.orderId }];
          }
          return [{ id: newId(), type: 'StockRejected', orderId: event.orderId }];
        }
        case 'OrderCancelled':
        case 'PaymentFailed': {
          ended.add(event.orderId);
          const reservation = reservations.get(event.orderId);
          // 無保留可放回時不發事件；決策見 .specengine/sdd/resolved/features/ORDER_SAGA_取消訂單_無可放回或可退還時是否發事件.md
          if (!reservation) return [];
          reservations.delete(event.orderId);
          available.set(reservation.sku, (available.get(reservation.sku) ?? 0) + reservation.qty);
          return [{ id: newId(), type: 'StockReleased', orderId: event.orderId }];
        }
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
type PaymentStatus = 'RESERVED_AWAITING_ORDER' | 'AWAITING' | 'CHARGED' | 'REFUNDED' | 'ENDED';
type PaymentRecord = { customerId?: string; amount?: number; status: PaymentStatus };

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map<string, number>(Object.entries(balances));
  const orders = new Map<string, PaymentRecord>();
  const isDuplicate = makeDedupe();

  /** 依餘額扣款或失敗（R-ORDER_SAGA-004／005）；失敗後狀態記為 ENDED（不再扣款、無可退款項）。 */
  const charge = (orderId: string, record: PaymentRecord & { customerId: string; amount: number }): Event => {
    const current = balance.get(record.customerId) ?? 0; // 未登錄顧客視為 0（R-ORDER_SAGA-027）
    if (current >= record.amount) {
      balance.set(record.customerId, current - record.amount);
      record.status = 'CHARGED';
      return { id: newId(), type: 'PaymentSucceeded', orderId, amount: record.amount };
    }
    record.status = 'ENDED';
    return { id: newId(), type: 'PaymentFailed', orderId };
  };

  return {
    handle(event) {
      if (isDuplicate(event)) return [];
      switch (event.type) {
        case 'OrderPlaced': {
          const record = orders.get(event.orderId);
          if (!record) {
            orders.set(event.orderId, { customerId: event.customerId, amount: event.amount, status: 'AWAITING' });
            return [];
          }
          // 先收到 StockReserved 的暫存：OrderPlaced 到達時立即扣款；決策見 .specengine/sdd/resolved/features/ORDER_SAGA_亂序_付款服務先收到StockReserved.md
          if (record.status === 'RESERVED_AWAITING_ORDER') {
            const known = Object.assign(record, { customerId: event.customerId, amount: event.amount });
            return [charge(event.orderId, known)];
          }
          return [];
        }
        case 'StockReserved': {
          const record = orders.get(event.orderId);
          if (!record) {
            orders.set(event.orderId, { status: 'RESERVED_AWAITING_ORDER' });
            return [];
          }
          if (record.status === 'AWAITING' && record.customerId !== undefined && record.amount !== undefined) {
            return [charge(event.orderId, record as PaymentRecord & { customerId: string; amount: number })];
          }
          return []; // ENDED／CHARGED／REFUNDED：不再扣款（R-ORDER_SAGA-025）
        }
        case 'OrderCancelled': {
          const record = orders.get(event.orderId);
          if (!record) {
            orders.set(event.orderId, { status: 'ENDED' });
            return [];
          }
          if (record.status === 'CHARGED' && record.customerId !== undefined && record.amount !== undefined) {
            balance.set(record.customerId, (balance.get(record.customerId) ?? 0) + record.amount);
            record.status = 'REFUNDED';
            return [{ id: newId(), type: 'PaymentRefunded', orderId: event.orderId, amount: record.amount }];
          }
          if (record.status !== 'REFUNDED') record.status = 'ENDED';
          return []; // 無扣款可退時不發事件（R-ORDER_SAGA-022）
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
