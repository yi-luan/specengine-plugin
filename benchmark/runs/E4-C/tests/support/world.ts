// tests/support/world.ts
// 模組 POINTS_REDEMPTION（會員點數折抵）的 Cucumber World：跨步驟狀態一律放這裡，嚴禁全域變數。
// Binding Layer 為 direct（manifest 第 5 節），無 Driver 層；本檔屬 support，不在 spec-guard 凍結範圍。
import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { PointsDiscountResult } from '../../src/points.js';

export class PointsRedemptionWorld extends World {
  /** 會員點數餘額（Given 寫入） */
  pointsBalance?: number;
  /** 訂單金額（Given 寫入） */
  orderAmount?: number;
  /** 最近一次折抵的回傳結果（When 寫入，Then 斷言） */
  result?: PointsDiscountResult;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PointsRedemptionWorld);
