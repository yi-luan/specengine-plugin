// 訂單狀態機（純函式實作）
//
// 狀態流轉：
//   CREATED --pay--> PAID --ship--> SHIPPED --refund(累計達已付金額)--> REFUNDED
//   CREATED / PAID --cancel--> CANCELLED
//
// 所有函式皆不修改傳入的 order；成功時回傳新的 order 物件。

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

function fail(reason: string): OrderResult {
  return { ok: false, reason };
}

function succeed(order: Order): OrderResult {
  return { ok: true, order };
}

/** 金額必須是整數元（有限的整數）。 */
function isIntegerAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isInteger(amount);
}

function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function createOrder(id: string, amount: number): OrderResult {
  if (typeof id !== 'string' || id.trim() === '') {
    return fail('訂單編號不可為空');
  }
  if (!isIntegerAmount(amount)) {
    return fail('訂單金額必須為整數元');
  }
  if (amount <= 0) {
    return fail('訂單金額必須大於 0');
  }
  return succeed({
    id,
    status: 'CREATED',
    amount,
    paidAmount: 0,
    refundedAmount: 0,
  });
}

export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') {
    return fail(`只有已建立的訂單可以付款，目前狀態為${statusLabel(order.status)}`);
  }
  if (!isIntegerAmount(amount)) {
    return fail('付款金額必須為整數元');
  }
  if (amount !== order.amount) {
    return fail(`付款金額必須等於訂單金額 ${order.amount}，實際付款 ${amount}`);
  }
  return succeed({
    ...order,
    status: 'PAID',
    paidAmount: amount,
  });
}

export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') {
    return fail(`只有已付款的訂單可以出貨，目前狀態為${statusLabel(order.status)}`);
  }
  return succeed({
    ...order,
    status: 'SHIPPED',
  });
}

export function cancel(order: Order): OrderResult {
  if (order.status !== 'CREATED' && order.status !== 'PAID') {
    return fail(`只有已建立或已付款的訂單可以取消，目前狀態為${statusLabel(order.status)}`);
  }
  // 已付款的訂單取消時，退還全部已付金額（以累計退款金額記錄）。
  const refundedAmount = order.status === 'PAID' ? order.paidAmount : order.refundedAmount;
  return succeed({
    ...order,
    status: 'CANCELLED',
    refundedAmount,
  });
}

export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') {
    return fail(`只有已出貨的訂單可以申請退款，目前狀態為${statusLabel(order.status)}`);
  }
  if (!isIntegerAmount(amount)) {
    return fail('退款金額必須為整數元');
  }
  if (amount <= 0) {
    return fail('退款金額必須大於 0');
  }
  const total = order.refundedAmount + amount;
  if (total > order.paidAmount) {
    return fail(
      `累計退款金額不得超過已付金額 ${order.paidAmount}，已退款 ${order.refundedAmount}，本次申請 ${amount}`,
    );
  }
  return succeed({
    ...order,
    status: total === order.paidAmount ? 'REFUNDED' : 'SHIPPED',
    refundedAmount: total,
  });
}
