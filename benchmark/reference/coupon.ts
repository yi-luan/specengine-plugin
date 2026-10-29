// T3 參考實作：依標準答案表寫成，用來驗證隱藏測試本身沒有寫錯（38/38 通過）。
export type Coupon = {
  tenantId: string; code: string; type: 'PERCENT' | 'FIXED'; value: number;
  validFrom: string; validTo: string; stackable: boolean; minOrderAmount?: number;
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult = { ok: true; finalAmount: number; discount: number; applied: string[] } | { ok: false; reason: string };

const fail = (reason: string): ApplyResult => ({ ok: false, reason });

export function applyCoupons({ tenantId, orderAmount, coupons, now }: ApplyInput): ApplyResult {
  if (!Number.isInteger(orderAmount) || orderAmount <= 0) return fail('INVALID_INPUT');
  for (const c of coupons) {
    const bad = c.type === 'PERCENT' ? !(Number.isInteger(c.value) && c.value >= 1 && c.value <= 100) : !(Number.isInteger(c.value) && c.value > 0);
    if (bad) return fail('INVALID_COUPON');
  }
  if (coupons.some((c) => c.tenantId !== tenantId)) return fail('TENANT_MISMATCH');
  const seen = new Set<string>();
  for (const c of coupons) { const k = `${c.tenantId}\u0000${c.code}`; if (seen.has(k)) return fail('DUPLICATE_COUPON'); seen.add(k); }
  const t = Date.parse(now);
  if (coupons.some((c) => !(Date.parse(c.validFrom) <= t && t <= Date.parse(c.validTo)))) return fail('COUPON_EXPIRED');
  if (coupons.some((c) => c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount)) return fail('MIN_ORDER_NOT_MET');
  const nonStackable = coupons.filter((c) => !c.stackable).length;
  if (nonStackable > 1 || (nonStackable === 1 && coupons.length > 1)) return fail('NOT_STACKABLE');
  let discount = 0;
  for (const c of coupons) discount += c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
  if (discount > orderAmount) return fail('DISCOUNT_EXCEEDS_AMOUNT');
  return { ok: true, finalAmount: orderAmount - discount, discount, applied: coupons.map((c) => c.code) };
}
