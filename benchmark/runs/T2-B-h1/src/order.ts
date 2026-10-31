export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';

export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};

export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

const NOT_IMPLEMENTED = (): OrderResult => ({ ok: false, reason: 'not implemented' });

const fail = (reason: string): OrderResult => ({ ok: false, reason });

const isPositiveInteger = (n: number): boolean => Number.isInteger(n) && n > 0;

export function createOrder(id: string, amount: number): OrderResult {
  if (!isPositiveInteger(amount)) {
    return fail('訂單金額必須為大於 0 的整數元');
  }
  return {
    ok: true,
    order: { id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 },
  };
}

export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') {
    return fail('只有已建立的訂單可以付款');
  }
  if (amount !== order.amount) {
    return fail('付款金額必須等於訂單金額');
  }
  return {
    ok: true,
    order: { ...order, status: 'PAID', paidAmount: amount },
  };
}

export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') {
    return fail('只有已付款的訂單可以出貨');
  }
  return { ok: true, order: { ...order, status: 'SHIPPED' } };
}

export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') {
    return { ok: true, order: { ...order, status: 'CANCELLED' } };
  }
  if (order.status === 'PAID') {
    // Clarifications Q1: 已付款取消時全額退還，計入累計退款金額。
    return {
      ok: true,
      order: { ...order, status: 'CANCELLED', refundedAmount: order.paidAmount },
    };
  }
  return fail('只有已建立或已付款的訂單可以取消');
}

export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') {
    return fail('只有已出貨的訂單可以申請退款');
  }
  if (!isPositiveInteger(amount)) {
    return fail('退款金額必須為大於 0 的整數元');
  }
  const total = order.refundedAmount + amount;
  if (total > order.paidAmount) {
    return fail('累計退款金額不得超過已付金額');
  }
  const status: OrderStatus = total === order.paidAmount ? 'REFUNDED' : 'SHIPPED';
  return { ok: true, order: { ...order, status, refundedAmount: total } };
}
