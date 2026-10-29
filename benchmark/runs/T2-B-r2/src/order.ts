export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

// Fixed failure reason codes (see specs/001-order-state-machine/contracts/order-api.md).
const REASON = {
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  REFUND_EXCEEDS_PAID: 'REFUND_EXCEEDS_PAID',
} as const;

/** Amounts are whole dollars: a finite integer greater than 0. */
function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

function fail(reason: string): OrderResult {
  return { ok: false, reason };
}

function succeed(order: Order): OrderResult {
  return { ok: true, order };
}

export function createOrder(id: string, amount: number): OrderResult {
  if (!isValidAmount(amount)) {
    return fail(REASON.INVALID_AMOUNT);
  }
  return succeed({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') {
    return fail(REASON.INVALID_TRANSITION);
  }
  if (!isValidAmount(amount)) {
    return fail(REASON.INVALID_AMOUNT);
  }
  if (amount !== order.amount) {
    return fail(REASON.AMOUNT_MISMATCH);
  }
  return succeed({ ...order, status: 'PAID', paidAmount: amount });
}

export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') {
    return fail(REASON.INVALID_TRANSITION);
  }
  return succeed({ ...order, status: 'SHIPPED' });
}

export function cancel(order: Order): OrderResult {
  if (order.status !== 'CREATED' && order.status !== 'PAID') {
    return fail(REASON.INVALID_TRANSITION);
  }
  // Cancelling a paid order returns the full paid amount; paidAmount stays as history.
  return succeed({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
}

export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') {
    return fail(REASON.INVALID_TRANSITION);
  }
  if (!isValidAmount(amount)) {
    return fail(REASON.INVALID_AMOUNT);
  }
  const refundedAmount = order.refundedAmount + amount;
  if (refundedAmount > order.paidAmount) {
    return fail(REASON.REFUND_EXCEEDS_PAID);
  }
  return succeed({
    ...order,
    refundedAmount,
    status: refundedAmount === order.paidAmount ? 'REFUNDED' : 'SHIPPED',
  });
}
