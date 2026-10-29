// 多租戶優惠券（MULTI_TENANT_COUPON）：結帳時套用優惠券的純函式，不碰資料庫。
// 規格來源：.specengine/sdd/matrix/MULTI_TENANT_COUPON.json、.specengine/spec/features/多租戶優惠券.feature

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

/** 單張券的折扣額。PERCENT 一律以折扣前訂單金額計算並各自無條件捨去（R-005） */
// 決策見 .specengine/sdd/resolved/features/多租戶優惠券_百分比折扣小數如何取捨.md
function couponDiscount(coupon: Coupon, orderAmount: number): number {
  if (coupon.type === 'PERCENT') return Math.floor((orderAmount * coupon.value) / 100);
  return coupon.value;
}

/** ISO 8601 字串轉時間戳；無法解析回傳 undefined */
function parseTime(text: unknown): number | undefined {
  if (typeof text !== 'string') return undefined;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? undefined : ms;
}

/** 券本身是否合法（R-012） */
// 決策見 .specengine/sdd/resolved/data/多租戶優惠券_折扣值不合法.md、
// resolved/data/多租戶優惠券_時間字串非合法ISO8601.md、resolved/data/多租戶優惠券_最低消費金額本身不合法.md、
// resolved/data/多租戶優惠券_有效期間起迄顛倒.md
function isValidCoupon(coupon: Coupon): boolean {
  const { type, value, minOrderAmount } = coupon;
  if (!Number.isInteger(value)) return false;
  if (type === 'PERCENT') {
    if (value < 1 || value > 100) return false;
  } else if (type === 'FIXED') {
    if (value <= 0) return false;
  } else {
    return false;
  }
  const from = parseTime(coupon.validFrom);
  const to = parseTime(coupon.validTo);
  if (from === undefined || to === undefined || from > to) return false;
  if (minOrderAmount !== undefined && (!Number.isInteger(minOrderAmount) || minOrderAmount < 0)) return false;
  return true;
}

function fail(reason: string): ApplyResult {
  return { ok: false, reason };
}

/**
 * 結帳套用優惠券。失敗時依固定順序只回報第一個命中的原因（R-013）：
 * INVALID_INPUT → INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED
 * → MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT
 */
// 決策見 .specengine/sdd/resolved/features/多租戶優惠券_多個錯誤同時發生的檢查順序.md
export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons } = input;

  // 1. 訂單金額須為正整數、結帳時間須可解析（R-011）
  const now = parseTime(input.now);
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || now === undefined) return fail('INVALID_INPUT');

  // 2. 券本身合法（R-012）
  if (!coupons.every(isValidCoupon)) return fail('INVALID_COUPON');

  // 3. 只能用在同一租戶的訂單，不略過單張（R-001）
  if (coupons.some((c) => c.tenantId !== tenantId)) return fail('TENANT_MISMATCH');

  // 4. 同一張券（同租戶 + 同代碼）不得重複傳入（R-010）
  const seen = new Set<string>();
  for (const c of coupons) {
    const key = JSON.stringify([c.tenantId, c.code]);
    if (seen.has(key)) return fail('DUPLICATE_COUPON');
    seen.add(key);
  }

  // 5. 有效期間含頭含尾：validFrom ≤ now ≤ validTo（R-002）
  // 決策見 .specengine/sdd/resolved/features/多租戶優惠券_有效期間邊界是否含頭含尾.md
  if (coupons.some((c) => now < parseTime(c.validFrom)! || now > parseTime(c.validTo)!)) return fail('COUPON_EXPIRED');

  // 6. 最低消費以折扣前訂單金額判定，剛好等於可以（R-007）
  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) {
    return fail('MIN_ORDER_NOT_MET');
  }

  // 7. 不可疊加券只能單獨使用一張（R-003、R-008）
  const nonStackable = coupons.filter((c) => !c.stackable).length;
  if (nonStackable >= 2 || (nonStackable === 1 && coupons.length > 1)) return fail('NOT_STACKABLE');

  // 折扣總額 = 各張券折扣額加總（R-000、R-004）
  const discount = coupons.reduce((sum, c) => sum + couponDiscount(c, orderAmount), 0);

  // 8. 超過訂單金額整筆拒絕，不截斷；剛好等於可以（R-006）
  // 決策見 .specengine/sdd/resolved/features/多租戶優惠券_折扣總額超過訂單金額時的反應.md
  if (discount > orderAmount) return fail('DISCOUNT_EXCEEDS_AMOUNT');

  return {
    ok: true,
    finalAmount: orderAmount - discount,
    discount,
    applied: coupons.map((c) => c.code), // 依傳入順序
  };
}
