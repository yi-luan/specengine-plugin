import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyPointsDiscount, type PointsDiscountInput, type PointsDiscountResult } from '../../src/points.js';

interface PointsWorld {
  input: Partial<PointsDiscountInput>;
  result?: PointsDiscountResult;
}

Given('訂單金額為 {float} 元', function (this: PointsWorld, orderAmount: number) {
  this.input = { ...(this.input ?? {}), orderAmount };
});

Given('會員點數餘額為 {float} 點', function (this: PointsWorld, pointsBalance: number) {
  this.input = { ...(this.input ?? {}), pointsBalance };
});

When('會員使用 {float} 點折抵', function (this: PointsWorld, pointsToUse: number) {
  this.input = { ...(this.input ?? {}), pointsToUse };
  const { orderAmount, pointsBalance } = this.input;
  assert.ok(orderAmount !== undefined && pointsBalance !== undefined, '前置條件未設定');
  this.result = applyPointsDiscount({ orderAmount, pointsBalance, pointsToUse });
});

Then('折抵成功', function (this: PointsWorld) {
  assert.ok(this.result, '尚未執行折抵');
  assert.equal(this.result.ok, true, `預期成功，實際：${JSON.stringify(this.result)}`);
});

Then('折抵失敗', function (this: PointsWorld) {
  assert.ok(this.result, '尚未執行折抵');
  assert.equal(this.result.ok, false, `預期失敗，實際：${JSON.stringify(this.result)}`);
});

Then('折抵後應付金額為 {float} 元', function (this: PointsWorld, finalAmount: number) {
  assert.ok(this.result && this.result.ok);
  assert.equal(this.result.finalAmount, finalAmount);
});

Then('剩餘點數為 {float} 點', function (this: PointsWorld, remainingPoints: number) {
  assert.ok(this.result && this.result.ok);
  assert.equal(this.result.remainingPoints, remainingPoints);
});

Then('失敗原因為 {string}', function (this: PointsWorld, reason: string) {
  assert.ok(this.result && !this.result.ok);
  assert.equal(this.result.reason, reason);
});

Then('輸入的點數餘額仍為 {float} 點', function (this: PointsWorld, pointsBalance: number) {
  assert.equal(this.input.pointsBalance, pointsBalance);
});
