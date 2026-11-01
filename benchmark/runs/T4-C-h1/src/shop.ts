// 事件驅動下單流程：訂單、庫存、付款三個服務（純記憶體、無 IO）。
// 公開介面依需求文件「技術介面（固定，不可更名）」。
// 各服務只保存自己的狀態，彼此只透過事件溝通（step 層負責廣播）。
// 決策來源：.specengine/sdd/resolved/features/*.md、矩陣 .specengine/sdd/matrix/EVENT_DRIVEN_ORDER.json

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

// 逾時門檻：下單後滿 15 分鐘（R-EVENT_DRIVEN_ORDER-004，邊界 MCQ 已裁示為「滿 15 分鐘即逾時」）
const TIMEOUT_MS = 15 * 60 * 1000;

const newId = (): string => randomUUID();

const isPositiveInt = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isNonEmpty = (s: unknown): boolean => typeof s === 'string' && s.length > 0;

// ---------- 訂單服務 ----------
type OrderRow = {
  customerId: string;
  sku: string;
  qty: number;
  amount: number;
  placedAt: string;
  status: OrderStatus;
  cancelReason?: 'CUSTOMER' | 'TIMEOUT';
};

class OrderServiceImpl implements OrderService {
  private orders = new Map<string, OrderRow>();
  private processed = new Set<string>();

  placeOrder(input: PlaceOrderInput): CommandResult {
    // R-008：輸入不合法
    if (!isNonEmpty(input.orderId) || !isNonEmpty(input.customerId) || !isNonEmpty(input.sku)
      || !isPositiveInt(input.qty) || !isPositiveInt(input.amount)) {
      return { ok: false, reason: 'INVALID_INPUT' };
    }
    // R-009：重複訂單編號
    if (this.orders.has(input.orderId)) {
      return { ok: false, reason: 'DUPLICATE_ORDER' };
    }
    this.orders.set(input.orderId, {
      customerId: input.customerId,
      sku: input.sku,
      qty: input.qty,
      amount: input.amount,
      placedAt: input.at,
      status: 'PENDING',
    });
    const event: Event = {
      id: newId(), type: 'OrderPlaced', orderId: input.orderId, customerId: input.customerId,
      sku: input.sku, qty: input.qty, amount: input.amount, at: input.at,
    };
    return { ok: true, events: [event] };
  }

  cancelOrder(orderId: string, _at: string): CommandResult {
    const row = this.orders.get(orderId);
    // R-011：找不到訂單
    if (!row) return { ok: false, reason: 'ORDER_NOT_FOUND' };
    // R-010：庫存不足、付款失敗、已取消皆為終態，不可取消
    // R-003 / R-006：處理中與已確認皆可由顧客取消
    if (row.status === 'REJECTED' || row.status === 'FAILED' || row.status === 'CANCELLED') {
      return { ok: false, reason: 'NOT_CANCELLABLE' };
    }
    row.status = 'CANCELLED';
    row.cancelReason = 'CUSTOMER';
    return { ok: true, events: [{ id: newId(), type: 'OrderCancelled', orderId }] };
  }

  tick(now: string): Event[] {
    const out: Event[] = [];
    const nowMs = Date.parse(now);
    for (const [orderId, row] of this.orders) {
      // R-004：只有處理中訂單會逾時；滿 15 分鐘即取消
      if (row.status !== 'PENDING') continue;
      if (nowMs - Date.parse(row.placedAt) < TIMEOUT_MS) continue;
      row.status = 'CANCELLED';
      row.cancelReason = 'TIMEOUT';
      out.push({ id: newId(), type: 'OrderCancelled', orderId });
    }
    return out;
  }

  handle(event: Event): Event[] {
    // R-005：同一事件 id 重複送達不產生額外效果
    if (this.processed.has(event.id)) return [];
    this.processed.add(event.id);

    const row = this.orders.get(event.orderId);
    if (!row) return [];

    switch (event.type) {
      case 'PaymentSucceeded':
        if (row.status === 'PENDING') row.status = 'CONFIRMED';
        return [];
      case 'StockRejected':
        if (row.status === 'PENDING') row.status = 'REJECTED';
        return [];
      case 'PaymentFailed':
        if (row.status === 'PENDING') row.status = 'FAILED';
        return [];
      default:
        // R-007：終態與不符狀態的事件忽略（OrderCancelled 等自己發出的事件也不改狀態）
        return [];
    }
  }

  getOrder(orderId: string): { status: OrderStatus; cancelReason?: 'CUSTOMER' | 'TIMEOUT' } | undefined {
    const row = this.orders.get(orderId);
    if (!row) return undefined;
    return row.cancelReason ? { status: row.status, cancelReason: row.cancelReason } : { status: row.status };
  }
}

// ---------- 庫存服務 ----------
type Reservation = { sku: string; qty: number; status: 'HELD' | 'RELEASED' };

class InventoryServiceImpl implements InventoryService {
  private total = new Map<string, number>();
  private reservations = new Map<string, Reservation>();
  private cancelledOrders = new Set<string>();
  private processed = new Set<string>();

  constructor(stock: Record<string, number>) {
    for (const [sku, qty] of Object.entries(stock)) this.total.set(sku, qty);
  }

