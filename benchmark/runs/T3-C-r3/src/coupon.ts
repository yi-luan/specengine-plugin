// 模組 TENANT_COUPON（多租戶優惠券）：純函式，不碰資料庫（X-TENANT_COUPON-001）。
// 規格來源：.specengine/sdd/matrix/TENANT_COUPON.json、.specengine/spec/features/多租戶優惠券.feature

export type Coupon = {
  tenantId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number; // PERCENT: 折扣百分比；FIXED: 折扣金額（元）
  validFrom: string; // ISO 8601，例如 '2026-01-01T00:00:00Z'
  validTo: string; // ISO 8601
  stackable: boolean;
  minOrderAmount?: number; // 最低消費（元），未設定表示無限制
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };

/** 失敗原因固定文案（terms.md MSG-001～008） */
export const FailureReason = {
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_COUPON: 'INVALID_COUPON',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  DUPLICATE_COUPON: 'DUPLICATE_COUPON',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  MIN_ORDER_NOT_MET: 'MIN_ORDER_NOT_MET',
  NOT_STACKABLE: 'NOT_STACKABLE',
  DISCOUNT_EXCEEDS_AMOUNT: 'DISCOUNT_EXCEEDS_AMOUNT',
} as const;

const fail = (reason: string): ApplyResult => ({ ok: false, reason });

// R-012：訂單金額必須為大於 0 的整數。
// 決策見 .specengine/sdd/resolved/data/多租戶優惠券_訂單金額不合理.md
function isValidOrderAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

// R-011：優惠券資料合法性。
// 決策見 .specengine/sdd/resolved/data/多租戶優惠券_優惠券資料不合理.md
// （最低消費非整數、起點晚於迄點為需求方授權的執行者裁量；起點等於迄點合法；最低消費 0／負數不視為不合法）
function isValidCoupon(c: Coupon): boolean {
  if (!Number.isInteger(c.value)) return false;
  if (c.type === 'PERCENT' && (c.value < 1 || c.value > 100)) return false;
  if (c.type === 'FIXED' && c.value < 1) return false;
  if (c.minOrderAmount !== undefined && !Number.isInteger(c.minOrderAmount)) return false;
  if (Date.parse(c.validFrom) > Date.parse(c.validTo)) return false;
  return true;
}

// R-004：以時間戳比較，含頭含尾（POLICY-002）。
// 決策見 .specengine/sdd/resolved/features/多租戶優惠券_有效期間邊界.md
function isWithinPeriod(c: Coupon, nowMs: number): boolean {
  return Date.parse(c.validFrom) <= nowMs && nowMs <= Date.parse(c.validTo);
}

// R-001／R-002：單張折扣金額。百分比以折扣前訂單金額計算並逐張無條件捨去（POLICY-001）。
// 決策見 .specengine/sdd/resolved/features/多租戶優惠券_百分比折扣取整方式.md
function couponDiscount(c: Coupon, orderAmount: number): number {
  return c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
}

/**
 * 套用優惠券。任一檢查不通過即整筆失敗，一張都不套用。
 * 檢查順序（R-013，類別優先、每類掃過全部券，回報第一個命中的）：
 * INVALID_INPUT → INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED
 * → MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT
 * 決策見 .specengine/sdd/resolved/features/多租戶優惠券_多重問題時回報哪個原因.md
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;

  if (!isValidOrderAmount(orderAmount)) return fail(FailureReason.INVALID_INPUT);
  if (!coupons.every(isValidCoupon)) return fail(FailureReason.INVALID_COUPON);
  if (coupons.some((c) => c.tenantId !== tenantId)) return fail(FailureReason.TENANT_MISMATCH);
  if (new Set(coupons.map((c) => c.code)).size !== coupons.length) return fail(FailureReason.DUPLICATE_COUPON);

  const nowMs = Date.parse(now);
  if (!coupons.every((c) => isWithinPeriod(c, nowMs))) return fail(FailureReason.COUPON_EXPIRED);

  // R-005：一律以折扣前訂單金額判定，等於可用。
  // 決策見 .specengine/sdd/resolved/features/多租戶優惠券_最低消費的比較基準.md
  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) {
    return fail(FailureReason.MIN_ORDER_NOT_MET);
  }

  // R-007：不可疊加券只能單獨使用。
  // 決策見 .specengine/sdd/resolved/features/多租戶優惠券_不可疊加券與其他券同時使用.md
  if (coupons.length >= 2 && coupons.some((c) => !c.stackable)) return fail(FailureReason.NOT_STACKABLE);

  const discount = coupons.reduce((sum, c) => sum + couponDiscount(c, orderAmount), 0);

  // R-008：超過訂單金額整筆拒絕，剛好等於可以。
  // 決策見 .specengine/sdd/resolved/features/多租戶優惠券_折扣超過訂單金額時的反應.md
  if (discount > orderAmount) return fail(FailureReason.DISCOUNT_EXCEEDS_AMOUNT);

  return { ok: true, finalAmount: orderAmount - discount, discount, applied: coupons.map((c) => c.code) };
}
