import { Before, Given, Then, When, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type ApplyResult, type Coupon } from '../../src/coupon.js';

type State = {
  tenantId: string;
  orderAmount: number;
  now: string;
  coupons: Coupon[];
  result?: ApplyResult;
};

let state: State;

Before(() => {
  state = {
    tenantId: 'T1',
    orderAmount: 1000,
    now: '2026-06-01T00:00:00Z',
    coupons: [],
  };
});

function requireResult(): ApplyResult {
  assert.ok(state.result, '尚未執行 套用優惠券');
  return state.result;
}

function requireOk(): Extract<ApplyResult, { ok: true }> {
  const r = requireResult();
  assert.equal(r.ok, true, `預期成功，實際失敗: ${JSON.stringify(r)}`);
  return r as Extract<ApplyResult, { ok: true }>;
}

function parseCodes(s: string): string[] {
  return s === '' ? [] : s.split(',');
}

Given(
  '訂單所屬租戶為 {string}，訂單金額為 {float} 元，結帳時間為 {string}',
  (tenantId: string, orderAmount: number, now: string) => {
    state.tenantId = tenantId;
    state.orderAmount = orderAmount;
    state.now = now;
  },
);

Given('訂單金額為 {float} 元', (orderAmount: number) => {
  state.orderAmount = orderAmount;
});

Given('結帳時間為 {string}', (now: string) => {
  state.now = now;
});

Given('下列優惠券:', (table: DataTable) => {
  state.coupons = table.hashes().map((row) => {
    const coupon: Coupon = {
      tenantId: row.tenantId,
      code: row.code,
      type: row.type as Coupon['type'],
      value: Number(row.value),
      validFrom: row.validFrom,
      validTo: row.validTo,
      stackable: row.stackable === 'true',
    };
    if (row.minOrderAmount !== undefined && row.minOrderAmount !== '') {
      coupon.minOrderAmount = Number(row.minOrderAmount);
    }
    return coupon;
  });
});

When('套用優惠券 {string}', (codes: string) => {
  // 依代碼順序挑出優惠券；同代碼的多筆定義會逐一取用（用於重複代碼情境）
  const pool = [...state.coupons];
  const selected = parseCodes(codes).map((code) => {
    const i = pool.findIndex((x) => x.code === code);
    assert.ok(i >= 0, `找不到優惠券 ${code}`);
    return pool.splice(i, 1)[0];
  });
  state.result = applyCoupons({
    tenantId: state.tenantId,
    orderAmount: state.orderAmount,
    coupons: selected,
    now: state.now,
  });
});

Then('折扣後金額為 {int}', (expected: number) => {
  assert.equal(requireOk().finalAmount, expected);
});

Then('折扣總額為 {int}', (expected: number) => {
  assert.equal(requireOk().discount, expected);
});

Then('實際套用的優惠券為 {string}', (codes: string) => {
  assert.deepEqual(requireOk().applied, parseCodes(codes));
});

Then('套用失敗，原因為 {string}', (reason: string) => {
  const r = requireResult();
  assert.equal(r.ok, false, `預期失敗，實際成功: ${JSON.stringify(r)}`);
  assert.equal((r as { reason: string }).reason, reason);
});
