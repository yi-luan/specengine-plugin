// 會員點數折抵（POINTS_REDEMPTION）Step Definitions
// 句型字串與 .specengine/spec/features/會員點數折抵.feature 逐字一致，spec-guard 在 spec 05 期間凍結句型。
// Binding Layer：direct —— Step 直接呼叫 src/points.ts 的 applyPointsDiscount，無 Driver 層。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { applyPointsDiscount } from '../../src/points.js';
import type { PointsRedemptionWorld } from '../support/world.js';

function requireResult(world: PointsRedemptionWorld) {
  assert.ok(world.result, '尚未呼叫折抵（缺少 When 會員輸入折抵點數）');
  return world.result;
}

// @rule R-POINTS_REDEMPTION-*
// @schema members.points_balance: int
// @binds PointsService.applyPointsDiscount
Given('會員點數餘額為 {string}', function (this: PointsRedemptionWorld, balance: string) {
  this.input.pointsBalance = Number(balance);
});

// @rule R-POINTS_REDEMPTION-*
// @schema orders.order_amount: int
// @binds PointsService.applyPointsDiscount
Given('訂單金額為 {string}', function (this: PointsRedemptionWorld, orderAmount: string) {
  this.input.orderAmount = Number(orderAmount);
});

// @rule R-POINTS_REDEMPTION-*
// @schema orders.points_used: int
// @binds PointsService.applyPointsDiscount
When('會員輸入折抵點數 {string}', function (this: PointsRedemptionWorld, points: string) {
  const { orderAmount, pointsBalance } = this.input;
  assert.ok(orderAmount !== undefined, '缺少 Given 訂單金額');
  assert.ok(pointsBalance !== undefined, '缺少 Given 會員點數餘額');
  this.input.pointsToUse = Number(points);
  // 傳入複本：純函式不應改動呼叫端輸入，後續「點數餘額維持」步驟以 this.input 比對
  this.result = applyPointsDiscount({ orderAmount, pointsBalance, pointsToUse: this.input.pointsToUse });
});

// @rule R-POINTS_REDEMPTION-*
// @schema none
// @binds PointsService.applyPointsDiscount
Then('折抵結果為 {string}', function (this: PointsRedemptionWorld, expected: string) {
  const result = requireResult(this);
  if (expected === '成功') assert.equal(result.ok, true, `期望折抵成功，實際：${JSON.stringify(result)}`);
  else if (expected === '不成功') assert.equal(result.ok, false, `期望折抵不成功，實際：${JSON.stringify(result)}`);
  else assert.fail(`未知的折抵結果文字：${expected}`);
});

// @rule R-POINTS_REDEMPTION-000
// @schema orders.final_amount: int
// @binds PointsService.applyPointsDiscount
Then('應付金額為 {string}', function (this: PointsRedemptionWorld, finalAmount: string) {
  const result = requireResult(this);
  assert.equal(result.ok, true, '應付金額只在折抵成功時存在');
  if (result.ok) assert.equal(result.finalAmount, Number(finalAmount));
});

// @rule R-POINTS_REDEMPTION-000
// @schema members.points_balance: int
// @binds PointsService.applyPointsDiscount
Then('剩餘點數為 {string}', function (this: PointsRedemptionWorld, remainingPoints: string) {
  const result = requireResult(this);
  assert.equal(result.ok, true, '剩餘點數只在折抵成功時存在');
  if (result.ok) assert.equal(result.remainingPoints, Number(remainingPoints));
});

// @rule R-POINTS_REDEMPTION-001, R-POINTS_REDEMPTION-002, R-POINTS_REDEMPTION-003, R-POINTS_REDEMPTION-004
// @schema none
// @binds PointsService.applyPointsDiscount
Then('失敗原因為 {string}', function (this: PointsRedemptionWorld, reason: string) {
  const result = requireResult(this);
  assert.equal(result.ok, false, '失敗原因只在折抵不成功時存在');
  if (!result.ok) assert.equal(result.reason, reason);
});

// @rule R-POINTS_REDEMPTION-001, R-POINTS_REDEMPTION-002, R-POINTS_REDEMPTION-003, R-POINTS_REDEMPTION-004
// @schema members.points_balance: int
// @binds PointsService.applyPointsDiscount
Then('點數餘額維持 {string}', function (this: PointsRedemptionWorld, balance: string) {
  const result = requireResult(this);
  assert.equal(result.ok, false, '餘額不變的斷言只用於折抵不成功');
  assert.equal(this.input.pointsBalance, Number(balance), '呼叫端輸入的點數餘額不得被改動');
  assert.ok(!('remainingPoints' in result), '折抵不成功時不得回傳剩餘點數');
});
