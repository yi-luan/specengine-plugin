// 訂單狀態機：全部為純函式，不修改傳入的 order，成功時回傳新的 order 物件。

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

function isIntegerAmount(amount: number): boolean {
  return Number.isInteger(amount);
}

function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
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
    return fail(`訂單狀態為「${statusLabel(order.status)}」，只有「已建立」的訂單可以付款`);
  }
  if (!isIntegerAmount(amount)) {
    return fail('付款金額必須為整數元');
  }
  if (amount !== order.amount) {
    return fail(`付款金額 ${amount} 必須等於訂單金額 ${order.amount}`);
  }
  return succeed({
    ...order,
    status: 'PAID',
    paidAmount: amount,
  });
}

export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') {
    return fail(`訂單狀態為「${statusLabel(order.status)}」，只有「已付款」的訂單可以出貨`);
  }
  return succeed({
    ...order,
    status: 'SHIPPED',
  });
}

export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') {
    return succeed({
      ...order,
      status: 'CANCELLED',
    });
  }
  if (order.status === 'PAID') {
    // 已付款的訂單取消：退還全部已付金額（以累計退款金額記錄，已付金額保留為歷史紀錄）。
    return succeed({
      ...order,
      status: 'CANCELLED',
      refundedAmount: order.paidAmount,
    });
  }
  return fail(`訂單狀態為「${statusLabel(order.status)}」，只有「已建立」或「已付款」的訂單可以取消`);
}

export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') {
    return fail(`訂單狀態為「${statusLabel(order.status)}」，只有「已出貨」的訂單可以申請退款`);
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
      `累計退款金額 ${total} 不得超過已付金額 ${order.paidAmount}（尚可退款 ${order.paidAmount - order.refundedAmount}）`,
    );
  }
  return succeed({
    ...order,
    status: total === order.paidAmount ? 'REFUNDED' : 'SHIPPED',
    refundedAmount: total,
  });
}
