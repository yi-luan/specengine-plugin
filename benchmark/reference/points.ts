// T1 參考實作：依標準答案表寫成，用來驗證隱藏測試本身沒有寫錯（18/18 通過）。
// LIMIT_PERCENT 改成 35 即為需求變更（E4）後的參考實作（e4 隱藏測試 12/12 通過）。
export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

export const LIMIT_PERCENT = Number(process.env.LIMIT_PERCENT ?? 30);

export function applyPointsDiscount({ orderAmount, pointsBalance, pointsToUse }: PointsDiscountInput): PointsDiscountResult {
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0) return { ok: false, reason: 'INVALID_INPUT' };
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0) return { ok: false, reason: 'INVALID_POINTS' };
  if (pointsToUse > pointsBalance) return { ok: false, reason: 'INSUFFICIENT_POINTS' };
  if (pointsToUse > Math.floor((orderAmount * LIMIT_PERCENT) / 100)) return { ok: false, reason: 'EXCEEDS_LIMIT' };
  return { ok: true, finalAmount: orderAmount - pointsToUse, remainingPoints: pointsBalance - pointsToUse };
}
