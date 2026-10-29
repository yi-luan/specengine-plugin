export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

/**
 * Applies a member's points to an order at 1 point = 1 dollar.
 *
 * Pure function; no I/O. All inputs are whole dollars / whole points.
 * Rules are checked in this fixed order and the first violated one is reported
 * (see specs/001-points-discount/contracts/points-api.md):
 *
 * 1. `INVALID_INPUT`       – orderAmount not an integer or <= 0, or pointsBalance not an integer or < 0
 * 2. `INVALID_POINTS`      – pointsToUse not an integer or < 0 (0 is allowed)
 * 3. `INSUFFICIENT_POINTS` – pointsToUse > pointsBalance (no automatic reduction)
 * 4. `EXCEEDS_LIMIT`       – pointsToUse > floor(orderAmount * 35%) (no automatic trimming;
 *                            cap raised from 30% to 35% by change request E4, 2026-10-20)
 *
 * On success returns `finalAmount = orderAmount - pointsToUse` and
 * `remainingPoints = pointsBalance - pointsToUse`.
 */
export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  // 1. INVALID_INPUT: order must be a positive integer; balance a non-negative integer.
  if (
    !Number.isInteger(orderAmount) ||
    orderAmount <= 0 ||
    !Number.isInteger(pointsBalance) ||
    pointsBalance < 0
  ) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }

  // 2. INVALID_POINTS: points to use must be a non-negative integer.
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
    return { ok: false, reason: 'INVALID_POINTS' };
  }

  // 3. INSUFFICIENT_POINTS: refuse as a whole, never reduce to the available balance.
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: 'INSUFFICIENT_POINTS' };
  }

  // 4. EXCEEDS_LIMIT: at most 35% of the order, rounded down (integer arithmetic, no 0.35 literal).
  const cap = Math.floor((orderAmount * 35) / 100);
  if (pointsToUse > cap) {
    return { ok: false, reason: 'EXCEEDS_LIMIT' };
  }

  return {
    ok: true,
    finalAmount: orderAmount - pointsToUse,
    remainingPoints: pointsBalance - pointsToUse,
  };
}
