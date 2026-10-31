export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

const STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED: '已建立',
  PAID: '已付款',
  SHIPPED: '已出貨',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
};

const ok = (order: Order): OrderResult => ({ ok: true, order });
const fail = (reason: string): OrderResult => ({ ok: false, reason });
const isPositiveInteger = (n: number): boolean => Number.isInteger(n) && n > 0;
const wrongStatus = (order: Order, action: string): OrderResult =>
  fail(`訂單目前為「${STATUS_LABEL[order.status]}」，無法${action}`);

/** 建立訂單，狀態為「已建立」。金額必須為大於 0 的整數。 */
export function createOrder(id: string, amount: number): OrderResult {
  if (!isPositiveInteger(amount)) {
    return fail('訂單金額必須為大於 0 的整數');
  }
  return ok({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

/** 付款：僅限「已建立」訂單，且付款金額必須等於訂單金額。 */
export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') {
    return wrongStatus(order, '付款');
  }
  if (amount !== order.amount) {
    return fail(`付款金額必須等於訂單金額 ${order.amount}`);
  }
  return ok({ ...order, status: 'PAID', paidAmount: amount });
}

/** 出貨：僅限「已付款」訂單。 */
export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') {
    return wrongStatus(order, '出貨');
  }
  return ok({ ...order, status: 'SHIPPED' });
}

/**
 * 取消：僅限「已建立」或「已付款」訂單。
 * 已付款的訂單會全額退還，refundedAmount 設為 paidAmount。
 */
export function cancel(order: Order): OrderResult {
  if (order.status !== 'CREATED' && order.status !== 'PAID') {
    return wrongStatus(order, '取消');
  }
  return ok({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
}

/**
 * 退款：僅限「已出貨」訂單。可分多次退款，累計退款金額不得超過已付金額。
 * 累計退款金額達到已付金額時，狀態變為「已退款」，否則維持「已出貨」。
 */
export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') {
    return wrongStatus(order, '退款');
  }
  if (!isPositiveInteger(amount)) {
    return fail('退款金額必須為大於 0 的整數');
  }
  const remaining = order.paidAmount - order.refundedAmount;
  if (amount > remaining) {
    return fail(`退款金額超過可退餘額 ${remaining}`);
  }
  const refundedAmount = order.refundedAmount + amount;
  const status = refundedAmount === order.paidAmount ? 'REFUNDED' : 'SHIPPED';
  return ok({ ...order, status, refundedAmount });
}
