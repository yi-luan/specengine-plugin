// T4 參考實作：依 tasks/t4/answers.md 的標準答案。
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
export interface InventoryService { handle(event: Event): Event[]; getAvailable(sku: string): number }
export interface PaymentService { handle(event: Event): Event[]; getBalance(customerId: string): number }

let seq = 0;
const newId = (svc: string) => `${svc}-${++seq}`;
const posInt = (n: number) => Number.isInteger(n) && n > 0;
const TIMEOUT_MS = 15 * 60 * 1000;

export function createOrderService(): OrderService {
  const orders = new Map<string, { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT'; at: number }>();
  const seen = new Set<string>();
  const cancel = (orderId: string, reason: 'CUSTOMER' | 'TIMEOUT'): Event => {
    const o = orders.get(orderId)!;
    o.status = 'CANCELLED'; o.cancelReason = reason;
    return { id: newId('order'), type: 'OrderCancelled', orderId };
  };
  return {
    placeOrder(i) {
      if (!i.orderId || !i.customerId || !i.sku || !posInt(i.qty) || !posInt(i.amount)) return { ok: false, reason: 'INVALID_INPUT' };
      if (orders.has(i.orderId)) return { ok: false, reason: 'DUPLICATE_ORDER' };
      orders.set(i.orderId, { status: 'PENDING', at: Date.parse(i.at) });
      return { ok: true, events: [{ id: newId('order'), type: 'OrderPlaced', ...i }] };
    },
    cancelOrder(orderId) {
      const o = orders.get(orderId);
      if (!o) return { ok: false, reason: 'ORDER_NOT_FOUND' };
      if (o.status !== 'PENDING' && o.status !== 'CONFIRMED') return { ok: false, reason: 'NOT_CANCELLABLE' };
      return { ok: true, events: [cancel(orderId, 'CUSTOMER')] };
    },
    tick(now) {
      const t = Date.parse(now);
      const out: Event[] = [];
      for (const [id, o] of orders) if (o.status === 'PENDING' && t - o.at >= TIMEOUT_MS) out.push(cancel(id, 'TIMEOUT'));
      return out;
    },
    handle(e) {
      if (seen.has(e.id)) return [];
      seen.add(e.id);
      const o = orders.get(e.orderId);
      if (!o || o.status !== 'PENDING') return [];
      if (e.type === 'PaymentSucceeded') o.status = 'CONFIRMED';
      else if (e.type === 'StockRejected') o.status = 'REJECTED';
      else if (e.type === 'PaymentFailed') o.status = 'FAILED';
      return [];
    },
    getOrder(orderId) {
      const o = orders.get(orderId);
      return o && (o.cancelReason ? { status: o.status, cancelReason: o.cancelReason } : { status: o.status });
    },
  };
}

export function createInventoryService(stock: Record<string, number>): InventoryService {
  const available = new Map(Object.entries(stock));
  const reserved = new Map<string, { sku: string; qty: number }>();
  const done = new Set<string>(); // 已取消、已拒絕或已放回的訂單
  const seen = new Set<string>();
  const release = (orderId: string): Event[] => {
    const r = reserved.get(orderId);
    done.add(orderId);
    if (!r) return [];
    reserved.delete(orderId);
    available.set(r.sku, (available.get(r.sku) ?? 0) + r.qty);
    return [{ id: newId('inventory'), type: 'StockReleased', orderId }];
  };
  return {
    handle(e) {
      if (seen.has(e.id)) return [];
      seen.add(e.id);
      if (e.type === 'OrderPlaced') {
        if (done.has(e.orderId) || reserved.has(e.orderId)) return [];
        const have = available.get(e.sku) ?? 0;
        if (have < e.qty) { done.add(e.orderId); return [{ id: newId('inventory'), type: 'StockRejected', orderId: e.orderId }]; }
        available.set(e.sku, have - e.qty);
        reserved.set(e.orderId, { sku: e.sku, qty: e.qty });
        return [{ id: newId('inventory'), type: 'StockReserved', orderId: e.orderId }];
      }
      if (e.type === 'PaymentFailed' || e.type === 'OrderCancelled') return release(e.orderId);
      return [];
    },
    getAvailable: (sku) => available.get(sku) ?? 0,
  };
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  const balance = new Map(Object.entries(balances));
  const orders = new Map<string, { customerId: string; amount: number }>(); // 從 OrderPlaced 得知顧客與金額
  const charged = new Map<string, number>();
  const closed = new Set<string>(); // 已取消或已處理過扣款的訂單
  const cancelled = new Set<string>();
  const pendingReserve = new Set<string>(); // 先收到 StockReserved、還不知道顧客與金額
  const seen = new Set<string>();
  const charge = (orderId: string): Event[] => {
    if (closed.has(orderId) || cancelled.has(orderId)) return [];
    const o = orders.get(orderId);
    if (!o) { pendingReserve.add(orderId); return []; }
    closed.add(orderId);
    const have = balance.get(o.customerId) ?? 0;
    if (have < o.amount) return [{ id: newId('payment'), type: 'PaymentFailed', orderId }];
    balance.set(o.customerId, have - o.amount);
    charged.set(orderId, o.amount);
    return [{ id: newId('payment'), type: 'PaymentSucceeded', orderId, amount: o.amount }];
  };
  return {
    handle(e) {
      if (seen.has(e.id)) return [];
      seen.add(e.id);
      if (e.type === 'OrderPlaced') {
        orders.set(e.orderId, { customerId: e.customerId, amount: e.amount });
        if (pendingReserve.delete(e.orderId)) return charge(e.orderId);
        return [];
      }
      if (e.type === 'StockReserved') return charge(e.orderId);
      if (e.type === 'OrderCancelled') {
        cancelled.add(e.orderId);
        pendingReserve.delete(e.orderId);
        const amount = charged.get(e.orderId);
        if (amount === undefined) return [];
        charged.delete(e.orderId);
        const c = orders.get(e.orderId)!.customerId;
        balance.set(c, (balance.get(c) ?? 0) + amount);
        return [{ id: newId('payment'), type: 'PaymentRefunded', orderId: e.orderId, amount }];
      }
      return [];
    },
    getBalance: (c) => balance.get(c) ?? 0,
  };
}
