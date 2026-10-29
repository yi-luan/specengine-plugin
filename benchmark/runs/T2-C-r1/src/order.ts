// src/order.ts — 訂單狀態機（模組 ORDER_STATE_MACHINE）
// 規格來源：.specengine/spec/features/訂單狀態機.feature、.specengine/sdd/matrix/ORDER_STATE_MACHINE.json
// 全部為純函式：不修改傳入的 order，成功時回傳新的 order 物件。金額皆為整數元。

export type OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED';
export type Order = {
  id: string;
  status: OrderStatus;
  amount: number;          // 訂單金額
  paidAmount: number;      // 已付金額
  refundedAmount: number;  // 累計退款金額
};
export type OrderResult = { ok: true; order: Order } | { ok: false; reason: string };

// 失敗原因採固定英文代碼。決策見 .specengine/sdd/resolved/features/訂單狀態機_失敗原因的格式與優先序.md（terms.md MSG-001～004）
const INVALID_TRANSITION = 'INVALID_TRANSITION';
const INVALID_AMOUNT = 'INVALID_AMOUNT';
const AMOUNT_MISMATCH = 'AMOUNT_MISMATCH';
const REFUND_EXCEEDS_PAID = 'REFUND_EXCEEDS_PAID';

const ok = (order: Order): OrderResult => ({ ok: true, order });
const fail = (reason: string): OrderResult => ({ ok: false, reason });

// 金額必須為正整數；0、負數、非整數、NaN／Infinity 一律不合法。
// 決策見 .specengine/sdd/resolved/data/訂單狀態機_非整數金額輸入.md、resolved/features/訂單狀態機_退款金額為零或負數.md（POLICY-002）
const isPositiveInteger = (n: number): boolean => Number.isInteger(n) && n > 0;

/** 建立訂單：金額必須為正整數，建立後狀態為 CREATED。 */
export function createOrder(id: string, amount: number): OrderResult {
  if (!isPositiveInteger(amount)) return fail(INVALID_AMOUNT);
  // id 不驗證，決策見 .specengine/spec/exclusions.md X-ORDER_STATE_MACHINE-001
  return ok({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

/**
 * 付款：只有 CREATED 可付款；檢查順序 狀態 → 金額合法性 → 金額比對。
 * 付款金額必須等於訂單金額，不允許部分付款。決策見 resolved/features/訂單狀態機_付款金額不等於訂單金額.md
 */
export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') return fail(INVALID_TRANSITION);
  if (!isPositiveInteger(amount)) return fail(INVALID_AMOUNT);
  if (amount !== order.amount) return fail(AMOUNT_MISMATCH);
  return ok({ ...order, status: 'PAID', paidAmount: amount });
}

/** 出貨：只有 PAID 可出貨。CREATED 出貨拒絕，決策見 resolved/features/訂單狀態機_已建立訂單取消後的金額欄位與能否出貨.md */
export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') return fail(INVALID_TRANSITION);
  return ok({ ...order, status: 'SHIPPED' });
}

/**
 * 取消：CREATED 或 PAID 可取消。
 * - CREATED：paidAmount、refundedAmount 皆為 0。
 * - PAID：退還全部已付金額，以 refundedAmount = paidAmount 表示。決策見 resolved/features/訂單狀態機_已付款訂單取消後的狀態與退款欄位.md
 * - SHIPPED／CANCELLED／REFUNDED：拒絕。決策見 resolved/features/訂單狀態機_已出貨訂單能否取消.md 等
 */
export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') return ok({ ...order, status: 'CANCELLED', paidAmount: 0, refundedAmount: 0 });
  if (order.status === 'PAID') return ok({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
  return fail(INVALID_TRANSITION);
}

/**
 * 退款：只有 SHIPPED 可退款，可分多次；檢查順序 狀態 → 金額合法性 → 金額比對。
 * 累計超過已付金額整筆拒絕不截斷（POLICY-001）；累計恰等於已付金額時狀態變 REFUNDED；否則維持 SHIPPED。
 * 決策見 resolved/features/訂單狀態機_單次退款超過剩餘可退金額.md、訂單狀態機_部分退款後的狀態.md、訂單狀態機_已付款未出貨能否直接退款.md
 */
export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') return fail(INVALID_TRANSITION);
  if (!isPositiveInteger(amount)) return fail(INVALID_AMOUNT);
  const total = order.refundedAmount + amount;
  if (total > order.paidAmount) return fail(REFUND_EXCEEDS_PAID);
  return ok({ ...order, refundedAmount: total, status: total === order.paidAmount ? 'REFUNDED' : 'SHIPPED' });
}
