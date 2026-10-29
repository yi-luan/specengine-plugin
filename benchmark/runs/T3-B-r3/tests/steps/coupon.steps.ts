import { Before, Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type ApplyInput, type ApplyResult } from '../../src/coupon.js';

type CouponWorld = {
  tenantId: unknown;
  orderAmount: unknown;
  now: unknown;
  coupons: unknown;
  snapshot?: string;
  input?: ApplyInput;
  result?: ApplyResult;
};

const DEFAULT_NOW = '2026-06-15T00:00:00Z';

function parseCell(column: string, raw: string): unknown {
  if (column === 'stackable') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw;
  }
  if (column === 'value' || column === 'minOrderAmount') {
    const n = Number(raw);
    return raw.trim() !== '' && !Number.isNaN(n) ? n : raw;
  }
  return raw;
}

function rowsToCoupons(table: DataTable): Record<string, unknown>[] {
  return table.hashes().map((row) => {
    const coupon: Record<string, unknown> = {
      tenantId: 'T1',
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      stackable: true,
    };
    for (const [column, raw] of Object.entries(row)) {
      if (column === 'minOrderAmount' && raw === '') continue;
      coupon[column] = parseCell(column, raw);
    }
    return coupon;
  });
}

Before(function (this: CouponWorld) {
  this.tenantId = 'T1';
  this.orderAmount = 0;
  this.now = DEFAULT_NOW;
  this.coupons = [];
  this.snapshot = undefined;
  this.input = undefined;
  this.result = undefined;
});

Given('租戶 {string} 的訂單金額為 {int} 元', function (this: CouponWorld, tenantId: string, amount: number) {
  this.tenantId = tenantId;
  this.orderAmount = amount;
});

Given('訂單金額的原始值為 {string}', function (this: CouponWorld, json: string) {
  this.orderAmount = JSON.parse(json);
});

Given('租戶的原始值為 {string}', function (this: CouponWorld, json: string) {
  this.tenantId = JSON.parse(json);
});

Given('優惠券清單的原始值為 {string}', function (this: CouponWorld, json: string) {
  this.coupons = JSON.parse(json);
});

Given('結帳時間為 {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

Given('結帳帶入以下優惠券:', function (this: CouponWorld, table: DataTable) {
  this.coupons = rowsToCoupons(table);
});

When('結帳套用優惠券', function (this: CouponWorld) {
  const input = {
    tenantId: this.tenantId,
    orderAmount: this.orderAmount,
    coupons: this.coupons,
    now: this.now,
  } as unknown as ApplyInput;
  this.input = input;
  this.snapshot = JSON.stringify(input);
  this.result = applyCoupons(input);
});

Then(
  '套用成功，折扣後金額 {int}、折扣 {int}、套用代碼 {string}',
  function (this: CouponWorld, finalAmount: number, discount: number, codes: string) {
    const applied = codes === '' ? [] : codes.split(',').map((c) => c.trim());
    assert.deepEqual(this.result, { ok: true, finalAmount, discount, applied });
  },
);

Then('套用失敗，原因為 {string}', function (this: CouponWorld, reason: string) {
  assert.deepEqual(this.result, { ok: false, reason });
});

Then('輸入資料未被修改', function (this: CouponWorld) {
  assert.equal(JSON.stringify(this.input), this.snapshot);
});
