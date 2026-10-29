export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

/** 失敗原因固定代碼（需求方指定）。 */
export const REASONS = {
  /** 金額不是正整數 */
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  /** 付款金額不等於訂單金額 */
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  /** 目前狀態不允許此操作 */
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  /** 累計退款會超過已付金額 */
  REFUND_EXCEEDS_PAID: 'REFUND_EXCEEDS_PAID',
} as const;

/** 金額皆為整數元，且必須為正。 */
function isValidAmount(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

function ok(order: Order): OrderResult {
  return { ok: true, order };
}

function fail(reason: string): OrderResult {
  return { ok: false, reason };
}

/**
 * 判定順序（所有操作一致）：
 *   1. 狀態守衛        → INVALID_TRANSITION
 *   2. 金額合法性      → INVALID_AMOUNT
 *   3. 金額比對        → AMOUNT_MISMATCH / REFUND_EXCEEDS_PAID
 * 所有函式皆為純函式：不修改傳入的 order，成功時回傳新物件。
 */

export function createOrder(id: string, amount: number): OrderResult {
  if (!isValidAmount(amount)) return fail(REASONS.INVALID_AMOUNT);
  return ok({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') return fail(REASONS.INVALID_TRANSITION);
  if (!isValidAmount(amount)) return fail(REASONS.INVALID_AMOUNT);
  if (amount !== order.amount) return fail(REASONS.AMOUNT_MISMATCH);
  return ok({ ...order, status: 'PAID', paidAmount: amount });
}

export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') return fail(REASONS.INVALID_TRANSITION);
  return ok({ ...order, status: 'SHIPPED' });
}

export function cancel(order: Order): OrderResult {
  if (order.status !== 'CREATED' && order.status !== 'PAID') {
    return fail(REASONS.INVALID_TRANSITION);
  }
  // 已付款取消：退還全部已付金額（refundedAmount = paidAmount）；
  // 已建立取消：paidAmount 為 0，refundedAmount 自然為 0。
  return ok({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
}

export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') return fail(REASONS.INVALID_TRANSITION);
  if (!isValidAmount(amount)) return fail(REASONS.INVALID_AMOUNT);
  const refunded = order.refundedAmount + amount;
  if (refunded > order.paidAmount) return fail(REASONS.REFUND_EXCEEDS_PAID);
  const status: OrderStatus = refunded === order.paidAmount ? 'REFUNDED' : 'SHIPPED';
  return ok({ ...order, status, refundedAmount: refunded });
}
