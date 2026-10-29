// T2 參考實作：依標準答案表寫成，用來驗證隱藏測試本身沒有寫錯（32/32 通過）。
export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = { id: string; status: OrderStatus; amount: number; paidAmount: number; refundedAmount: number };
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

const fail = (reason: string): OrderResult => ({ ok: false, reason });
const validAmount = (n: number) => Number.isInteger(n) && n > 0;

export function createOrder(id: string, amount: number): OrderResult {
  if (!validAmount(amount)) return fail('INVALID_AMOUNT');
  return { ok: true, order: { id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 } };
}
export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') return fail('INVALID_TRANSITION');
  if (!validAmount(amount)) return fail('INVALID_AMOUNT');
  if (amount !== order.amount) return fail('AMOUNT_MISMATCH');
  return { ok: true, order: { ...order, status: 'PAID', paidAmount: amount } };
}
export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') return fail('INVALID_TRANSITION');
  return { ok: true, order: { ...order, status: 'SHIPPED' } };
}
export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') return { ok: true, order: { ...order, status: 'CANCELLED', paidAmount: 0, refundedAmount: 0 } };
  if (order.status === 'PAID') return { ok: true, order: { ...order, status: 'CANCELLED', refundedAmount: order.paidAmount } };
  return fail('INVALID_TRANSITION');
}
export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') return fail('INVALID_TRANSITION');
  if (!validAmount(amount)) return fail('INVALID_AMOUNT');
  const remaining = order.paidAmount - order.refundedAmount;
  if (amount > remaining) return fail('REFUND_EXCEEDS_PAID');
  const refundedAmount = order.refundedAmount + amount;
  return { ok: true, order: { ...order, refundedAmount, status: refundedAmount === order.paidAmount ? 'REFUNDED' : 'SHIPPED' } };
}
