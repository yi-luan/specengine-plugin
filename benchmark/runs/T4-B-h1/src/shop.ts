// 三個服務（訂單、庫存、付款）的公開介面與實作。
// 每個服務只保存自己的狀態；服務之間只透過 handle() 收發事件。
// 所有時間由呼叫端以 ISO 8601 字串傳入；不讀取系統時鐘。

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

// 15 分鐘（毫秒）
const TIMEOUT_MS = 15 * 60 * 1000;

// 各服務關心的事件型別；無關事件直接忽略，不記錄任何狀態（FR-015）。
const ORDER_RELEVANT = new Set<Event['type']>(['StockRejected', 'PaymentSucceeded', 'PaymentFailed']);
const INVENTORY_RELEVANT = new Set<Event['type']>(['OrderPlaced', 'PaymentFailed', 'OrderCancelled']);
const PAYMENT_RELEVANT = new Set<Event['type']>(['OrderPlaced', 'StockReserved', 'OrderCancelled']);

// 金額與數量皆為整數（FR-012）。
function assertIntegers(values: Record<string, number>, label: string): void {
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isInteger(value)) throw new Error(`${label} must be integer: ${key}=${value}`);
  }
}

// 事件 id：<服務前綴>-<序號>，服務前綴保證全系統唯一。
function makeIdGen(prefix: string): () => string {
  let seq = 0;
  return () => `${prefix}-${++seq}`;
}

type CancelReason = 'CUSTOMER' | 'TIMEOUT';

interface OrderRecord {
  orderId: string;
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  at: string;
  status: OrderStatus;
  cancelReason?: CancelReason;
}

