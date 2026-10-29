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

/** Fixed failure reason codes, listed in evaluation precedence order (FR-018). */
export type Reason =
  | 'INVALID_INPUT'
  | 'INVALID_COUPON'
  | 'TENANT_MISMATCH'
  | 'DUPLICATE_COUPON'
  | 'COUPON_EXPIRED'
  | 'MIN_ORDER_NOT_MET'
  | 'NOT_STACKABLE'
  | 'DISCOUNT_EXCEEDS_AMOUNT';

function fail(reason: Reason): ApplyResult {
  return { ok: false, reason };
}

function isValidCoupon(c: Coupon): boolean {
  if (!Number.isInteger(c.value)) return false;
  if (c.minOrderAmount !== undefined && !Number.isInteger(c.minOrderAmount)) return false;
  if (c.type === 'PERCENT') return c.value >= 1 && c.value <= 100;
  if (c.type === 'FIXED') return c.value > 0;
  return false;
}

function isWithinValidity(c: Coupon, nowMs: number): boolean {
  const from = Date.parse(c.validFrom);
  const to = Date.parse(c.validTo);
  return from <= nowMs && nowMs <= to; // both bounds inclusive; NaN → false
}

/**
 * Apply coupons to an order. Pure function: no I/O, time supplied via `input.now`.
 * Rules are evaluated as stages in the fixed precedence order (FR-018); the first
 * failing stage determines the reason. Application is all-or-nothing (FR-015).
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;

  // 1. INVALID_INPUT (FR-016)
  if (!Number.isInteger(orderAmount) || orderAmount <= 0) return fail('INVALID_INPUT');

  // 2. INVALID_COUPON (FR-017)
  if (coupons.some((c) => !isValidCoupon(c))) return fail('INVALID_COUPON');

  // 3. TENANT_MISMATCH (FR-001)
  if (coupons.some((c) => c.tenantId !== tenantId)) return fail('TENANT_MISMATCH');

  // 4. DUPLICATE_COUPON (FR-012)
  const seen = new Set<string>();
  for (const c of coupons) {
    const key = `${c.tenantId}\u0000${c.code}`;
    if (seen.has(key)) return fail('DUPLICATE_COUPON');
    seen.add(key);
  }

  // 5. COUPON_EXPIRED (FR-004) — also covers not-yet-valid
  const nowMs = Date.parse(now);
  if (coupons.some((c) => !isWithinValidity(c, nowMs))) return fail('COUPON_EXPIRED');

  // 6. MIN_ORDER_NOT_MET (FR-005) — judged on the pre-discount amount, inclusive
  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) {
    return fail('MIN_ORDER_NOT_MET');
  }

  // 7. NOT_STACKABLE (FR-007)
  if (coupons.length > 1 && coupons.some((c) => !c.stackable)) return fail('NOT_STACKABLE');

  // 8. DISCOUNT_EXCEEDS_AMOUNT (FR-008); discount per FR-003 / FR-014
  let discount = 0;
  for (const c of coupons) {
    discount += c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
  }
  if (discount > orderAmount) return fail('DISCOUNT_EXCEEDS_AMOUNT');

  return {
    ok: true,
    finalAmount: orderAmount - discount,
    discount,
    applied: coupons.map((c) => c.code),
  };
}