  getAvailable(sku: string): number {
    const total = this.total.get(sku) ?? 0;
    let held = 0;
    for (const r of this.reservations.values()) {
      if (r.sku === sku && r.status === 'HELD') held += r.qty;
    }
    return total - held;
  }

  handle(event: Event): Event[] {
    if (this.processed.has(event.id)) return [];
    this.processed.add(event.id);

    switch (event.type) {
      case 'OrderPlaced': {
        // R-014：先收到取消的訂單，之後到的 OrderPlaced 不保留庫存也不發事件
        if (this.cancelledOrders.has(event.orderId)) return [];
        // 同一訂單不重複保留（R-005 的訂單層保護）
        if (this.reservations.has(event.orderId)) return [];
        // R-001 / 主幹：庫存足夠才保留
        if (this.getAvailable(event.sku) >= event.qty) {
          this.reservations.set(event.orderId, { sku: event.sku, qty: event.qty, status: 'HELD' });
          return [{ id: newId(), type: 'StockReserved', orderId: event.orderId }];
        }
        return [{ id: newId(), type: 'StockRejected', orderId: event.orderId }];
      }
      case 'OrderCancelled': {
        // R-003 / R-006 / R-004：取消時放回實際保留的數量，同一訂單最多一次
        this.cancelledOrders.add(event.orderId);
        return this.release(event.orderId);
      }
      case 'PaymentFailed':
        // R-002：付款失敗時放回為該訂單保留的庫存
        return this.release(event.orderId);
      default:
        return [];
    }
  }

  private release(orderId: string): Event[] {
    const r = this.reservations.get(orderId);
    if (!r || r.status !== 'HELD') return [];
    r.status = 'RELEASED';
    return [{ id: newId(), type: 'StockReleased', orderId }];
  }
}

// ---------- 付款服務 ----------
type ChargeRow = { customerId: string; amount: number; status: 'CHARGED' | 'REFUNDED' };

class PaymentServiceImpl implements PaymentService {
  private balances = new Map<string, number>();
  // 付款服務所知的訂單資料（由 OrderPlaced 得到）
  private orders = new Map<string, { customerId: string; amount: number }>();
  private cancelled = new Set<string>();
  // 已收到 StockReserved 但尚未知道訂單內容的訂單（R-013）
  private buffered = new Set<string>();
  private charges = new Map<string, ChargeRow>();
  private processed = new Set<string>();

  constructor(balances: Record<string, number>) {
    for (const [customerId, balance] of Object.entries(balances)) this.balances.set(customerId, balance);
  }

  getBalance(customerId: string): number {
    return this.balances.get(customerId) ?? 0;
  }

  handle(event: Event): Event[] {
    if (this.processed.has(event.id)) return [];
    this.processed.add(event.id);

    switch (event.type) {
      case 'OrderPlaced': {
        this.orders.set(event.orderId, { customerId: event.customerId, amount: event.amount });
        if (this.buffered.has(event.orderId)) {
          this.buffered.delete(event.orderId);
          return this.tryCharge(event.orderId);
        }
        return [];
      }
      case 'StockReserved': {
        // R-012：付款服務已知訂單被取消，不扣款也不發事件
        if (this.cancelled.has(event.orderId)) return [];
        // R-013：尚不知道訂單內容，先暫存
        if (!this.orders.has(event.orderId)) {
          this.buffered.add(event.orderId);
          return [];
        }
        return this.tryCharge(event.orderId);
      }
      case 'OrderCancelled': {
        this.cancelled.add(event.orderId);
        this.buffered.delete(event.orderId);
        // R-006 / R-003：已扣款則全額退款，同一訂單最多退一次
        const charge = this.charges.get(event.orderId);
        if (charge && charge.status === 'CHARGED') {
          charge.status = 'REFUNDED';
          this.balances.set(charge.customerId, (this.balances.get(charge.customerId) ?? 0) + charge.amount);
          return [{ id: newId(), type: 'PaymentRefunded', orderId: event.orderId, amount: charge.amount }];
        }
        return [];
      }
      default:
        return [];
    }
  }

  private tryCharge(orderId: string): Event[] {
    if (this.cancelled.has(orderId) || this.charges.has(orderId)) return [];
    const info = this.orders.get(orderId);
    if (!info) return [];
    const balance = this.balances.get(info.customerId) ?? 0;
    if (balance >= info.amount) {
      this.balances.set(info.customerId, balance - info.amount);
      this.charges.set(orderId, { customerId: info.customerId, amount: info.amount, status: 'CHARGED' });
      return [{ id: newId(), type: 'PaymentSucceeded', orderId, amount: info.amount }];
    }
    // R-002：餘額不足
    return [{ id: newId(), type: 'PaymentFailed', orderId }];
  }
}

// ---------- 工廠 ----------
export function createOrderService(): OrderService {
  return new OrderServiceImpl();
}

export function createInventoryService(stock: Record<string, number>): InventoryService {
  return new InventoryServiceImpl(stock);
}

export function createPaymentService(balances: Record<string, number>): PaymentService {
  return new PaymentServiceImpl(balances);
}