export function createOrderService(): OrderService {
  const orders = new Map<string, OrderRecord>();
  const seenEventIds = new Set<string>();
  const nextId = makeIdGen('order');

  function placeOrder(input: PlaceOrderInput): CommandResult {
    if (orders.has(input.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER' };
    if (!Number.isInteger(input.qty) || input.qty <= 0 || !Number.isInteger(input.amount) || input.amount < 0) {
      return { ok: false, reason: 'INVALID_INPUT' };
    }
    orders.set(input.orderId, { ...input, status: 'PENDING' });
    const event: Event = {
      id: nextId(),
      type: 'OrderPlaced',
      orderId: input.orderId,
      customerId: input.customerId,
      sku: input.sku,
      qty: input.qty,
      amount: input.amount,
      at: input.at,
    };
    return { ok: true, events: [event] };
  }

  function cancelOrder(orderId: string, _at: string): CommandResult {
    const order = orders.get(orderId);
    if (!order) return { ok: false, reason: 'NOT_FOUND' };
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      return { ok: false, reason: 'NOT_CANCELLABLE' };
    }
    order.status = 'CANCELLED';
    order.cancelReason = 'CUSTOMER';
    return { ok: true, events: [{ id: nextId(), type: 'OrderCancelled', orderId }] };
  }

  // 逾時判定以訂單服務當下的狀態為準：仍為 PENDING 且已滿 15 分鐘（剛好 15 分鐘算逾時）。
  function tick(now: string): Event[] {
    const nowMs = Date.parse(now);
    const out: Event[] = [];
    for (const order of orders.values()) {
      if (order.status === 'PENDING' && nowMs - Date.parse(order.at) >= TIMEOUT_MS) {
        order.status = 'CANCELLED';
        order.cancelReason = 'TIMEOUT';
        out.push({ id: nextId(), type: 'OrderCancelled', orderId: order.orderId });
      }
    }
    return out;
  }

  function handle(event: Event): Event[] {
    if (!ORDER_RELEVANT.has(event.type)) return [];
    if (seenEventIds.has(event.id)) return [];
    seenEventIds.add(event.id);
    switch (event.type) {
      case 'StockRejected':
        setIfPending(event.orderId, 'REJECTED');
        return [];
      case 'PaymentSucceeded':
        setIfPending(event.orderId, 'CONFIRMED');
        return [];
      case 'PaymentFailed':
        setIfPending(event.orderId, 'FAILED');
        return [];
      default:
        return [];
    }
  }

  // 終態不被覆寫；只有 PENDING 會轉移。
  function setIfPending(orderId: string, status: OrderStatus): void {
    const order = orders.get(orderId);
    if (order && order.status === 'PENDING') order.status = status;
  }

  function getOrder(orderId: string): { status: OrderStatus; cancelReason?: CancelReason } | undefined {
    const order = orders.get(orderId);
    if (!order) return undefined;
    return order.cancelReason !== undefined
      ? { status: order.status, cancelReason: order.cancelReason }
      : { status: order.status };
  }

  return { placeOrder, cancelOrder, tick, handle, getOrder };
}

export function createInventoryService(stock: Record<string, number>): InventoryService {
  assertIntegers(stock, 'stock');
  const available = new Map<string, number>(Object.entries(stock));
  const reservations = new Map<string, { sku: string; qty: number }>();
  const processedOrders = new Set<string>(); // 已處理過 OrderPlaced 的訂單（保留或拒絕）
  const cancelledOrders = new Set<string>();
  const seenEventIds = new Set<string>();
  const nextId = makeIdGen('stock');

  function releaseReservation(orderId: string): boolean {
    const reservation = reservations.get(orderId);
    if (!reservation) return false;
    available.set(reservation.sku, (available.get(reservation.sku) ?? 0) + reservation.qty);
    reservations.delete(orderId);
    return true;
  }

  function handle(event: Event): Event[] {
    if (!INVENTORY_RELEVANT.has(event.type)) return [];
    if (seenEventIds.has(event.id)) return [];
    seenEventIds.add(event.id);
    switch (event.type) {
      case 'OrderPlaced': {
        if (cancelledOrders.has(event.orderId) || processedOrders.has(event.orderId)) return [];
        processedOrders.add(event.orderId);
        const have = available.get(event.sku) ?? 0;
        if (have >= event.qty) {
          available.set(event.sku, have - event.qty);
          reservations.set(event.orderId, { sku: event.sku, qty: event.qty });
          return [{ id: nextId(), type: 'StockReserved', orderId: event.orderId }];
        }
        return [{ id: nextId(), type: 'StockRejected', orderId: event.orderId }];
      }
      case 'PaymentFailed': {
        if (!releaseReservation(event.orderId)) return [];
        return [{ id: nextId(), type: 'StockReleased', orderId: event.orderId }];
      }
      case 'OrderCancelled': {
        // 取消後放回庫存；取消事件先於下單事件抵達時，之後的 OrderPlaced 會被忽略。
        cancelledOrders.add(event.orderId);
        releaseReservation(event.orderId);
        return [];
      }
      default:
        return [];
    }
  }

  function getAvailable(sku: string): number {
    return available.get(sku) ?? 0;
  }

  return { handle, getAvailable };
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  assertIntegers(balances, 'balance');
  const balance = new Map<string, number>(Object.entries(balances));
  const orderInfo = new Map<string, { customerId: string; amount: number }>();
  const charges = new Map<string, { customerId: string; amount: number }>();
  const decided = new Set<string>(); // 已對該訂單做過付款判定
  const cancelledOrders = new Set<string>();
  const seenEventIds = new Set<string>();
  const nextId = makeIdGen('payment');

  function handle(event: Event): Event[] {
    if (!PAYMENT_RELEVANT.has(event.type)) return [];
    if (seenEventIds.has(event.id)) return [];
    seenEventIds.add(event.id);
    switch (event.type) {
      case 'OrderPlaced':
        orderInfo.set(event.orderId, { customerId: event.customerId, amount: event.amount });
        return [];
      case 'StockReserved': {
        // Q3：已取消的訂單不扣款、不發任何事件。
        if (cancelledOrders.has(event.orderId) || decided.has(event.orderId)) return [];
        const info = orderInfo.get(event.orderId);
        if (!info) return [];
        decided.add(event.orderId);
        const current = balance.get(info.customerId) ?? 0;
        if (current >= info.amount) {
          balance.set(info.customerId, current - info.amount);
          charges.set(event.orderId, { customerId: info.customerId, amount: info.amount });
          return [{ id: nextId(), type: 'PaymentSucceeded', orderId: event.orderId, amount: info.amount }];
        }
        return [{ id: nextId(), type: 'PaymentFailed', orderId: event.orderId }];
      }
      case 'OrderCancelled': {
        cancelledOrders.add(event.orderId);
        const charge = charges.get(event.orderId);
        if (!charge) return [];
        balance.set(charge.customerId, (balance.get(charge.customerId) ?? 0) + charge.amount);
        charges.delete(event.orderId);
        return [{ id: nextId(), type: 'PaymentRefunded', orderId: event.orderId, amount: charge.amount }];
      }
      default:
        return [];
    }
  }

  function getBalance(customerId: string): number {
    return balance.get(customerId) ?? 0;
  }

  return { handle, getBalance };
}
