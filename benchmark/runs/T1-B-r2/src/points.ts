export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  // 檢查順序固定：INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT，回報第一個命中的。
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0) {
    return { ok: false, reason: "INVALID_INPUT" };
  }
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
    return { ok: false, reason: "INVALID_POINTS" };
  }
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: "INSUFFICIENT_POINTS" };
  }

  // 單筆訂單折抵上限 = 訂單金額的 30%，無條件捨去取整數；以整數運算避免浮點誤差。
  const discountLimit = Math.floor((orderAmount * 3) / 10);
  if (pointsToUse > discountLimit) {
    return { ok: false, reason: "EXCEEDS_LIMIT" };
  }

  return {
    ok: true,
    finalAmount: orderAmount - pointsToUse,
    remainingPoints: pointsBalance - pointsToUse,
  };
}
