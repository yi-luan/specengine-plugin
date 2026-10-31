// 多租戶優惠券 Step Definitions（Binding Layer = direct：step 直接呼叫純函式 applyCoupons，無 Driver 層）
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { applyCoupons, type ApplyResult, type Coupon } from '../../src/coupon.js';

type CouponDef = Partial<Coupon> & { code: string };

// 跨步驟狀態放在 Cucumber World（每個 Scenario 一份），不使用全域變數。
interface CouponWorld {
  coupons: Record<string, CouponDef>;
  tenantId?: string;
  now?: string;
  orderAmount?: number;
  result?: ApplyResult;
}

function couponDef(world: CouponWorld, code: string): CouponDef {
  world.coupons ??= {};
  world.coupons[code] ??= { code };
  return world.coupons[code];
}

function runApply(world: CouponWorld, codes: string[]): void {
  const coupons = codes.map((code) => {
    const def = world.coupons[code];
    assert.ok(def, `未定義優惠券 ${code}`);
    return { ...def } as Coupon;
  });
  world.result = applyCoupons({
    tenantId: world.tenantId as string,
    orderAmount: world.orderAmount as number,
    coupons,
    now: world.now as string,
  });
}

function succeeded(world: CouponWorld): Extract<ApplyResult, { ok: true }> {
  assert.ok(world.result, '尚未執行套用');
  assert.equal(world.result.ok, true, `預期成功，實際失敗：${JSON.stringify(world.result)}`);
  return world.result;
}

// @rule R-COUPON-*
// @schema coupons.type: varchar
// @binds coupon.applyCoupons
Given('優惠券 {string} 類型為 {string}', function (this: CouponWorld, code: string, type: string) {
  couponDef(this, code).type = type as Coupon['type'];
});

// @rule R-COUPON-*
// @schema coupons.value: int
// @binds coupon.applyCoupons
Given('優惠券 {string} 值為 {string}', function (this: CouponWorld, code: string, value: string) {
  couponDef(this, code).value = Number(value);
});

// @rule R-COUPON-*
// @schema coupons.stackable: boolean
// @binds coupon.applyCoupons
Given('優惠券 {string} 可疊加為 {string}', function (this: CouponWorld, code: string, stackable: string) {
  couponDef(this, code).stackable = stackable === '是';
});

// @rule R-COUPON-*
// @schema coupons.valid_from: timestamp, coupons.valid_to: timestamp
// @binds coupon.applyCoupons
Given('優惠券 {string} 有效期間為 {string} 至 {string}', function (this: CouponWorld, code: string, from: string, to: string) {
  const def = couponDef(this, code);
  def.validFrom = from;
  def.validTo = to;
});

// @rule R-COUPON-*
// @schema coupons.min_order_amount: int
// @binds coupon.applyCoupons
Given('優惠券 {string} 最低消費為 {string}', function (this: CouponWorld, code: string, minAmount: string) {
  const def = couponDef(this, code);
  if (minAmount === '無') delete def.minOrderAmount;
  else def.minOrderAmount = Number(minAmount);
});

// @rule R-COUPON-*
// @schema coupons.tenant_id: varchar
// @binds coupon.applyCoupons
Given('優惠券 {string} 所屬租戶為 {string}', function (this: CouponWorld, code: string, tenantId: string) {
  couponDef(this, code).tenantId = tenantId;
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Given('訂單租戶為 {string}', function (this: CouponWorld, tenantId: string) {
  this.tenantId = tenantId;
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Given('現在時間為 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Given('訂單金額為 {string}', function (this: CouponWorld, amount: string) {
  this.orderAmount = Number(amount);
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
When('依序傳入優惠券 {string} 進行套用', function (this: CouponWorld, codes: string) {
  runApply(this, codes.split(',').map((c) => c.trim()));
});

// @rule R-COUPON-008
// @schema none
// @binds coupon.applyCoupons
When('不傳入任何優惠券進行套用', function (this: CouponWorld) {
  runApply(this, []);
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Then('套用結果為 {string}', function (this: CouponWorld, result: string) {
  assert.ok(this.result, '尚未執行套用');
  assert.equal(this.result.ok, result === '成功');
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Then('折扣總額為 {string}', function (this: CouponWorld, discount: string) {
  assert.equal(succeeded(this).discount, Number(discount));
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Then('折扣後金額為 {string}', function (this: CouponWorld, finalAmount: string) {
  assert.equal(succeeded(this).finalAmount, Number(finalAmount));
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Then('實際套用代碼為 {string}', function (this: CouponWorld, applied: string) {
  assert.ok(this.result, '尚未執行套用');
  const actual = this.result.ok ? this.result.applied : [];
  const expected = applied === '無' ? [] : applied.split(',').map((c) => c.trim());
  assert.deepEqual(actual, expected);
});

// @rule R-COUPON-*
// @schema none
// @binds coupon.applyCoupons
Then('失敗原因代碼為 {string}', function (this: CouponWorld, reason: string) {
  assert.ok(this.result, '尚未執行套用');
  assert.equal(this.result.ok, false, '預期失敗，實際成功');
  assert.equal(this.result.reason, reason);
});
