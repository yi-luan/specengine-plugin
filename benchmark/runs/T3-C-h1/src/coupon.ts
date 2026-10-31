// 多租戶優惠券純函式。決策依據：.specengine/sdd/resolved/features 與 data 下的 MCQ 決策紀錄，
// 規則對照：.specengine/sdd/matrix/COUPON.json（R-COUPON-000 ～ 019）。

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

// 多項檢查同時命中時，依此固定順序回報第一個（R-COUPON-017）。
const CHECK_ORDER = [
  'INVALID_INPUT',
  'INVALID_COUPON',
  'TENANT_MISMATCH',
  'DUPLICATE_COUPON',
  'COUPON_EXPIRED',
  'MIN_ORDER_NOT_MET',
  'NOT_STACKABLE',
  'DISCOUNT_EXCEEDS_AMOUNT',
] as const;

type Reason = (typeof CHECK_ORDER)[number];

// 嚴格 ISO 8601 時間格式（R-COUPON-015：格式不合法即 INVALID_COUPON）。
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function parseIso(s: string): number | null {
  if (!ISO_8601_RE.test(s)) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

// R-COUPON-014：PERCENT 為 1～100 的整數；FIXED 為大於 0 的整數。
function isValidValue(c: Coupon): boolean {
  if (!Number.isInteger(c.value)) return false;
  if (c.type === 'PERCENT') return c.value >= 1 && c.value <= 100;
  if (c.type === 'FIXED') return c.value > 0;
  return false;
}

export function applyCoupons(input: ApplyInput): ApplyResult {
  const { tenantId, orderAmount, coupons, now } = input;
  const failed = new Set<Reason>();

  // R-COUPON-013：訂單金額為 0、負數或非整數，不論有無券，皆 INVALID_INPUT。
  const nowMs = parseIso(now);
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || nowMs === null) {
    failed.add('INVALID_INPUT');
  }

  // R-COUPON-008：沒有傳入任何券且輸入合法時成功。
  if (coupons.length === 0) {
    if (failed.size > 0) return fail(failed);
    return { ok: true, finalAmount: orderAmount, discount: 0, applied: [] };
  }

  for (const c of coupons) {
    if (!isValidValue(c)) failed.add('INVALID_COUPON');

    const fromMs = parseIso(c.validFrom);
    const toMs = parseIso(c.validTo);
    if (fromMs === null || toMs === null || toMs < fromMs) {
      failed.add('INVALID_COUPON');           // R-COUPON-015
    } else if (nowMs !== null && (nowMs < fromMs || nowMs > toMs)) {
      failed.add('COUPON_EXPIRED');           // R-COUPON-002（期間含起迄，R-COUPON-000 前提）
    }

    if (c.tenantId !== tenantId) failed.add('TENANT_MISMATCH'); // R-COUPON-007

    if (c.minOrderAmount !== undefined && orderAmount < c.minOrderAmount) {
      failed.add('MIN_ORDER_NOT_MET');        // R-COUPON-003、R-COUPON-018（等於可用）
    }
  }

  const codes = coupons.map((c) => c.code);
  if (new Set(codes).size !== codes.length) failed.add('DUPLICATE_COUPON'); // R-COUPON-016

  // R-COUPON-009/011/012：不可疊加券只能單獨使用。
  const nonStackable = coupons.filter((c) => !c.stackable).length;
  if (nonStackable >= 2 || (nonStackable === 1 && coupons.length > 1)) {
    failed.add('NOT_STACKABLE');
  }

  // 其餘檢查全部通過後才計算折扣，避免在無效輸入上計算。
  if (failed.size === 0) {
    // R-COUPON-000/004：百分比以折扣前金額計算，每張各自無條件捨去。
    // R-COUPON-001：固定金額直接折抵面額。
    const discount = coupons.reduce(
      (sum, c) => sum + (c.type === 'PERCENT' ? Math.floor((orderAmount * c.value) / 100) : c.value),
      0,
    );
    // R-COUPON-010／009：折扣總額超過訂單金額整筆拒絕；剛好等於可以。
    if (discount > orderAmount) failed.add('DISCOUNT_EXCEEDS_AMOUNT');
    else return { ok: true, finalAmount: orderAmount - discount, discount, applied: codes };
  }

  return fail(failed);
}

function fail(failed: Set<Reason>): ApplyResult {
  const reason = CHECK_ORDER.find((r) => failed.has(r)) as Reason;
  return { ok: false, reason };
}
