// 會員點數折抵：純函式，不碰資料庫。金額與點數皆以整數元／整數點計算。

export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

/** 單筆訂單折抵金額上限佔訂單金額的百分比。 */
export const MAX_DISCOUNT_PERCENT = 35;

/** 失敗原因（固定字串，供測試與呼叫端比對）。 */
export const REASONS = {
  INVALID_ORDER_AMOUNT: '訂單金額必須是正整數',
  INVALID_POINTS_BALANCE: '點數餘額必須是非負整數',
  POINTS_NOT_INTEGER: '折抵點數必須是整數',
  POINTS_NOT_POSITIVE: '折抵點數必須大於 0',
  INSUFFICIENT_POINTS: '點數餘額不足',
  EXCEEDS_LIMIT: `折抵金額不得超過訂單金額的 ${MAX_DISCOUNT_PERCENT}%`,
} as const;

function isInteger(n: number): boolean {
  return typeof n === 'number' && Number.isInteger(n);
}

/** 回傳某訂單金額可折抵的最大點數（= 訂單金額 35% 無條件捨去）。 */
export function maxPointsFor(orderAmount: number): number {
  return Math.floor((orderAmount * MAX_DISCOUNT_PERCENT) / 100);
}

export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  if (!isInteger(orderAmount) || orderAmount <= 0) {
    return { ok: false, reason: REASONS.INVALID_ORDER_AMOUNT };
  }
  if (!isInteger(pointsBalance) || pointsBalance < 0) {
    return { ok: false, reason: REASONS.INVALID_POINTS_BALANCE };
  }
  if (!isInteger(pointsToUse)) {
    return { ok: false, reason: REASONS.POINTS_NOT_INTEGER };
  }
  if (pointsToUse <= 0) {
    return { ok: false, reason: REASONS.POINTS_NOT_POSITIVE };
  }
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: REASONS.INSUFFICIENT_POINTS };
  }
  // 1 點折抵 1 元；以整數運算避免浮點誤差：pointsToUse * 100 <= orderAmount * 35
  if (pointsToUse * 100 > orderAmount * MAX_DISCOUNT_PERCENT) {
    return { ok: false, reason: REASONS.EXCEEDS_LIMIT };
  }

  return {
    ok: true,
    finalAmount: orderAmount - pointsToUse,
    remainingPoints: pointsBalance - pointsToUse,
  };
}
