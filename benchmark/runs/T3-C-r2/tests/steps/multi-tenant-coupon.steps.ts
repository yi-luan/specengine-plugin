// 多租戶優惠券（MULTI_TENANT_COUPON）Step Definitions
// 對應 .specengine/spec/features/多租戶優惠券.feature
// Binding Layer：direct（step 直接呼叫 src/coupon.ts 的 applyCoupons，無 Driver 層）
// 句型字串由 spec-guard 凍結；spec-05 只填函式體。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { applyCoupons, type Coupon } from '../../src/coupon.js';
import type { CouponWorld } from '../support/coupon-world.js';

/** 「是／否」轉布林；其他值視為測試資料寫錯 */
function parseYesNo(text: string): boolean {
  if (text === '是') return true;
  if (text === '否') return false;
  throw new Error(`可疊加欄位只接受「是」或「否」，收到：${text}`);
}

/** 「無」表示未設定最低消費；其餘轉數值（可為負數或小數，用來驗證不合法輸入） */
function parseOptionalAmount(text: string): number | undefined {
  return text === '無' ? undefined : Number(text);
}

function requireOutcome(world: CouponWorld) {
  assert.ok(world.outcome, '尚未呼叫結帳套用優惠券');
  return world.outcome;
}

// @rule R-MULTI_TENANT_COUPON-*
// @schema orders.tenant_id: varchar, orders.amount: int
// @binds coupon.applyCoupons（組裝 ApplyInput.tenantId、ApplyInput.orderAmount）
Given('訂單租戶為 {string} 且訂單金額為 {string}', function (this: CouponWorld, tenantId: string, orderAmount: string) {
  this.tenantId = tenantId;
  this.orderAmount = Number(orderAmount);
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none
// @binds coupon.applyCoupons（組裝 ApplyInput.now）
Given('結帳時間為 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-001, R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-003, R-MULTI_TENANT_COUPON-004, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-008, R-MULTI_TENANT_COUPON-010, R-MULTI_TENANT_COUPON-011, R-MULTI_TENANT_COUPON-012, R-MULTI_TENANT_COUPON-013
// @schema coupons.code: varchar, coupons.tenant_id: varchar, coupons.type: varchar, coupons.value: int, coupons.stackable: boolean, coupons.min_order_amount: int, coupons.valid_from: timestamp, coupons.valid_to: timestamp
// @binds coupon.applyCoupons（組裝 ApplyInput.coupons 的一張 Coupon）
Given(
  '傳入優惠券 {string} 租戶 {string} 類型 {string} 折扣值 {string} 可疊加 {string} 最低消費 {string} 有效期間 {string} 至 {string}',
  function (
    this: CouponWorld,
    code: string,
    tenantId: string,
    type: string,
    value: string,
    stackable: string,
    minOrderAmount: string,
    validFrom: string,
    validTo: string,
  ) {
    const min = parseOptionalAmount(minOrderAmount);
    this.coupons.push({
      tenantId,
      code,
      type,
      value: Number(value),
      validFrom,
      validTo,
      stackable: parseYesNo(stackable),
      ...(min === undefined ? {} : { minOrderAmount: min }),
    });
  },
);

// @rule R-MULTI_TENANT_COUPON-009
// @schema none
// @binds coupon.applyCoupons（ApplyInput.coupons = []）
Given('未傳入任何優惠券', function (this: CouponWorld) {
  this.coupons = [];
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none
// @binds coupon.applyCoupons
When('呼叫結帳套用優惠券', function (this: CouponWorld) {
  this.outcome = applyCoupons({
    tenantId: this.tenantId,
    orderAmount: this.orderAmount,
    // 測試刻意傳入不合法的類型字串時也要能送進產品碼驗證，故在邊界轉型
    coupons: this.coupons as Coupon[],
    now: this.now,
  });
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none
// @binds coupon.applyCoupons（ApplyResult.ok）
Then('結果為 {string}', function (this: CouponWorld, expected: string) {
  const outcome = requireOutcome(this);
  const expectedOk = expected === '成功' ? true : expected === '失敗' ? false : undefined;
  assert.notEqual(expectedOk, undefined, `結果只接受「成功」或「失敗」，收到：${expected}`);
  assert.equal(outcome.ok, expectedOk, `實際結果：${JSON.stringify(outcome)}`);
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-004, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-009, R-MULTI_TENANT_COUPON-012
// @schema none
// @binds coupon.applyCoupons（ApplyResult.finalAmount）
Then('折扣後金額為 {string}', function (this: CouponWorld, expected: string) {
  const outcome = requireOutcome(this);
  assert.ok(outcome.ok, `預期成功，實際：${JSON.stringify(outcome)}`);
  assert.equal(outcome.finalAmount, Number(expected));
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-004, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-009, R-MULTI_TENANT_COUPON-012
// @schema none
// @binds coupon.applyCoupons（ApplyResult.discount）
Then('折扣總額為 {string}', function (this: CouponWorld, expected: string) {
  const outcome = requireOutcome(this);
  assert.ok(outcome.ok, `預期成功，實際：${JSON.stringify(outcome)}`);
  assert.equal(outcome.discount, Number(expected));
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-004, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-009, R-MULTI_TENANT_COUPON-012
// @schema coupons.code: varchar
// @binds coupon.applyCoupons（ApplyResult.applied；"無" 表示空清單，多張以逗號分隔）
Then('套用的優惠券代碼依序為 {string}', function (this: CouponWorld, expected: string) {
  const outcome = requireOutcome(this);
  assert.ok(outcome.ok, `預期成功，實際：${JSON.stringify(outcome)}`);
  const expectedCodes = expected === '無' ? [] : expected.split(',');
  assert.deepEqual(outcome.applied, expectedCodes);
});

// @rule R-MULTI_TENANT_COUPON-001, R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-003, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-008, R-MULTI_TENANT_COUPON-010, R-MULTI_TENANT_COUPON-011, R-MULTI_TENANT_COUPON-012, R-MULTI_TENANT_COUPON-013
// @schema none
// @binds coupon.applyCoupons（ApplyResult.reason）
Then('失敗原因為 {string}', function (this: CouponWorld, expected: string) {
  const outcome = requireOutcome(this);
  assert.equal(outcome.ok, false, `預期失敗，實際：${JSON.stringify(outcome)}`);
  if (!outcome.ok) assert.equal(outcome.reason, expected);
});
