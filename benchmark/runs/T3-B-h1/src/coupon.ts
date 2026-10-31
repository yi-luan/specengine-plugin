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

function fail(reason: string): ApplyResult {
  return { ok: false, reason };
}

function parseTime(label: string, value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new TypeError(`${label} 不是有效的 ISO 8601 時間: ${value}`);
  }
  return ms;
}

// 券本身的值是否合法（PERCENT 為 1–100 的整數；FIXED 為正整數元）。
function hasValidValue(coupon: Coupon): boolean {
  if (!Number.isInteger(coupon.value)) return false;
  if (coupon.type === 'PERCENT') return coupon.value >= 1 && coupon.value <= 100;
  if (coupon.type === 'FIXED') return coupon.value > 0;
  return false;
}

// 百分比折扣一律以折扣前金額計算，向下取整為整數元（research.md 第 1 節）。
function discountOf(coupon: Coupon, orderAmount: number): number {
  return coupon.type === 'PERCENT'
    ? Math.floor((orderAmount * coupon.value) / 100)
    : coupon.value;
}

export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;

  if (!Number.isInteger(orderAmount) || orderAmount < 0) {
    throw new RangeError(`orderAmount 必須為非負整數: ${orderAmount}`);
  }
  const nowMs = parseTime('now', now);

  if (coupons.length === 0) {
    return { ok: true, finalAmount: orderAmount, discount: 0, applied: [] };
  }

  // 整批檢查：先重複、後不可疊加（research.md 第 2 節）。
  const seen = new Set<string>();
  for (const coupon of coupons) {
    const key = `${coupon.tenantId}\u0000${coupon.code}`;
    if (seen.has(key)) return fail('DUPLICATE_COUPON');
    seen.add(key);
  }
  if (coupons.length > 1 && coupons.some((coupon) => !coupon.stackable)) {
    return fail('NOT_STACKABLE');
  }

  // 個別檢查：依傳入順序，回傳第一張失敗券的原因。
  let total = 0;
  const applied: string[] = [];
  for (const coupon of coupons) {
    if (!hasValidValue(coupon)) return fail('INVALID_COUPON');
    if (coupon.tenantId !== tenantId) return fail('TENANT_MISMATCH');

    const fromMs = parseTime('validFrom', coupon.validFrom);
    const toMs = parseTime('validTo', coupon.validTo);
    if (nowMs < fromMs || nowMs > toMs) return fail('COUPON_EXPIRED');

    if (coupon.minOrderAmount !== undefined && orderAmount < coupon.minOrderAmount) {
      return fail('MIN_ORDER_NOT_MET');
    }

    total += discountOf(coupon, orderAmount);
    applied.push(coupon.code);
  }

  // 折扣總額不超過訂單金額，確保折扣後金額不為負（FR-006）。
  const discount = Math.min(total, orderAmount);
  return { ok: true, finalAmount: orderAmount - discount, discount, applied };
}
