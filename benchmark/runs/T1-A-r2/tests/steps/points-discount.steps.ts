import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  applyPointsDiscount,
  maxPointsForOrder,
  type PointsDiscountInput,
  type PointsDiscountResult,
} from '../../src/points.js';

type World = {
  input: Partial<PointsDiscountInput>;
  result?: PointsDiscountResult;
};

function ctx(self: unknown): World {
  const w = self as World;
  if (!w.input) w.input = {};
  return w;
}

Given('訂單金額為 {float} 元', function (amount: number) {
  ctx(this).input.orderAmount = amount;
});

Given('會員點數餘額為 {float} 點', function (balance: number) {
  ctx(this).input.pointsBalance = balance;
});

When('會員使用 {float} 點折抵', function (pointsToUse: number) {
  const w = ctx(this);
  w.input.pointsToUse = pointsToUse;
  w.result = applyPointsDiscount(w.input as PointsDiscountInput);
});

Then('折抵成功', function () {
  const r = ctx(this).result;
  assert.ok(r, '尚未執行折抵');
  assert.equal(r.ok, true, `預期成功，實際失敗：${r.ok ? '' : r.reason}`);
});

Then('折抵失敗', function () {
  const r = ctx(this).result;
  assert.ok(r, '尚未執行折抵');
  assert.equal(r.ok, false, '預期失敗，實際成功');
});

Then('折抵後應付金額為 {int} 元', function (expected: number) {
  const r = ctx(this).result;
  assert.ok(r && r.ok);
  assert.equal(r.finalAmount, expected);
});

Then('剩餘點數為 {int} 點', function (expected: number) {
  const r = ctx(this).result;
  assert.ok(r && r.ok);
  assert.equal(r.remainingPoints, expected);
});

Then('失敗原因為 {string}', function (expected: string) {
  const r = ctx(this).result;
  assert.ok(r && !r.ok);
  assert.equal(r.reason, expected);
});

Then('點數餘額與訂單金額不變', function () {
  // 純函式：失敗時不得產生任何副作用，輸入物件保持原樣，且結果不含 finalAmount / remainingPoints
  const w = ctx(this);
  const r = w.result;
  assert.ok(r && !r.ok);
  assert.equal('finalAmount' in r, false);
  assert.equal('remainingPoints' in r, false);
});

Then('訂單金額 {int} 元的最高可折抵點數為 {int} 點', function (orderAmount: number, expected: number) {
  assert.equal(maxPointsForOrder(orderAmount), expected);
});
