import assert from 'node:assert/strict';
import { Given, When, Then, World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import { applyPointsDiscount, type PointsDiscountResult } from '../../src/points.js';

class PointsWorld extends World {
  orderAmount = 0;
  pointsBalance = 0;
  pointsToUse = 0;
  result: PointsDiscountResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PointsWorld);

Given('an order of {float} dollars', function (this: PointsWorld, amount: number) {
  this.orderAmount = amount;
});

Given('a member with {float} points', function (this: PointsWorld, balance: number) {
  this.pointsBalance = balance;
});

When('the member uses {float} points', function (this: PointsWorld, points: number) {
  this.pointsToUse = points;
  this.result = applyPointsDiscount({
    orderAmount: this.orderAmount,
    pointsBalance: this.pointsBalance,
    pointsToUse: this.pointsToUse,
  });
});

Then(
  'the redemption succeeds with amount payable {int} and remaining points {int}',
  function (this: PointsWorld, finalAmount: number, remainingPoints: number) {
    assert.ok(this.result, 'no result recorded');
    assert.deepEqual(this.result, { ok: true, finalAmount, remainingPoints });
  },
);

Then('the redemption fails with reason {string}', function (this: PointsWorld, reason: string) {
  assert.ok(this.result, 'no result recorded');
  assert.deepEqual(this.result, { ok: false, reason });
});

Then('the result carries no amount or points', function (this: PointsWorld) {
  assert.ok(this.result, 'no result recorded');
  assert.equal(this.result.ok, false);
  assert.ok(!('finalAmount' in this.result), 'finalAmount must be absent on failure');
  assert.ok(!('remainingPoints' in this.result), 'remainingPoints must be absent on failure');
});
