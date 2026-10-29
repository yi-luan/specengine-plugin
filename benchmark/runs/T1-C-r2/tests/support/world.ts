// 會員點數折抵（POINTS_REDEMPTION）測試 World：每個 Scenario 一個實例，跨步驟狀態只放這裡，不用全域變數。
// Binding Layer 為 direct（見 .claude/spec/architecture-manifest.md 第 5 節），Step 直接呼叫 src/points.ts。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { PointsDiscountInput, PointsDiscountResult } from '../../src/points.js';

export class PointsRedemptionWorld extends World {
  /** 本 Scenario 組裝中的折抵輸入（訂單金額、點數餘額、折抵點數） */
  input: Partial<PointsDiscountInput> = {};
  /** 最近一次呼叫 applyPointsDiscount 的結果 */
  result: PointsDiscountResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PointsRedemptionWorld);
