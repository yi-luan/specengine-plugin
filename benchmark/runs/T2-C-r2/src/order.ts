// src/order.ts — 訂單狀態機（模組 ORDER_STATE_MACHINE）
// 規格來源：.specengine/spec/features/訂單狀態機.feature（單一真實來源）、.specengine/sdd/matrix/ORDER_STATE_MACHINE.json
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

// 失敗原因固定代碼（terms.md 固定文案 MSG-001～004）。
// 決策見 .specengine/sdd/resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md
export const INVALID_AMOUNT = 'INVALID_AMOUNT';
export const AMOUNT_MISMATCH = 'AMOUNT_MISMATCH';
export const INVALID_TRANSITION = 'INVALID_TRANSITION';
export const REFUND_EXCEEDS_PAID = 'REFUND_EXCEEDS_PAID';

const succeed = (order: Order): OrderResult => ({ ok: true, order });
const reject = (reason: string): OrderResult => ({ ok: false, reason });

/** 金額合法：整數元且 > 0（POLICY-003：0 或負數一律不合法）。 */
const isValidAmount = (n: number): boolean => Number.isInteger(n) && n > 0;

/**
 * 建立訂單：金額必須 > 0，狀態為 CREATED，已付／累計退款皆為 0。
 * R-ORDER_STATE_MACHINE-000／001
 */
export function createOrder(id: string, amount: number): OrderResult {
  if (!isValidAmount(amount)) return reject(INVALID_AMOUNT);
  return succeed({ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 });
}

/**
 * 付款：只有 CREATED 可付款；檢查順序先狀態 → 再金額合法性 → 再金額比對（POLICY-001）。
 * R-ORDER_STATE_MACHINE-002／003／019；狀態不允許：R-010／011／012／017／018
 * 決策見 .specengine/sdd/resolved/features/訂單狀態機_付款金額為零或負數的失敗代碼.md
 */
export function pay(order: Order, amount: number): OrderResult {
  if (order.status !== 'CREATED') return reject(INVALID_TRANSITION);
  if (!isValidAmount(amount)) return reject(INVALID_AMOUNT);
  if (amount !== order.amount) return reject(AMOUNT_MISMATCH);
  return succeed({ ...order, status: 'PAID', paidAmount: amount });
}

/**
 * 出貨：只有 PAID 可出貨。R-ORDER_STATE_MACHINE-004；狀態不允許：R-011／012／016／017
 */
export function ship(order: Order): OrderResult {
  if (order.status !== 'PAID') return reject(INVALID_TRANSITION);
  return succeed({ ...order, status: 'SHIPPED' });
}

/**
 * 取消：CREATED → CANCELLED（金額欄位維持 0）；PAID → CANCELLED 並退還全部已付（refundedAmount = paidAmount，paidAmount 不變）。
 * 其餘狀態（SHIPPED／CANCELLED／REFUNDED）拒絕。R-ORDER_STATE_MACHINE-005／006／011／012／015
 * 決策見 .specengine/sdd/resolved/features/訂單狀態機_已付款訂單取消退還後的狀態與累計退款金額.md
 */
export function cancel(order: Order): OrderResult {
  if (order.status === 'CREATED') return succeed({ ...order, status: 'CANCELLED' });
  if (order.status === 'PAID') return succeed({ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount });
  return reject(INVALID_TRANSITION);
}

/**
 * 申請退款：只有 SHIPPED 可退款，可分多次；金額 ≤ 0 不合法；累計超過已付整筆拒絕不截斷；累計剛好達到已付 → REFUNDED。
 * R-ORDER_STATE_MACHINE-007／008／009／013／014；狀態不允許：R-011／012／018
 * 決策見 .specengine/sdd/resolved/features/訂單狀態機_單次退款超過剩餘可退金額的反應.md
 */
export function refund(order: Order, amount: number): OrderResult {
  if (order.status !== 'SHIPPED') return reject(INVALID_TRANSITION);
  if (!isValidAmount(amount)) return reject(INVALID_AMOUNT);
  const total = order.refundedAmount + amount;
  if (total > order.paidAmount) return reject(REFUND_EXCEEDS_PAID);
  const status: OrderStatus = total === order.paidAmount ? 'REFUNDED' : 'SHIPPED';
  return succeed({ ...order, status, refundedAmount: total });
}
