// tests/steps/points-redemption.steps.ts
// 模組：POINTS_REDEMPTION（會員點數折抵）— Step Definitions（spec-04 產出句型，spec-05 填入函式體）。
// 句型字串與 .specengine/spec/features/會員點數折抵.feature 逐字一致，spec-05 期間由 spec-guard 凍結；函式體可改。
// Binding Layer：direct（Step 直接呼叫 src/points.ts 的 applyPointsDiscount）。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { PointsRedemptionWorld } from '../support/world.js';
import { applyPointsDiscount } from '../../src/points.js';

// @rule R-POINTS_REDEMPTION-*
// @schema member.points_balance: int
// @binds none（寫入 World 狀態，不呼叫 Service）
Given('會員點數餘額為 {string}', function (this: PointsRedemptionWorld, balance: string) {
  this.pointsBalance = Number(balance);
});

// @rule R-POINTS_REDEMPTION-*
// @schema order.order_amount: int
// @binds none（寫入 World 狀態，不呼叫 Service）
Given('訂單金額為 {string}', function (this: PointsRedemptionWorld, orderAmount: string) {
  this.orderAmount = Number(orderAmount);
});

// @rule R-POINTS_REDEMPTION-*
// @schema order.points_used: int
// @binds points.applyPointsDiscount
When('會員輸入折抵點數 {string}', function (this: PointsRedemptionWorld, points: string) {
  assert.notEqual(this.orderAmount, undefined, '缺少 Given 訂單金額');
  assert.notEqual(this.pointsBalance, undefined, '缺少 Given 會員點數餘額');
  this.result = applyPointsDiscount({
    orderAmount: this.orderAmount as number,
    pointsBalance: this.pointsBalance as number,
    pointsToUse: Number(points),
  });
});

// @rule R-POINTS_REDEMPTION-*
// @schema none
// @binds none（斷言 World.result.ok）
Then('折抵結果為 {string}', function (this: PointsRedemptionWorld, expected: string) {
  assert.ok(this.result, '尚未執行折抵');
  assert.equal(this.result.ok, expected === '成功', `預期折抵結果為「${expected}」，實際：${JSON.stringify(this.result)}`);
});

// @rule R-POINTS_REDEMPTION-000, R-POINTS_REDEMPTION-001, R-POINTS_REDEMPTION-006
// @schema order.final_amount: int
// @binds none（斷言 World.result.finalAmount）
Then('應付金額為 {string}', function (this: PointsRedemptionWorld, expected: string) {
  assert.ok(this.result && this.result.ok === true, `預期折抵成功，實際：${JSON.stringify(this.result)}`);
  assert.equal(this.result.finalAmount, Number(expected));
});

// @rule R-POINTS_REDEMPTION-000, R-POINTS_REDEMPTION-001, R-POINTS_REDEMPTION-006
// @schema member.points_balance: int
// @binds none（斷言 World.result.remainingPoints）
Then('剩餘點數為 {string}', function (this: PointsRedemptionWorld, expected: string) {
  assert.ok(this.result && this.result.ok === true, `預期折抵成功，實際：${JSON.stringify(this.result)}`);
  assert.equal(this.result.remainingPoints, Number(expected));
});

// @rule R-POINTS_REDEMPTION-002, R-POINTS_REDEMPTION-003, R-POINTS_REDEMPTION-004, R-POINTS_REDEMPTION-005, R-POINTS_REDEMPTION-007, R-POINTS_REDEMPTION-008
// @schema none
// @binds none（斷言 World.result.reason，固定文案見 terms.md MSG-001～004）
Then('失敗原因為 {string}', function (this: PointsRedemptionWorld, expected: string) {
  assert.ok(this.result && this.result.ok === false, `預期折抵失敗，實際：${JSON.stringify(this.result)}`);
  assert.equal(this.result.reason, expected);
});
