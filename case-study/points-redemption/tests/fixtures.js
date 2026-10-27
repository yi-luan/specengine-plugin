'use strict';
/**
 * fixture 接線：依環境變數 BINDING 選擇 Driver 實作並注入 cucumber World。
 * 跨步驟狀態一律放在 Driver 實例（this.pointsRedemption）裡，嚴禁全域變數。
 * manifest 未宣告 UI／API 層，目前只有 inprocess 實作；BINDING 為其他值時 Fail Loud。
 */
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { PointsRedemptionInProcess } = require('./drivers/points-redemption.inprocess');

function createPointsRedemptionDriver() {
  const binding = process.env.BINDING || 'inprocess';
  if (binding === 'inprocess') return new PointsRedemptionInProcess();
  throw new Error(`未知的 BINDING=${binding}；本專案目前僅有 inprocess Driver 實作（manifest 未宣告 UI／API 層）`);
}

class SpecWorld extends World {
  constructor(options) {
    super(options);
    /** 點數折抵 Driver（模組 POINTS_REDEMPTION） */
    this.pointsRedemption = createPointsRedemptionDriver();
  }
}

setWorldConstructor(SpecWorld);

module.exports = { SpecWorld, createPointsRedemptionDriver };
