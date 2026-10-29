// 多租戶優惠券（MULTI_TENANT_COUPON）Step Definitions
// Binding Layer: direct — step 直接呼叫 src/coupon.ts 的 applyCoupons。
// 跨步驟狀態放在 cucumber World（每個 Scenario 一個新實例），不使用全域變數。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { applyCoupons, type ApplyResult, type Coupon } from '../../src/coupon.js';

/** Feature 描述：未另行指定時，券的有效期間為 2026 全年、未設定最低消費金額 */
const DEFAULT_VALID_FROM = '2026-01-01T00:00:00Z';
const DEFAULT_VALID_TO = '2026-12-31T23:59:59Z';

interface CouponWorld {
  tenantId?: string;
  now?: string;
  orderAmount?: number;
  coupons?: Map<string, Coupon>;
  result?: ApplyResult;
}

function couponOf(world: CouponWorld, code: string): Coupon {
  const coupon = world.coupons?.get(code);
  if (!coupon) throw new Error(`測試前置錯誤：未定義優惠券 ${code}`);
  return coupon;
}

function checkout(world: CouponWorld, codes: string[]): void {
  world.result = applyCoupons({
    tenantId: world.tenantId ?? '',
    orderAmount: world.orderAmount ?? NaN,
    now: world.now ?? '',
    coupons: codes.map((code) => couponOf(world, code)),
  });
}

const splitCodes = (codes: string): string[] => (codes.trim() === '' ? [] : codes.split(',').map((c) => c.trim()));

// @rule R-MULTI_TENANT_COUPON-*
// @schema tenants.id: varchar
// @binds applyCoupons.applyCoupons
Given('訂單屬租戶 {string}', function (this: CouponWorld, tenantId: string) {
  this.tenantId = tenantId;
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none（ApplyInput.now: ISO 8601 string）
// @binds applyCoupons.applyCoupons
Given('結帳時間為 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none（ApplyInput.orderAmount: number，整數元）
// @binds applyCoupons.applyCoupons
Given('訂單金額為 {string}', function (this: CouponWorld, orderAmount: string) {
  this.orderAmount = Number(orderAmount);
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema coupons.code: varchar, coupons.tenant_id: varchar, coupons.type: varchar, coupons.value: int, coupons.stackable: boolean
// @binds applyCoupons.applyCoupons
Given(
  '有一張優惠券 {string}：租戶 {string}、類型 {string}、值 {string}、可疊加 {string}',
  function (this: CouponWorld, code: string, tenantId: string, type: string, value: string, stackable: string) {
    assert.ok(type === 'PERCENT' || type === 'FIXED', `測試前置錯誤：未知的折扣類型 ${type}`);
    assert.ok(stackable === '是' || stackable === '否', `測試前置錯誤：可疊加只能是「是／否」，收到 ${stackable}`);
    this.coupons ??= new Map();
    this.coupons.set(code, {
      tenantId,
      code,
      type,
      value: Number(value),
      validFrom: DEFAULT_VALID_FROM,
      validTo: DEFAULT_VALID_TO,
      stackable: stackable === '是',
    });
  },
);

// @rule R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-008, R-MULTI_TENANT_COUPON-017, R-MULTI_TENANT_COUPON-018
// @schema coupons.min_order_amount: int
// @binds applyCoupons.applyCoupons
Given('優惠券 {string} 的最低消費金額為 {string}', function (this: CouponWorld, code: string, minOrderAmount: string) {
  couponOf(this, code).minOrderAmount = Number(minOrderAmount);
});

// @rule R-MULTI_TENANT_COUPON-010, R-MULTI_TENANT_COUPON-017, R-MULTI_TENANT_COUPON-018
// @schema coupons.valid_from: timestamp, coupons.valid_to: timestamp
// @binds applyCoupons.applyCoupons
Given('優惠券 {string} 的有效期間為 {string} 至 {string}', function (this: CouponWorld, code: string, validFrom: string, validTo: string) {
  const coupon = couponOf(this, code);
  coupon.validFrom = validFrom;
  coupon.validTo = validTo;
});

// @rule R-MULTI_TENANT_COUPON-*
// @schema none
// @binds applyCoupons.applyCoupons
When('以優惠券 {string} 結帳', function (this: CouponWorld, codes: string) {
  checkout(this, splitCodes(codes));
});

// @rule R-MULTI_TENANT_COUPON-016
// @schema none
// @binds applyCoupons.applyCoupons
When('不使用任何優惠券結帳', function (this: CouponWorld) {
  checkout(this, []);
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-001, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-008, R-MULTI_TENANT_COUPON-009, R-MULTI_TENANT_COUPON-010, R-MULTI_TENANT_COUPON-013, R-MULTI_TENANT_COUPON-014, R-MULTI_TENANT_COUPON-016
// @schema none（ApplyResult.discount: number, ApplyResult.finalAmount: number）
// @binds applyCoupons.applyCoupons
Then('套用成功，折扣總額為 {string}，折扣後金額為 {string}', function (this: CouponWorld, discount: string, finalAmount: string) {
  const result = this.result;
  assert.ok(result, '尚未結帳');
  assert.equal(result.ok, true, `預期套用成功，實際失敗：${result.ok ? '' : result.reason}`);
  if (!result.ok) return;
  assert.equal(result.discount, Number(discount));
  assert.equal(result.finalAmount, Number(finalAmount));
});

// @rule R-MULTI_TENANT_COUPON-000, R-MULTI_TENANT_COUPON-001, R-MULTI_TENANT_COUPON-005, R-MULTI_TENANT_COUPON-008, R-MULTI_TENANT_COUPON-009, R-MULTI_TENANT_COUPON-010, R-MULTI_TENANT_COUPON-013, R-MULTI_TENANT_COUPON-014, R-MULTI_TENANT_COUPON-016
// @schema none（ApplyResult.applied: string[]，依傳入順序）
// @binds applyCoupons.applyCoupons
Then('實際套用的優惠券代碼依序為 {string}', function (this: CouponWorld, codes: string) {
  const result = this.result;
  assert.ok(result && result.ok, '預期套用成功');
  assert.deepEqual(result.applied, splitCodes(codes));
});

// @rule R-MULTI_TENANT_COUPON-002, R-MULTI_TENANT_COUPON-003, R-MULTI_TENANT_COUPON-004, R-MULTI_TENANT_COUPON-006, R-MULTI_TENANT_COUPON-007, R-MULTI_TENANT_COUPON-011, R-MULTI_TENANT_COUPON-012, R-MULTI_TENANT_COUPON-015, R-MULTI_TENANT_COUPON-017, R-MULTI_TENANT_COUPON-018
// @schema none（ApplyResult.reason: string）
// @binds applyCoupons.applyCoupons
Then('套用失敗，失敗原因為 {string}', function (this: CouponWorld, reason: string) {
  const result = this.result;
  assert.ok(result, '尚未結帳');
  assert.deepEqual(result, { ok: false, reason });
});
