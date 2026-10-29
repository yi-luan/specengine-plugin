import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type Coupon } from '../../src/coupon.js';
import type { CouponWorld } from '../support/world.js';

function rowToCoupon(row: Record<string, string>): Coupon {
  const coupon: Coupon = {
    tenantId: row.tenantId,
    code: row.code,
    type: row.type as Coupon['type'],
    value: Number(row.value),
    validFrom: row.validFrom,
    validTo: row.validTo,
    stackable: row.stackable === 'true',
  };
  if (row.minOrderAmount !== undefined && row.minOrderAmount.trim() !== '') {
    coupon.minOrderAmount = Number(row.minOrderAmount);
  }
  return coupon;
}

Given('租戶 {string} 的訂單金額為 {float} 元', function (this: CouponWorld, tenantId: string, amount: number) {
  this.tenantId = tenantId;
  this.orderAmount = amount;
});

Given('現在時間為 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

Given('有以下優惠券:', function (this: CouponWorld, table: DataTable) {
  this.coupons = table.hashes().map(rowToCoupon);
});

Given('沒有任何優惠券', function (this: CouponWorld) {
  this.coupons = [];
});

When('執行結帳', function (this: CouponWorld) {
  this.result = applyCoupons(this.buildInput());
});

Then('結帳成功，折扣後金額 {int} 元，折扣總額 {int} 元', function (this: CouponWorld, finalAmount: number, discount: number) {
  assert.ok(this.result, 'no result');
  assert.equal(this.result.ok, true, `expected ok but got ${JSON.stringify(this.result)}`);
  if (this.result.ok) {
    assert.equal(this.result.finalAmount, finalAmount);
    assert.equal(this.result.discount, discount);
    assert.ok(Number.isInteger(this.result.finalAmount));
    assert.ok(Number.isInteger(this.result.discount));
  }
});

Then('套用的優惠券代碼依序為 {string}', function (this: CouponWorld, codes: string) {
  assert.ok(this.result, 'no result');
  assert.equal(this.result.ok, true, `expected ok but got ${JSON.stringify(this.result)}`);
  if (this.result.ok) {
    const expected = codes.trim() === '' ? [] : codes.split(',').map((s) => s.trim());
    assert.deepEqual(this.result.applied, expected);
  }
});

Then('結帳失敗，原因為 {string}', function (this: CouponWorld, reason: string) {
  assert.ok(this.result, 'no result');
  assert.equal(this.result.ok, false, `expected failure but got ${JSON.stringify(this.result)}`);
  if (!this.result.ok) {
    assert.equal(this.result.reason, reason);
  }
});

Then('再次結帳結果相同且輸入未被修改', function (this: CouponWorld) {
  const input = this.buildInput();
  const snapshot = JSON.stringify(input);
  const first = applyCoupons(input);
  const second = applyCoupons(input);
  assert.deepEqual(second, first);
  assert.deepEqual(first, this.result);
  assert.equal(JSON.stringify(input), snapshot, 'input was mutated');
});
