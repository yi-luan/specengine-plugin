// 會員點數折抵：純函式，不碰資料庫。金額與點數皆以整數元／整數點計算。

export type PointsDiscountInput = {
  orderAmount: number;
  pointsBalance: number;
  pointsToUse: number;
};

export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

/** 單筆訂單折抵上限：訂單金額的 30%（以百分比整數表示，避免浮點誤差）。 */
export const MAX_DISCOUNT_PERCENT = 30;

/** 1 點折抵 1 元。 */
export const AMOUNT_PER_POINT = 1;

export const REASONS = {
  INVALID_ORDER_AMOUNT: '訂單金額必須是大於 0 的整數',
  INVALID_POINTS_BALANCE: '點數餘額必須是大於等於 0 的整數',
  POINTS_NOT_INTEGER: '折抵點數必須是整數',
  POINTS_NOT_POSITIVE: '折抵點數必須大於 0',
  INSUFFICIENT_BALANCE: '點數餘額不足',
  EXCEEDS_LIMIT: `折抵金額不得超過訂單金額的 ${MAX_DISCOUNT_PERCENT}%`,
} as const;

/** 依訂單金額計算本筆可折抵的最高點數（無條件捨去）。 */
export function maxPointsForOrder(orderAmount: number): number {
  return Math.floor((orderAmount * MAX_DISCOUNT_PERCENT) / 100 / AMOUNT_PER_POINT);
}

export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  if (!Number.isInteger(orderAmount) || orderAmount <= 0) {
    return { ok: false, reason: REASONS.INVALID_ORDER_AMOUNT };
  }
  if (!Number.isInteger(pointsBalance) || pointsBalance < 0) {
    return { ok: false, reason: REASONS.INVALID_POINTS_BALANCE };
  }
  if (!Number.isInteger(pointsToUse)) {
    return { ok: false, reason: REASONS.POINTS_NOT_INTEGER };
  }
  if (pointsToUse <= 0) {
    return { ok: false, reason: REASONS.POINTS_NOT_POSITIVE };
  }
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: REASONS.INSUFFICIENT_BALANCE };
  }

  const discountAmount = pointsToUse * AMOUNT_PER_POINT;
  // 以整數比較避免浮點誤差：discount * 100 > orderAmount * 30 即超過上限
  if (discountAmount * 100 > orderAmount * MAX_DISCOUNT_PERCENT) {
    return { ok: false, reason: REASONS.EXCEEDS_LIMIT };
  }

  return {
    ok: true,
    finalAmount: orderAmount - discountAmount,
    remainingPoints: pointsBalance - pointsToUse,
  };
}
