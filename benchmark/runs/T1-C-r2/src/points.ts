// 會員點數折抵（POINTS_REDEMPTION）——技術介面依需求固定，不可更名。
// 純函式，不碰資料庫；金額與點數皆以整數元／整數點計算。
// 行為來源：.specengine/sdd/matrix/POINTS_REDEMPTION.json；規格：.specengine/spec/features/會員點數折抵.feature

export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };

/** 失敗原因固定文案，逐字沿用 .specengine/spec/terms.md「固定文案」MSG-001～MSG-004 */
export const POINTS_DISCOUNT_REASON = {
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_POINTS: 'INVALID_POINTS',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  EXCEEDS_LIMIT: 'EXCEEDS_LIMIT',
} as const;

/** 單筆訂單折抵上限比例：30%（需求第 2 條） */
export const POINTS_DISCOUNT_LIMIT_PERCENT = 30;

/**
 * 計算單筆訂單的折抵上限：訂單金額 × 30% 無條件捨去取整數。
 * 以整數運算（× 30 ÷ 100）避免浮點誤差。
 * 決策見 .specengine/sdd/resolved/data/點數折抵_30趴上限小數取捨.md（POLICY-002）
 */
export function pointsDiscountLimit(orderAmount: number): number {
  return Math.floor((orderAmount * POINTS_DISCOUNT_LIMIT_PERCENT) / 100);
}

/**
 * 會員結帳時以點數折抵現金，1 點折抵 1 元。
 * 檢查順序固定：INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT，回報第一個命中的失敗原因。
 * 決策見 .specengine/sdd/resolved/features/點數折抵_多重錯誤同時發生的回報順序.md
 */
export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult {
  const { orderAmount, pointsBalance, pointsToUse } = input;

  // R-POINTS_REDEMPTION-004：訂單金額為 0、負數或非整數，或點數餘額為負數或非整數 → INVALID_INPUT
  // 決策見 .specengine/sdd/resolved/features/點數折抵_訂單金額或餘額非法值的處理.md、點數折抵_訂單金額或餘額非整數的處理.md
  if (!Number.isInteger(orderAmount) || orderAmount <= 0 || !Number.isInteger(pointsBalance) || pointsBalance < 0) {
    return { ok: false, reason: POINTS_DISCOUNT_REASON.INVALID_INPUT };
  }

  // R-POINTS_REDEMPTION-001：折抵點數非整數或負數 → INVALID_POINTS（需求第 1 條：折抵點數必須是整數）
  // 決策見 .specengine/sdd/resolved/features/點數折抵_負數或非整數點數的處理與文案.md
  if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
    return { ok: false, reason: POINTS_DISCOUNT_REASON.INVALID_POINTS };
  }

  // R-POINTS_REDEMPTION-003：折抵點數超過點數餘額 → INSUFFICIENT_POINTS，整筆拒絕不自動折到餘額用完
  // 決策見 .specengine/sdd/resolved/features/點數折抵_點數不足時的系統反應.md
  if (pointsToUse > pointsBalance) {
    return { ok: false, reason: POINTS_DISCOUNT_REASON.INSUFFICIENT_POINTS };
  }

  // R-POINTS_REDEMPTION-002：折抵金額超過折抵上限 → EXCEEDS_LIMIT，整筆拒絕不截斷；等於上限可通過
  // 決策見 .specengine/sdd/resolved/features/點數折抵_超過30趴上限時的系統反應與文案.md（POLICY-001）
  if (pointsToUse > pointsDiscountLimit(orderAmount)) {
    return { ok: false, reason: POINTS_DISCOUNT_REASON.EXCEEDS_LIMIT };
  }

  // R-POINTS_REDEMPTION-000：折抵成功（含折抵 0 點，等同沒折抵）
  // 決策見 .specengine/sdd/resolved/features/點數折抵_折抵0點的處理.md
  return { ok: true, finalAmount: orderAmount - pointsToUse, remainingPoints: pointsBalance - pointsToUse };
}
