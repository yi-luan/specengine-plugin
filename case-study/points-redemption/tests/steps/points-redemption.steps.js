'use strict';
/**
 * 點數折抵 Step Definitions（模組 POINTS_REDEMPTION）。
 * 句型字串與 .specengine/spec/features/點數折抵.feature 一致，spec-05 期間由 spec-guard 凍結句型。
 * Step 只做：參數型別轉換 → 呼叫 Driver 介面 → 斷言。技術細節全部在 Driver 實作。
 * 斷言：manifest「Assertion Library」未填，使用 Node.js 內建 node:assert/strict，不引入套件。
 */
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
require('../fixtures');

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
// @schema members.points_balance: int
// @binds PointsRedemptionDriver.setMemberBalance
Given('會員點數餘額為 {string}', async function (balance) {
  await this.pointsRedemption.setMemberBalance(Number(balance));
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
// @schema orders.total_amount: int
// @binds PointsRedemptionDriver.createOrder
Given('訂單金額為 {string}', async function (total) {
  await this.pointsRedemption.createOrder(Number(total));
});

// @rule R-POINTS_REDEMPTION-003, 004, 005, 006, 008, 009
// @schema orders.redeemed_points: int
// @binds PointsRedemptionDriver.redeemPoints
Given('會員已成功折抵 {string} 點', async function (points) {
  await this.pointsRedemption.redeemPoints(Number(points));
  assert.equal(await this.pointsRedemption.getLastResult(), '成功');
});

// @rule R-POINTS_REDEMPTION-005
// @schema orders.status: varchar
// @binds PointsRedemptionDriver.submitOrder
Given('訂單已送出', async function () {
  await this.pointsRedemption.submitOrder();
});

// @rule R-POINTS_REDEMPTION-007
// @schema none
// @binds PointsRedemptionDriver.injectWriteFailure
Given('折抵交易寫入時將發生失敗', async function () {
  await this.pointsRedemption.injectWriteFailure();
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 006, 007, 008
// @schema orders.redeemed_points: int
// @binds PointsRedemptionDriver.redeemPoints
When('會員輸入折抵點數 {string}', async function (points) {
  // 空白輸入以 null 傳入，由產品碼判定為「必須大於 0」（決策見 .specengine/sdd/resolved/features/點數折抵_折抵零點.md）
  await this.pointsRedemption.redeemPoints(points === '' ? null : Number(points));
});

// @rule R-POINTS_REDEMPTION-004, 005, 010
// @schema orders.redeemed_points: int
// @binds PointsRedemptionDriver.cancelRedemption
When('會員取消折抵', async function () {
  await this.pointsRedemption.cancelRedemption();
});

// @rule R-POINTS_REDEMPTION-009
// @schema none
// @binds PointsRedemptionDriver.leaveCheckoutAndTimeout
When('會員離開結帳頁面且逾時', async function () {
  await this.pointsRedemption.leaveCheckoutAndTimeout();
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 010
// @schema none
// @binds PointsRedemptionDriver.getLastResult
Then('系統回傳結果 {string}', async function (expected) {
  assert.equal(await this.pointsRedemption.getLastResult(), expected);
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
// @schema members.points_balance: int
// @binds PointsRedemptionDriver.getMemberBalance
Then('會員點數餘額應為 {string}', async function (expected) {
  assert.equal(await this.pointsRedemption.getMemberBalance(), Number(expected));
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
// @schema orders.payable_amount: int
// @binds PointsRedemptionDriver.getPayableAmount
Then('訂單應付金額應為 {string}', async function (expected) {
  assert.equal(await this.pointsRedemption.getPayableAmount(), Number(expected));
});

// @rule R-POINTS_REDEMPTION-000, 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
// @schema orders.redeemed_points: int
// @binds PointsRedemptionDriver.getRedeemedPoints
Then('訂單上的折抵點數應為 {string}', async function (expected) {
  assert.equal(await this.pointsRedemption.getRedeemedPoints(), Number(expected));
});
