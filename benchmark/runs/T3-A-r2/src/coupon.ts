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

function parseTime(value: string): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * 結帳套用優惠券（純函式）。
 *
 * 規則：
 * - 任一張優惠券不合格（租戶不符、代碼重複、未在有效期間、未達最低消費、
 *   不可疊加卻與其他券同用、折扣後金額低於 0）即整筆失敗並回傳原因。
 * - 百分比折扣以折扣前的訂單金額計算，無條件捨去到整數元。
 * - 折扣總額 = 各券折扣加總；finalAmount = orderAmount - discount。
 * - applied 依傳入順序列出實際套用的優惠券代碼。
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;

  if (!Number.isInteger(orderAmount) || orderAmount < 0) {
    return fail(`INVALID_ORDER_AMOUNT: 訂單金額必須為非負整數，收到 ${String(orderAmount)}`);
  }
  const nowTs = parseTime(now);
  if (nowTs === null) {
    return fail(`INVALID_NOW: 無法解析目前時間 ${String(now)}`);
  }
  if (!Array.isArray(coupons)) {
    return fail('INVALID_COUPONS: coupons 必須為陣列');
  }

  if (coupons.length === 0) {
    return { ok: true, finalAmount: orderAmount, discount: 0, applied: [] };
  }

  // 1. 租戶檢查
  for (const c of coupons) {
    if (c.tenantId !== tenantId) {
      return fail(`TENANT_MISMATCH: 優惠券 ${c.code} 不屬於租戶 ${tenantId}`);
    }
  }

  // 2. 同一租戶內代碼唯一
  const seen = new Set<string>();
  for (const c of coupons) {
    if (seen.has(c.code)) {
      return fail(`DUPLICATE_CODE: 優惠券 ${c.code} 重複傳入`);
    }
    seen.add(c.code);
  }

  // 3. 型別與數值檢查
  for (const c of coupons) {
    if (c.type !== 'PERCENT' && c.type !== 'FIXED') {
      return fail(`INVALID_TYPE: 優惠券 ${c.code} 類型 ${String(c.type)} 不支援`);
    }
    if (!Number.isInteger(c.value) || c.value <= 0) {
      return fail(`INVALID_VALUE: 優惠券 ${c.code} 的折扣值必須為正整數`);
    }
    if (c.type === 'PERCENT' && c.value > 100) {
      return fail(`INVALID_VALUE: 優惠券 ${c.code} 的百分比不得超過 100`);
    }
    if (c.minOrderAmount !== undefined && (!Number.isInteger(c.minOrderAmount) || c.minOrderAmount < 0)) {
      return fail(`INVALID_MIN_ORDER_AMOUNT: 優惠券 ${c.code} 的最低消費必須為非負整數`);
    }
  }

  // 4. 有效期間（起迄皆含）
  for (const c of coupons) {
    const from = parseTime(c.validFrom);
    const to = parseTime(c.validTo);
    if (from === null || to === null) {
      return fail(`INVALID_PERIOD: 優惠券 ${c.code} 的有效期間格式錯誤`);
    }
    if (nowTs < from) {
      return fail(`NOT_YET_VALID: 優惠券 ${c.code} 尚未生效`);
    }
    if (nowTs > to) {
      return fail(`EXPIRED: 優惠券 ${c.code} 已過期`);
    }
  }

  // 5. 最低消費（以折扣前訂單金額比較，達到即可）
  for (const c of coupons) {
    if (c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount) {
      return fail(`MIN_ORDER_NOT_MET: 優惠券 ${c.code} 需最低消費 ${c.minOrderAmount} 元，訂單金額 ${orderAmount} 元`);
    }
  }

  // 6. 疊加規則：不可疊加的券一張訂單只能用一張（不得與任何其他券同用）
  if (coupons.length > 1) {
    const nonStackable = coupons.find((c) => !c.stackable);
    if (nonStackable) {
      return fail(`NOT_STACKABLE: 優惠券 ${nonStackable.code} 不可疊加，不得與其他優惠券同時使用`);
    }
  }

  // 7. 計算折扣（皆以折扣前訂單金額計算）
  let discount = 0;
  for (const c of coupons) {
    if (c.type === 'PERCENT') {
      discount += Math.floor((orderAmount * c.value) / 100);
    } else {
      discount += c.value;
    }
  }

  const finalAmount = orderAmount - discount;
  if (finalAmount < 0) {
    return fail(`BELOW_ZERO: 折扣總額 ${discount} 元超過訂單金額 ${orderAmount} 元，折扣後金額不得低於 0`);
  }

  return {
    ok: true,
    finalAmount,
    discount,
    applied: coupons.map((c) => c.code),
  };
}
