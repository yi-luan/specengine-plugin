import { Before, Given, Then, When, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons } from '../../src/coupon.js';
import type { ApplyResult, Coupon } from '../../src/coupon.js';
import { DEFAULT_NOW, DEFAULT_TENANT, makeCoupon } from '../support/coupon-builders.js';

type World = {
  now: string;
  tenantId: string;
  orderAmount: number;
  coupons: Coupon[];
  result: ApplyResult | undefined;
};

const world: World = {
  now: DEFAULT_NOW,
  tenantId: DEFAULT_TENANT,
  orderAmount: 1000,
  coupons: [],
  result: undefined,
};

Before(() => {
  world.now = DEFAULT_NOW;
  world.tenantId = DEFAULT_TENANT;
  world.orderAmount = 1000;
  world.coupons = [];
  world.result = undefined;
});

function requireResult(): ApplyResult {
  assert.ok(world.result, '尚未執行結帳');
  return world.result;
}

function requireSuccess(): Extract<ApplyResult, { ok: true }> {
  const result = requireResult();
  assert.equal(result.ok, true, `預期成功，實際為失敗: ${JSON.stringify(result)}`);
  return result as Extract<ApplyResult, { ok: true }>;
}

Given('現在時間為 {string}', (now: string) => {
  world.now = now;
});

Given('訂單租戶為 {string}', (tenantId: string) => {
  world.tenantId = tenantId;
});

Given('訂單金額為 {int}', (orderAmount: number) => {
  world.orderAmount = orderAmount;
});

Given('提交以下優惠券:', (table: DataTable) => {
  world.coupons = table.hashes().map((row) => {
    const minOrder = row['minOrderAmount'];
    return makeCoupon({
      tenantId: row['tenant'],
      code: row['code'],
      type: row['type'] as Coupon['type'],
      value: Number(row['value']),
      validFrom: row['validFrom'],
      validTo: row['validTo'],
      stackable: row['stackable'] === 'yes',
      ...(minOrder ? { minOrderAmount: Number(minOrder) } : {}),
    });
  });
});

Given('沒有提交任何優惠券', () => {
  world.coupons = [];
});

When('執行結帳', () => {
  world.result = applyCoupons({
    tenantId: world.tenantId,
    orderAmount: world.orderAmount,
    coupons: world.coupons,
    now: world.now,
  });
});

Then('結果為成功', () => {
  requireSuccess();
});

Then('結果為失敗，原因為 {string}', (reason: string) => {
  const result = requireResult();
  assert.equal(result.ok, false, `預期失敗，實際為成功: ${JSON.stringify(result)}`);
  assert.equal((result as { reason: string }).reason, reason);
});

Then('折扣總額為 {int}', (discount: number) => {
  assert.equal(requireSuccess().discount, discount);
});

Then('折扣後金額為 {int}', (finalAmount: number) => {
  assert.equal(requireSuccess().finalAmount, finalAmount);
});

Then('套用代碼依序為 {string}', (codes: string) => {
  const expected = codes === '' ? [] : codes.split(',');
  assert.deepEqual(requireSuccess().applied, expected);
});
