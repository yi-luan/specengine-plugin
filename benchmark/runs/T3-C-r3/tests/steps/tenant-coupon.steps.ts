// 模組 TENANT_COUPON（多租戶優惠券）Step Definitions。
// Binding Layer = direct：spec-05 在函式體內直接呼叫 src/coupon.ts 的 applyCoupons。
// 句型字串由 spec-guard 凍結，spec-05 期間只能改函式體。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { applyCoupons, type Coupon } from '../../src/coupon.js';
import type { TenantCouponWorld } from '../support/world.js';

/** 以逗號分隔的代碼清單；空字串表示空清單 */
const parseCodes = (codes: string): string[] => (codes === '' ? [] : codes.split(','));

// @rule R-TENANT_COUPON-*
// @schema coupons.code: varchar, coupons.tenant_id: varchar, coupons.type: varchar, coupons.value: int, coupons.stackable: boolean, coupons.min_order_amount: int, coupons.valid_from: timestamp, coupons.valid_to: timestamp
// @binds coupon.Coupon
Given(
  '優惠券 {string}：租戶 {string}、類型 {string}、折扣值 {string}、可疊加 {string}、最低消費 {string}、有效期間 {string} 至 {string}',
  function (
    this: TenantCouponWorld,
    code: string,
    tenantId: string,
    type: string,
    value: string,
    stackable: string,
    minOrderAmount: string,
    validFrom: string,
    validTo: string,
  ) {
    assert.ok(type === 'PERCENT' || type === 'FIXED', `未知的優惠券類型：${type}`);
    assert.ok(stackable === '是' || stackable === '否', `可疊加只能是「是」或「否」：${stackable}`);
    const coupon: Coupon = {
      tenantId,
      code,
      type,
      value: Number(value),
      validFrom,
      validTo,
      stackable: stackable === '是',
    };
    if (minOrderAmount !== '無') coupon.minOrderAmount = Number(minOrderAmount);
    this.coupons.set(code, coupon);
  },
);

// @rule R-TENANT_COUPON-*
// @schema checkout_orders.tenant_id: varchar, checkout_orders.order_amount: int, checkout_orders.now: timestamp
// @binds coupon.applyCoupons
When(
  '以租戶 {string}、訂單金額 {string}、結帳時間 {string} 套用優惠券 {string}',
  function (this: TenantCouponWorld, tenantId: string, orderAmount: string, now: string, codes: string) {
    const coupons = parseCodes(codes).map((code) => {
      const coupon = this.coupons.get(code);
      assert.ok(coupon, `測試前置資料缺少優惠券：${code}`);
      return coupon;
    });
    this.result = applyCoupons({ tenantId, orderAmount: Number(orderAmount), coupons, now });
  },
);

// @rule R-TENANT_COUPON-000, R-TENANT_COUPON-001, R-TENANT_COUPON-002, R-TENANT_COUPON-004, R-TENANT_COUPON-005, R-TENANT_COUPON-006, R-TENANT_COUPON-007, R-TENANT_COUPON-008, R-TENANT_COUPON-009, R-TENANT_COUPON-011
// @schema checkout_orders.discount: int, checkout_orders.final_amount: int
// @binds coupon.applyCoupons
Then(
  '套用成功，折扣總額 {string}、折扣後金額 {string}、實際套用的優惠券代碼 {string}',
  function (this: TenantCouponWorld, discount: string, finalAmount: string, applied: string) {
    assert.deepEqual(this.result, {
      ok: true,
      finalAmount: Number(finalAmount),
      discount: Number(discount),
      applied: parseCodes(applied),
    });
  },
);

// @rule R-TENANT_COUPON-003, R-TENANT_COUPON-004, R-TENANT_COUPON-005, R-TENANT_COUPON-007, R-TENANT_COUPON-008, R-TENANT_COUPON-010, R-TENANT_COUPON-011, R-TENANT_COUPON-012, R-TENANT_COUPON-013
// @schema none
// @binds coupon.applyCoupons
Then('套用失敗，失敗原因 {string}', function (this: TenantCouponWorld, reason: string) {
  assert.deepEqual(this.result, { ok: false, reason });
});
