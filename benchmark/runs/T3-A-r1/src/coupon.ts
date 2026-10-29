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

/**
 * 失敗原因代碼（reason 字串一律以「代碼: 說明」格式回傳，代碼固定可供程式判斷）。
 */
export const ReasonCode = {
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_COUPON: 'INVALID_COUPON',
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  NOT_YET_VALID: 'NOT_YET_VALID',
  EXPIRED: 'EXPIRED',
  MIN_ORDER_NOT_MET: 'MIN_ORDER_NOT_MET',
  NOT_STACKABLE: 'NOT_STACKABLE',
} as const;

export type ReasonCode = (typeof ReasonCode)[keyof typeof ReasonCode];

function fail(code: ReasonCode, detail: string): ApplyResult {
  return { ok: false, reason: `${code}: ${detail}` };
}

function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

function parseIso(s: string): number | null {
  if (typeof s !== 'string' || s.trim() === '') return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/**
 * 結帳套用優惠券（純函式）。
 *
 * 語意：全有或全無——傳入的每一張優惠券都必須可套用，否則整筆回傳失敗與第一個失敗原因（依傳入順序）。
 * 檢查順序：輸入合法性 → 代碼重複 → 逐張（租戶、有效期間、最低消費）→ 疊加規則 → 計算金額。
 */
export function applyCoupons(input: ApplyInput): ApplyResult {
  if (!input || typeof input !== 'object') {
    return fail(ReasonCode.INVALID_INPUT, 'input 必須是物件');
  }
  const { tenantId, orderAmount, coupons, now } = input;

  if (typeof tenantId !== 'string' || tenantId === '') {
    return fail(ReasonCode.INVALID_INPUT, 'tenantId 必須是非空字串');
  }
  if (!isNonNegativeInteger(orderAmount)) {
    return fail(ReasonCode.INVALID_INPUT, 'orderAmount 必須是非負整數');
  }
  if (!Array.isArray(coupons)) {
    return fail(ReasonCode.INVALID_INPUT, 'coupons 必須是陣列');
  }
  const nowMs = parseIso(now);
  if (nowMs === null) {
    return fail(ReasonCode.INVALID_INPUT, 'now 必須是合法的 ISO 8601 時間');
  }

  // 代碼重複（同一租戶內代碼唯一，同一張券不得重複使用）
  const seen = new Set<string>();
  for (const c of coupons) {
    if (!c || typeof c !== 'object' || typeof c.code !== 'string' || c.code === '') {
      return fail(ReasonCode.INVALID_COUPON, '優惠券 code 必須是非空字串');
    }
    if (seen.has(c.code)) {
      return fail(ReasonCode.DUPLICATE_CODE, `優惠券 ${c.code} 重複傳入`);
    }
    seen.add(c.code);
  }

  // 逐張檢查：欄位合法性、租戶、有效期間、最低消費
  for (const c of coupons) {
    if (c.type !== 'PERCENT' && c.type !== 'FIXED') {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的 type 不合法`);
    }
    if (!isNonNegativeInteger(c.value)) {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的 value 必須是非負整數`);
    }
    if (c.type === 'PERCENT' && c.value > 100) {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的百分比不得超過 100`);
    }
    if (typeof c.stackable !== 'boolean') {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的 stackable 必須是布林值`);
    }
    if (c.minOrderAmount !== undefined && !isNonNegativeInteger(c.minOrderAmount)) {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的 minOrderAmount 必須是非負整數`);
    }
    const from = parseIso(c.validFrom);
    const to = parseIso(c.validTo);
    if (from === null || to === null) {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的有效期間格式不合法`);
    }
    if (from > to) {
      return fail(ReasonCode.INVALID_COUPON, `優惠券 ${c.code} 的 validFrom 晚於 validTo`);
    }

    if (c.tenantId !== tenantId) {
      return fail(ReasonCode.TENANT_MISMATCH, `優惠券 ${c.code} 不屬於租戶 ${tenantId}`);
    }
    if (nowMs < from) {
      return fail(ReasonCode.NOT_YET_VALID, `優惠券 ${c.code} 尚未生效`);
    }
    if (nowMs > to) {
      return fail(ReasonCode.EXPIRED, `優惠券 ${c.code} 已過期`);
    }
    if (c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount) {
      return fail(
        ReasonCode.MIN_ORDER_NOT_MET,
        `優惠券 ${c.code} 需最低消費 ${c.minOrderAmount} 元，訂單金額 ${orderAmount} 元未達`,
      );
    }
  }

  // 疊加規則：不可疊加的優惠券必須是該訂單唯一的一張
  if (coupons.length > 1) {
    const nonStackable = coupons.find((c) => !c.stackable);
    if (nonStackable) {
      return fail(ReasonCode.NOT_STACKABLE, `優惠券 ${nonStackable.code} 不可與其他優惠券同時使用`);
    }
  }

  // 計算：百分比一律以折扣前訂單金額計算（無條件捨去），固定金額依序扣減，總折扣不得超過訂單金額
  let discount = 0;
  for (const c of coupons) {
    const remaining = orderAmount - discount;
    const raw = c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value;
    discount += Math.min(raw, remaining);
  }

  return {
    ok: true,
    finalAmount: orderAmount - discount,
    discount,
    applied: coupons.map((c) => c.code),
  };
}
