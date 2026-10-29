import { Given, When, Then, Before, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type ApplyResult, type Coupon } from '../../src/coupon.js';

type World = {
  now: string;
  catalog: Map<string, Map<string, Coupon>>; // tenantId -> code -> coupon
  result?: ApplyResult;
};

const world: World = { now: '', catalog: new Map() };

Before(() => {
  world.now = '';
  world.catalog = new Map();
  world.result = undefined;
});

function parseCodes(list: string): string[] {
  return list
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function lookup(tenantId: string, codes: string[]): Coupon[] {
  const byCode = world.catalog.get(tenantId);
  return codes.map((code) => {
    const c = byCode?.get(code);
    if (!c) throw new Error(`測試資料中找不到租戶 ${tenantId} 的優惠券 ${code}`);
    return c;
  });
}

Given('目前時間為 {string}', (now: string) => {
  world.now = now;
});

Given('租戶 {string} 的優惠券如下', (tenantId: string, table: DataTable) => {
  const byCode = world.catalog.get(tenantId) ?? new Map<string, Coupon>();
  for (const row of table.hashes()) {
    const coupon: Coupon = {
      tenantId,
      code: row.code,
      type: row.type as Coupon['type'],
      value: Number(row.value),
      validFrom: row.validFrom,
      validTo: row.validTo,
      stackable: row.stackable === 'true',
    };
    if (row.minOrderAmount && row.minOrderAmount.trim() !== '') {
      coupon.minOrderAmount = Number(row.minOrderAmount);
    }
    byCode.set(coupon.code, coupon);
  }
  world.catalog.set(tenantId, byCode);
});

When('租戶 {string} 以訂單金額 {float} 套用優惠券 {string}', (tenantId: string, orderAmount: number, codes: string) => {
  const coupons = lookup(tenantId, parseCodes(codes));
  world.result = applyCoupons({ tenantId, orderAmount, coupons, now: world.now });
});

When(
  '租戶 {string} 以訂單金額 {float} 套用租戶 {string} 的優惠券 {string}',
  (tenantId: string, orderAmount: number, couponTenantId: string, codes: string) => {
    const coupons = lookup(couponTenantId, parseCodes(codes));
    world.result = applyCoupons({ tenantId, orderAmount, coupons, now: world.now });
  },
);

Then('套用成功，折扣後金額 {int}、折扣總額 {int}', (finalAmount: number, discount: number) => {
  const r = world.result;
  assert.ok(r, '尚未執行套用');
  assert.equal(r.ok, true, `預期成功，實際失敗：${r.ok ? '' : r.reason}`);
  if (r.ok) {
    assert.equal(r.finalAmount, finalAmount, '折扣後金額不符');
    assert.equal(r.discount, discount, '折扣總額不符');
    assert.equal(r.finalAmount, Math.trunc(r.finalAmount), '折扣後金額必須為整數');
  }
});

Then('實際套用的優惠券為 {string}', (codes: string) => {
  const r = world.result;
  assert.ok(r && r.ok, '預期成功結果');
  assert.deepEqual(r.applied, parseCodes(codes));
});

Then('套用失敗，原因包含 {string}', (fragment: string) => {
  const r = world.result;
  assert.ok(r, '尚未執行套用');
  assert.equal(r.ok, false, '預期失敗，實際成功');
  if (!r.ok) {
    assert.ok(r.reason.includes(fragment), `原因「${r.reason}」未包含「${fragment}」`);
  }
});

Then('失敗原因代碼為 {string}', (code: string) => {
  const r = world.result;
  assert.ok(r && !r.ok, '預期失敗結果');
  assert.ok(r.reason.startsWith(`${code}:`), `原因「${r.reason}」代碼不是 ${code}`);
});
