// 訂單狀態機（純函式）。
// 決策見 .specengine/sdd/matrix/ORDER_STATE_MACHINE.json 與 .specengine/sdd/resolved/ 下的紀錄。
// 操作失敗時 reason 為固定英文代碼；檢查順序：狀態 → 金額合法性 → 金額比對／上限。

export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

const success = (order: Order): OrderResult => ({ ok: true, order });
const failure = (reason: string): OrderResult => ({ ok: false, reason });

// 金額必須為正整數元（R-ORDER_STATE_MACHINE-002、011）
const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

// R-ORDER_STATE_MACHINE-001、002
export function createOrder(id: string, amount: number): OrderResult {
  if (!isPositiveInteger(amount)) return failure('INVALID_AMOUNT');
  return success({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

// R-ORDER_STATE_MACHINE-003、004、010、011
export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') return failure('INVALID_TRANSITION');
  if (!isPositiveInteger(amount)) return failure('INVALID_AMOUNT');
  if (amount !== order.amount) return failure('AMOUNT_MISMATCH');
  return success({ ...order, status: 'PAID', paidAmount: amount });
}

// R-ORDER_STATE_MACHINE-005、010
export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') return failure('INVALID_TRANSITION');
  return success({ ...order, status: 'SHIPPED' });
}

// R-ORDER_STATE_MACHINE-006、007、010：已付款取消時 refundedAmount = paidAmount（決策見 resolved/data/訂單狀態機_取消退款是否計入累計退款金額.md）
export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') {
    return success({ ...order, status: 'CANCELLED' });
  }
  if (order.status === 'PAID') {
    return success({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
  }
  return failure('INVALID_TRANSITION');
}

// R-ORDER_STATE_MACHINE-008、009、010、011、012
export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') return failure('INVALID_TRANSITION');
  if (!isPositiveInteger(amount)) return failure('INVALID_AMOUNT');
  const total = order.refundedAmount + amount;
  if (total > order.paidAmount) return failure('REFUND_EXCEEDS_PAID');
  const status: OrderStatus = total === order.paidAmount ? 'REFUNDED' : 'SHIPPED';
  return success({ ...order, status, refundedAmount: total });
}
