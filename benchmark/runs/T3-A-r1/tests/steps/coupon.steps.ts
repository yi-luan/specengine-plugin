import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type Coupon } from '../../src/coupon.js';
import type { CouponWorld } from '../support/world.js';

Given('現在時間是 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

Given(/^租戶 "([^"]*)" 的訂單金額為 (-?\d+(?:\.\d+)?)$/, function (this: CouponWorld, tenantId: string, amount: string) {
  this.tenantId = tenantId;
  this.orderAmount = Number(amount);
});

Given('傳入以下優惠券', function (this: CouponWorld, table: DataTable) {
  const rows = table.hashes();
  this.coupons = rows.map((row): Coupon => {
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
  });
});

When('結帳套用優惠券', function (this: CouponWorld) {
  this.result = applyCoupons({
    tenantId: this.tenantId,
    orderAmount: this.orderAmount,
    coupons: this.coupons,
    now: this.now,
  });
});

Then('套用成功，折扣後金額 {int}、折扣總額 {int}', function (this: CouponWorld, finalAmount: number, discount: number) {
  assert.ok(this.result, '尚未執行結帳');
  assert.equal(this.result.ok, true, `預期成功，實際：${JSON.stringify(this.result)}`);
  if (this.result.ok) {
    assert.equal(this.result.finalAmount, finalAmount, '折扣後金額不符');
    assert.equal(this.result.discount, discount, '折扣總額不符');
    assert.equal(this.result.finalAmount + this.result.discount, this.orderAmount, '折扣後金額 + 折扣總額 應等於訂單金額');
  }
});

Then('實際套用的優惠券代碼為 {string}', function (this: CouponWorld, codes: string) {
  assert.ok(this.result, '尚未執行結帳');
  assert.equal(this.result.ok, true, `預期成功，實際：${JSON.stringify(this.result)}`);
  if (this.result.ok) {
    const expected = codes === '' ? [] : codes.split(',').map((s) => s.trim());
    assert.deepEqual(this.result.applied, expected);
  }
});

Then('套用失敗，原因代碼為 {string}', function (this: CouponWorld, code: string) {
  assert.ok(this.result, '尚未執行結帳');
  assert.equal(this.result.ok, false, `預期失敗，實際：${JSON.stringify(this.result)}`);
  if (!this.result.ok) {
    assert.ok(this.result.reason.startsWith(`${code}:`), `原因代碼不符，實際 reason：${this.result.reason}`);
  }
});

Then('失敗原因提及優惠券 {string}', function (this: CouponWorld, code: string) {
  assert.ok(this.result, '尚未執行結帳');
  assert.equal(this.result.ok, false);
  if (!this.result.ok) {
    assert.ok(this.result.reason.includes(code), `reason 未提及 ${code}：${this.result.reason}`);
  }
});
