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

type Check = (input: ApplyInput) => string | null;

function isValidCoupon(c: Coupon): boolean {
  if (c.type !== 'PERCENT' && c.type !== 'FIXED') return false;
  if (!Number.isInteger(c.value)) return false;
  if (c.type === 'PERCENT' && (c.value < 0 || c.value > 100)) return false;
  if (c.type === 'FIXED' && c.value < 0) return false;
  if (c.minOrderAmount !== undefined && (!Number.isInteger(c.minOrderAmount) || c.minOrderAmount < 0)) {
    return false;
  }
  const from = Date.parse(c.validFrom);
  const to = Date.parse(c.validTo);
  if (Number.isNaN(from) || Number.isNaN(to) || from > to) return false;
  return true;
}

// FR-015：檢查順序固定，回報第一個命中的原因。
const checks: Check[] = [
  (i) =>
    !Number.isInteger(i.orderAmount) || i.orderAmount <= 0 || Number.isNaN(Date.parse(i.now))
      ? 'INVALID_INPUT'
      : null,
  (i) => (i.coupons.every(isValidCoupon) ? null : 'INVALID_COUPON'),
  (i) => (i.coupons.every((c) => c.tenantId === i.tenantId) ? null : 'TENANT_MISMATCH'),
  (i) => {
    const seen = new Set<string>();
    for (const c of i.coupons) {
      const key = `${c.tenantId}\u0000${c.code}`;
      if (seen.has(key)) return 'DUPLICATE_COUPON';
      seen.add(key);
    }
    return null;
  },
  (i) => {
    const now = Date.parse(i.now);
    return i.coupons.every((c) => Date.parse(c.validFrom) <= now && now <= Date.parse(c.validTo))
      ? null
      : 'COUPON_EXPIRED';
  },
  (i) =>
    i.coupons.some((c) => c.minOrderAmount !== undefined && i.orderAmount < c.minOrderAmount)
      ? 'MIN_ORDER_NOT_MET'
      : null,
  (i) => (i.coupons.length > 1 && i.coupons.some((c) => !c.stackable) ? 'NOT_STACKABLE' : null),
];

function computeDiscount(orderAmount: number, coupons: Coupon[]): number {
  let percentTotal = 0;
  let fixedTotal = 0;
  for (const c of coupons) {
    if (c.type === 'PERCENT') {
      // 以折扣前金額計算，每張各自無條件捨去（FR-010）
      percentTotal += Math.floor((orderAmount * c.value) / 100);
    } else {
      fixedTotal += c.value;
    }
  }
  return percentTotal + fixedTotal;
}

export function applyCoupons(input: ApplyInput): ApplyResult {
  for (const check of checks) {
    const reason = check(input);
    if (reason !== null) return { ok: false, reason };
  }
  const discount = computeDiscount(input.orderAmount, input.coupons);
  if (discount > input.orderAmount) return { ok: false, reason: 'DISCOUNT_EXCEEDS_AMOUNT' };
  return {
    ok: true,
    finalAmount: input.orderAmount - discount,
    discount,
    applied: input.coupons.map((c) => c.code),
  };
}
