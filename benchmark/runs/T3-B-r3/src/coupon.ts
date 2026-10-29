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

/** 失敗原因代碼，依優先序由高到低排列（FR-016）。 */
const REASONS = [
  'INVALID_INPUT',
  'INVALID_COUPON',
  'TENANT_MISMATCH',
  'DUPLICATE_COUPON',
  'COUPON_EXPIRED',
  'MIN_ORDER_NOT_MET',
  'NOT_STACKABLE',
  'DISCOUNT_EXCEEDS_AMOUNT',
] as const;
type Reason = (typeof REASONS)[number];

const fail = (reason: Reason): ApplyResult => ({ ok: false, reason });

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** 可解析為時間戳的字串回傳毫秒值，否則回傳 null。 */
function toTimestamp(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** FR-019：請求本身是否合法。 */
function isValidInput(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) return false;
  const i = input as Record<string, unknown>;
  return (
    typeof i.orderAmount === 'number' &&
    Number.isInteger(i.orderAmount) &&
    i.orderAmount > 0 &&
    isNonEmptyString(i.tenantId) &&
    toTimestamp(i.now) !== null &&
    Array.isArray(i.coupons)
  );
}

/** FR-020：單張券本身是否合法。 */
function isValidCoupon(coupon: unknown): coupon is Coupon {
  if (typeof coupon !== 'object' || coupon === null || Array.isArray(coupon)) return false;
  const c = coupon as Record<string, unknown>;
  if (typeof c.tenantId !== 'string' || !isNonEmptyString(c.code)) return false;
  if (typeof c.stackable !== 'boolean') return false;

  const value = c.value;
  if (typeof value !== 'number' || !Number.isInteger(value)) return false;
  if (c.type === 'PERCENT') {
    if (value < 1 || value > 100) return false;
  } else if (c.type === 'FIXED') {
    if (value <= 0) return false;
  } else {
    return false;
  }

  const from = toTimestamp(c.validFrom);
  const to = toTimestamp(c.validTo);
  if (from === null || to === null || from > to) return false;

  if (c.minOrderAmount !== undefined) {
    const min = c.minOrderAmount;
    if (typeof min !== 'number' || !Number.isInteger(min) || min < 0) return false;
  }
  return true;
}

/** 單張券的折扣額：PERCENT 以折扣前金額計算並無條件捨去（FR-010、FR-015）；FIXED 為面額。 */
function couponDiscount(coupon: Coupon, orderAmount: number): number {
  return coupon.type === 'PERCENT'
    ? Math.floor((orderAmount * coupon.value) / 100)
    : coupon.value;
}

/**
 * 套用優惠券（純函式）。任一張券不合格即整筆拒絕，
 * 並依 REASONS 的優先序逐類檢查整個請求，回報第一個命中的原因。
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  if (!isValidInput(input)) return fail('INVALID_INPUT');
  const { tenantId, orderAmount, now } = input;
  const rawCoupons: unknown[] = input.coupons;

  if (!rawCoupons.every(isValidCoupon)) return fail('INVALID_COUPON');
  const coupons = rawCoupons as Coupon[];

  if (coupons.some((c) => c.tenantId !== tenantId)) return fail('TENANT_MISMATCH');

  const codes = coupons.map((c) => c.code);
  if (new Set(codes).size !== codes.length) return fail('DUPLICATE_COUPON');

  const nowTs = Date.parse(now);
  const expired = coupons.some(
    (c) => nowTs < Date.parse(c.validFrom) || nowTs > Date.parse(c.validTo),
  );
  if (expired) return fail('COUPON_EXPIRED');

  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) {
    return fail('MIN_ORDER_NOT_MET');
  }

  if (coupons.length > 1 && coupons.some((c) => !c.stackable)) return fail('NOT_STACKABLE');

  const discount = coupons.reduce((sum, c) => sum + couponDiscount(c, orderAmount), 0);
  if (discount > orderAmount) return fail('DISCOUNT_EXCEEDS_AMOUNT');

  return { ok: true, finalAmount: orderAmount - discount, discount, applied: codes };
}
