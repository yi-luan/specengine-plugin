import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCoupons, type Coupon } from '../src/coupon.ts';

const NOW = '2026-06-15T12:00:00Z';
const c = (p: Partial<Coupon> & { code: string; type: 'PERCENT' | 'FIXED'; value: number }): Coupon => ({
  tenantId: 't1', validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z', stackable: false, ...p,
});
const run = (orderAmount: number, coupons: Coupon[], now = NOW, tenantId = 't1') =>
  applyCoupons({ tenantId, orderAmount, coupons, now });
const ok = (r: any, finalAmount: number, discount: number, applied: string[]) => {
  assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`);
  assert.equal(r.finalAmount, finalAmount); assert.equal(r.discount, discount); assert.deepEqual(r.applied, applied);
};
const rej = (r: any) => assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`);
const reason = (r: any, code: string) => { rej(r); assert.equal(r.reason, code); };

const P10 = c({ code: 'P10', type: 'PERCENT', value: 10, stackable: true });
const P15 = c({ code: 'P15', type: 'PERCENT', value: 15, stackable: true });
const F50 = c({ code: 'F50', type: 'FIXED', value: 50, stackable: true });
const F100 = c({ code: 'F100', type: 'FIXED', value: 100, stackable: true });
const P20X = c({ code: 'P20X', type: 'PERCENT', value: 20, stackable: false });
const F30X = c({ code: 'F30X', type: 'FIXED', value: 30, stackable: false });

const cases: Array<[string, string, 'behaviour' | 'reason', () => void]> = [
  ['T3-01', 'base', 'behaviour', () => ok(run(1000, [P10]), 900, 100, ['P10'])],
  ['T3-02', 'base', 'behaviour', () => ok(run(1000, [F50]), 950, 50, ['F50'])],
  ['T3-03', 'T-b', 'behaviour', () => ok(run(1000, [P20X]), 800, 200, ['P20X'])],
  ['T3-04', 'H10', 'behaviour', () => ok(run(1000, []), 1000, 0, [])],
  ['T3-05', 'H6', 'behaviour', () => ok(run(1000, [P10, F50]), 850, 150, ['P10', 'F50'])],
  ['T3-06', 'T-a', 'behaviour', () => ok(run(1000, [P10, P15]), 750, 250, ['P10', 'P15'])],
  ['T3-07', 'T-c', 'behaviour', () => ok(run(1000, [F50, P10]), 850, 150, ['F50', 'P10'])],
  ['T3-08', 'H7', 'behaviour', () => ok(run(999, [P10]), 900, 99, ['P10'])],
  ['T3-09', 'H7', 'behaviour', () => ok(run(333, [P10, P15]), 251, 82, ['P10', 'P15'])],
  ['T3-10', 'H4', 'behaviour', () => rej(run(1000, [P20X, F30X]))],
  ['T3-11', 'H4', 'reason', () => reason(run(1000, [P20X, F30X]), 'NOT_STACKABLE')],
  ['T3-12', 'H5', 'behaviour', () => rej(run(1000, [P20X, P10]))],
  ['T3-13', 'H5', 'reason', () => reason(run(1000, [P10, F30X]), 'NOT_STACKABLE')],
  ['T3-14', 'H1', 'behaviour', () => rej(run(1000, [P10, c({ code: 'OTHER', type: 'FIXED', value: 10, tenantId: 't2', stackable: true })]))],
  ['T3-15', 'H1', 'reason', () => reason(run(1000, [c({ code: 'OTHER', type: 'FIXED', value: 10, tenantId: 't2' })]), 'TENANT_MISMATCH')],
  ['T3-16', 'H2', 'behaviour', () => rej(run(1000, [P10], '2027-01-01T00:00:00Z'))],
  ['T3-17', 'H2', 'reason', () => reason(run(1000, [P10], '2025-12-31T23:59:59Z'), 'COUPON_EXPIRED')],
  ['T3-18', 'H3', 'behaviour', () => ok(run(1000, [P10], '2026-01-01T00:00:00Z'), 900, 100, ['P10'])],
  ['T3-19', 'H3', 'behaviour', () => ok(run(1000, [P10], '2026-12-31T23:59:59Z'), 900, 100, ['P10'])],
  ['T3-20', 'H9', 'behaviour', () => ok(run(500, [c({ code: 'M500', type: 'FIXED', value: 20, minOrderAmount: 500 })]), 480, 20, ['M500'])],
  ['T3-21', 'H9', 'behaviour', () => rej(run(499, [c({ code: 'M500', type: 'FIXED', value: 20, minOrderAmount: 500 })]))],
  ['T3-22', 'H9', 'reason', () => reason(run(499, [c({ code: 'M500', type: 'FIXED', value: 20, minOrderAmount: 500 })]), 'MIN_ORDER_NOT_MET')],
  ['T3-23', 'H9', 'behaviour', () => ok(run(1000, [c({ code: 'P50', type: 'PERCENT', value: 50, stackable: true }), c({ code: 'M600', type: 'FIXED', value: 10, stackable: true, minOrderAmount: 600 })]), 490, 510, ['P50', 'M600'])],
  ['T3-24', 'H8', 'behaviour', () => rej(run(100, [F100, F50]))],
  ['T3-25', 'H8', 'reason', () => reason(run(100, [F100, F50]), 'DISCOUNT_EXCEEDS_AMOUNT')],
  ['T3-26', 'H8', 'behaviour', () => ok(run(100, [F100]), 0, 100, ['F100'])],
  ['T3-27', 'H11', 'behaviour', () => rej(run(1000, [P10, P10]))],
  ['T3-28', 'H11', 'reason', () => reason(run(1000, [F50, F50]), 'DUPLICATE_COUPON')],
  ['T3-29', 'H12', 'behaviour', () => rej(run(0, [P10]))],
  ['T3-30', 'H12', 'reason', () => reason(run(-1, []), 'INVALID_INPUT')],
  ['T3-31', 'H12', 'reason', () => reason(run(100.5, [P10]), 'INVALID_INPUT')],
  ['T3-32', 'H13', 'behaviour', () => rej(run(1000, [c({ code: 'P0', type: 'PERCENT', value: 0 })]))],
  ['T3-33', 'H13', 'reason', () => reason(run(1000, [c({ code: 'P101', type: 'PERCENT', value: 101 })]), 'INVALID_COUPON')],
  ['T3-34', 'H13', 'reason', () => reason(run(1000, [c({ code: 'F0', type: 'FIXED', value: 0 })]), 'INVALID_COUPON')],
  ['T3-35', 'H14', 'reason', () => reason(run(1000, [c({ code: 'X', type: 'FIXED', value: 10, tenantId: 't2', validFrom: '2019-01-01T00:00:00Z', validTo: '2020-01-01T00:00:00Z' })]), 'TENANT_MISMATCH')],
  ['T3-36', 'H14', 'reason', () => reason(run(1000, [c({ code: 'E', type: 'FIXED', value: 10, validFrom: '2019-01-01T00:00:00Z', validTo: '2020-01-01T00:00:00Z', minOrderAmount: 5000 })]), 'COUPON_EXPIRED')],
  ['T3-37', 'H14', 'reason', () => reason(run(1000, [P20X, c({ code: 'M', type: 'FIXED', value: 10, minOrderAmount: 5000 })]), 'MIN_ORDER_NOT_MET')],
  ['T3-38', 'H14', 'reason', () => reason(run(0, [c({ code: 'X', type: 'FIXED', value: 10, tenantId: 't2' })]), 'INVALID_INPUT')],
];
for (const [id, hole, kind, fn] of cases) test(`${id} [${hole}] [${kind}]`, fn);
