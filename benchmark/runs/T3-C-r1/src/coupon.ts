// 多租戶優惠券（MULTI_TENANT_COUPON）
// 規格：.specengine/spec/features/多租戶優惠券.feature；行為矩陣：.specengine/sdd/matrix/MULTI_TENANT_COUPON.json
// 純函式，不碰資料庫（X-MULTI_TENANT_COUPON-001）。

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

/** 失敗原因固定代碼（terms.md 固定文案 MSG-001～MSG-008；格式決策見 resolved/features/多租戶優惠券_Q15_失敗原因的格式.md） */
export const REASONS = {
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

/** 解析 ISO 8601 時間戳；不合法回傳 null */
function parseTime(value: string): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/** 訂單金額必須為正整數（決策見 .specengine/sdd/resolved/data/多租戶優惠券_Q12_訂單金額的合法範圍.md） */
function isValidOrderAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/**
 * 券設定是否合法：
 * - PERCENT 1～100 整數、FIXED > 0 整數（決策見 .specengine/sdd/resolved/data/多租戶優惠券_Q13_優惠券值的合法範圍.md）
 * - validFrom／validTo 為合法時間且未顛倒（決策見 .specengine/sdd/resolved/data/多租戶優惠券_Q16_時間欄位格式不合法.md）
 * - minOrderAmount 若有設定須為 ≥ 0 的整數（決策見 .specengine/sdd/resolved/data/多租戶優惠券_Q17_最低消費金額設定不合法.md）
 */
function isValidCoupon(c: Coupon): boolean {
  if (!Number.isInteger(c.value)) return false;
  if (c.type === 'PERCENT') {
    if (c.value < 1 || c.value > 100) return false;
  } else if (c.type === 'FIXED') {
    if (c.value <= 0) return false;
  } else {
    return false;
  }
  const from = parseTime(c.validFrom);
  const to = parseTime(c.validTo);
  if (from === null || to === null || from > to) return false;
  if (c.minOrderAmount !== undefined && (!Number.isInteger(c.minOrderAmount) || c.minOrderAmount < 0)) return false;
  return true;
}

/** 有效期間含頭含尾（決策見 .specengine/sdd/resolved/features/多租戶優惠券_Q03_有效期間邊界.md） */
function isWithinPeriod(c: Coupon, now: number): boolean {
  return (parseTime(c.validFrom) as number) <= now && now <= (parseTime(c.validTo) as number);
}

/** 單張券的折扣額：PERCENT 以折扣前訂單金額計算並各自無條件捨去（決策見 resolved/features/多租戶優惠券_Q07_百分比折扣的小數取捨.md） */
function couponDiscount(c: Coupon, orderAmount: number): number {
  return c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
}

/**
 * 套用優惠券。多個錯誤同時發生時依固定順序回報第一個命中的
 * （決策見 .specengine/sdd/resolved/features/多租戶優惠券_Q14_多個錯誤同時發生的回報順序.md）：
 * INVALID_INPUT → INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED
 * → MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;

  // R-015
  const nowTs = parseTime(now);
  if (!isValidOrderAmount(orderAmount) || nowTs === null) return fail(REASONS.INVALID_INPUT);

  // R-016：沒傳任何券 → 成功、不折扣
  if (coupons.length === 0) return { ok: true, finalAmount: orderAmount, discount: 0, applied: [] };

  // R-017
  if (!coupons.every(isValidCoupon)) return fail(REASONS.INVALID_COUPON);

  // R-002（整筆拒絕，決策見 resolved/features/多租戶優惠券_Q01_租戶不符的處理.md）
  if (coupons.some((c) => c.tenantId !== tenantId)) return fail(REASONS.TENANT_MISMATCH);

  // R-012（同 tenantId + code 視為同一張券）
  const seen = new Set<string>();
  for (const c of coupons) {
    const key = `${c.tenantId}\u0000${c.code}`;
    if (seen.has(key)) return fail(REASONS.DUPLICATE_COUPON);
    seen.add(key);
  }

  // R-003、R-010
  if (!coupons.every((c) => isWithinPeriod(c, nowTs))) return fail(REASONS.COUPON_EXPIRED);

  // R-007、R-008：以折扣前訂單金額判定，等於算達標
  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) {
    return fail(REASONS.MIN_ORDER_NOT_MET);
  }

  // R-004、R-009、R-011：不可疊加的券只能單獨使用
  if (coupons.length > 1 && coupons.some((c) => !c.stackable)) return fail(REASONS.NOT_STACKABLE);

  // R-000、R-001、R-005、R-013：PERCENT 各自以原始金額計算後加總，再加上所有 FIXED
  const discount = coupons.reduce((sum, c) => sum + couponDiscount(c, orderAmount), 0);

  // R-006、R-014：超過整筆拒絕，剛好等於可以
  if (discount > orderAmount) return fail(REASONS.DISCOUNT_EXCEEDS_AMOUNT);

  return { ok: true, finalAmount: orderAmount - discount, discount, applied: coupons.map((c) => c.code) };
}
