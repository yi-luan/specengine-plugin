// src/points.ts — 模組 POINTS_REDEMPTION（會員點數折抵）
// 純函式，不碰資料庫（exclusions X-POINTS_REDEMPTION-001）。介面依需求固定，不可更名。
// 規格單一來源：.specengine/sdd/matrix/POINTS_REDEMPTION.json；固定文案：.specengine/spec/terms.md MSG-001～004。

export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

/**
 * 折抵上限：訂單金額 × 30% 無條件捨去取整。以整數運算（×30 ÷100）避免浮點誤差。
 * 決策見 .specengine/sdd/resolved/features/點數折抵_30%上限的小數取整方式.md
 */
function discountLimit(orderAmount: number): number {
  return Math.floor((orderAmount * 30) / 100);
}

export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  // 檢查順序固定：INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT，回報第一個命中的。
  // 決策見 .specengine/sdd/resolved/features/點數折抵_多個錯誤同時發生時回報哪一個.md（R-POINTS_REDEMPTION-008）

  // R-POINTS_REDEMPTION-007：訂單金額須為 > 0 的整數；點數餘額須為 >= 0 的整數（NaN／Infinity 等非有限數一併拒絕）。
  // 決策見 .specengine/sdd/resolved/features/點數折抵_訂單金額或餘額非法時.md、點數折抵_訂單金額或餘額非整數時.md
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0) {
    return { ok: false, reason: 'INVALID_INPUT' };
  }

  // R-POINTS_REDEMPTION-002／005：折抵點數必須是整數（需求第 1 條）且不得為負數。
  // 決策見 .specengine/sdd/resolved/features/點數折抵_折抵點數為負數時.md、resolved/data/點數折抵_非整數點數被拒絕時的失敗原因文案.md
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
    return { ok: false, reason: 'INVALID_POINTS' };
  }

  // R-POINTS_REDEMPTION-003：折抵點數超過餘額整筆拒絕，不自動折到餘額用完。
  // 決策見 .specengine/sdd/resolved/features/點數折抵_點數不足時的系統反應.md
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: 'INSUFFICIENT_POINTS' };
  }

  // R-POINTS_REDEMPTION-004／001：超過上限整筆拒絕，不自動截斷；剛好等於上限允許（需求「不得超過」）。
  // 決策見 .specengine/sdd/resolved/features/點數折抵_超過30%上限時的系統反應.md
  if (pointsToUse > discountLimit(orderAmount)) {
    return { ok: false, reason: 'EXCEEDS_LIMIT' };
  }

  // R-POINTS_REDEMPTION-000／006：成功，1 點折抵 1 元；折 0 點時金額不變、點數不扣。
  return { ok: true, finalAmount: orderAmount - pointsToUse, remainingPoints: pointsBalance - pointsToUse };
}
