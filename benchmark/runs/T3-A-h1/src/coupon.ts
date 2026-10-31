export type Coupon = {
  tenantId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;            // PERCENT: 折扣百分比；FIXED: 折扣金額（元）
  validFrom: string;        // ISO 8601，例如 '2026-01-01T00:00:00Z'
  validTo: string;          // ISO 8601
  stackable: boolean;
  minOrderAmount?: number;  // 最低消費（元），未設定表示無限制
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };

// 失敗原因代碼
export const REASON = {
  INVALID_ORDER_AMOUNT: 'INVALID_ORDER_AMOUNT',
  INVALID_NOW: 'INVALID_NOW',
  INVALID_COUPON: 'INVALID_COUPON',
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  NOT_YET_VALID: 'NOT_YET_VALID',
  EXPIRED: 'EXPIRED',
  BELOW_MIN_ORDER: 'BELOW_MIN_ORDER',
  NON_STACKABLE_CONFLICT: 'NON_STACKABLE_CONFLICT',
} as const;

const fail = (reason: string): ApplyResult => ({ ok: false, reason });

const isNonNegativeInteger = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function validateCoupon(c: Coupon, input: ApplyInput, nowMs: number): string | null {
  if (c.tenantId !== input.tenantId) return REASON.TENANT_MISMATCH;

  const fromMs = Date.parse(c.validFrom);
  const toMs = Date.parse(c.validTo);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return REASON.INVALID_COUPON;

  if (c.type === 'PERCENT') {
    if (!Number.isSafeInteger(c.value) || c.value < 0 || c.value > 100) return REASON.INVALID_COUPON;
  } else if (c.type === 'FIXED') {
    if (!isNonNegativeInteger(c.value)) return REASON.INVALID_COUPON;
  } else {
    return REASON.INVALID_COUPON;
  }

  if (c.minOrderAmount !== undefined && !isNonNegativeInteger(c.minOrderAmount)) {
    return REASON.INVALID_COUPON;
  }

  // 有效期間含起訖兩端
  if (nowMs < fromMs) return REASON.NOT_YET_VALID;
  if (nowMs > toMs) return REASON.EXPIRED;

  if (c.minOrderAmount !== undefined && input.orderAmount < c.minOrderAmount) {
    return REASON.BELOW_MIN_ORDER;
  }
  return null;
}

export function applyCoupons(input: ApplyInput): ApplyResult {
  const { orderAmount, coupons, now } = input;

  if (!isNonNegativeInteger(orderAmount)) return fail(REASON.INVALID_ORDER_AMOUNT);
  const nowMs = Date.parse(now);
  if (Number.isNaN(nowMs)) return fail(REASON.INVALID_NOW);

  // 沒有傳入任何優惠券：不是失敗，回傳原價
  if (coupons.length === 0) {
    return { ok: true, finalAmount: orderAmount, discount: 0, applied: [] };
  }

  // 同一租戶內代碼唯一：輸入中重複的代碼視為錯誤
  const codes = new Set<string>();
  for (const c of coupons) {
    if (codes.has(c.code)) return fail(REASON.DUPLICATE_CODE);
    codes.add(c.code);
  }

  for (const c of coupons) {
    const reason = validateCoupon(c, input, nowMs);
    if (reason) return fail(reason);
  }

  // 不可疊加的優惠券一張訂單只能單獨使用
  if (coupons.length > 1 && coupons.some((c) => !c.stackable)) {
    return fail(REASON.NON_STACKABLE_CONFLICT);
  }

  // 依傳入順序計算；百分比一律以折扣前金額計算，折扣不超過剩餘金額（金額不為負）
  let remaining = orderAmount;
  let discount = 0;
  const applied: string[] = [];
  for (const c of coupons) {
    const raw = c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
    const d = Math.min(raw, remaining);
    remaining -= d;
    discount += d;
    if (d > 0) applied.push(c.code);
  }

  return { ok: true, finalAmount: remaining, discount, applied };
}
