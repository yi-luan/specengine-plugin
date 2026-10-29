import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrder, pay, ship, cancel, refund, type Order } from '../src/order.ts';

const mk = (status: Order['status'], amount: number, paid: number, refunded: number): Order =>
  ({ id: 'o1', status, amount, paidAmount: paid, refundedAmount: refunded });
const okOrder = (r: any): Order => { assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`); return r.order; };
const rej = (r: any) => assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`);
const reason = (r: any, code: string) => { rej(r); assert.equal(r.reason, code); };

const cases: Array<[string, string, 'behaviour' | 'reason', () => void]> = [
  ['T2-01', 'base', 'behaviour', () => { const o = okOrder(createOrder('o1', 1000)); assert.equal(o.status, 'CREATED'); assert.equal(o.paidAmount, 0); assert.equal(o.refundedAmount, 0); }],
  ['T2-02', 'T-a', 'behaviour', () => rej(createOrder('o1', 0))],
  ['T2-03', 'T-a', 'reason', () => reason(createOrder('o1', -5), 'INVALID_AMOUNT')],
  ['T2-04', 'base', 'behaviour', () => { const o = okOrder(pay(mk('CREATED', 1000, 0, 0), 1000)); assert.equal(o.status, 'PAID'); assert.equal(o.paidAmount, 1000); }],
  ['T2-05', 'H8', 'behaviour', () => rej(pay(mk('CREATED', 1000, 0, 0), 999))],
  ['T2-06', 'H8', 'behaviour', () => rej(pay(mk('CREATED', 1000, 0, 0), 1001))],
  ['T2-07', 'H8', 'reason', () => reason(pay(mk('CREATED', 1000, 0, 0), 500), 'AMOUNT_MISMATCH')],
  ['T2-08', 'base', 'behaviour', () => { const o = okOrder(ship(mk('PAID', 1000, 1000, 0))); assert.equal(o.status, 'SHIPPED'); }],
  ['T2-09', 'H11', 'behaviour', () => rej(ship(mk('CREATED', 1000, 0, 0)))],
  ['T2-10', 'T-b', 'behaviour', () => { const o = okOrder(cancel(mk('CREATED', 1000, 0, 0))); assert.equal(o.status, 'CANCELLED'); assert.equal(o.refundedAmount, 0); }],
  ['T2-11', 'T-c', 'behaviour', () => { const o = okOrder(cancel(mk('PAID', 1000, 1000, 0))); assert.equal(o.status, 'CANCELLED'); assert.equal(o.refundedAmount, 1000); }],
  ['T2-12', 'H1', 'behaviour', () => rej(cancel(mk('SHIPPED', 1000, 1000, 0)))],
  ['T2-13', 'H1', 'reason', () => reason(cancel(mk('SHIPPED', 1000, 1000, 0)), 'INVALID_TRANSITION')],
  ['T2-14', 'H2', 'behaviour', () => rej(pay(mk('CANCELLED', 1000, 0, 0), 1000))],
  ['T2-15', 'H2', 'behaviour', () => rej(ship(mk('CANCELLED', 1000, 1000, 1000)))],
  ['T2-16', 'H2', 'reason', () => reason(cancel(mk('CANCELLED', 1000, 0, 0)), 'INVALID_TRANSITION')],
  ['T2-17', 'H4', 'behaviour', () => rej(refund(mk('PAID', 1000, 1000, 0), 100))],
  ['T2-18', 'H4', 'reason', () => reason(refund(mk('PAID', 1000, 1000, 0), 100), 'INVALID_TRANSITION')],
  ['T2-19', 'H5', 'behaviour', () => { const o = okOrder(refund(mk('SHIPPED', 1000, 1000, 0), 300)); assert.equal(o.status, 'SHIPPED'); assert.equal(o.refundedAmount, 300); }],
  ['T2-20', 'T-b', 'behaviour', () => { const o = okOrder(refund(mk('SHIPPED', 1000, 1000, 300), 700)); assert.equal(o.status, 'REFUNDED'); assert.equal(o.refundedAmount, 1000); }],
  ['T2-21', 'base', 'behaviour', () => { const o = okOrder(refund(mk('SHIPPED', 1000, 1000, 0), 1000)); assert.equal(o.status, 'REFUNDED'); }],
  ['T2-22', 'H7', 'behaviour', () => rej(refund(mk('SHIPPED', 1000, 1000, 300), 701))],
  ['T2-23', 'H7', 'reason', () => reason(refund(mk('SHIPPED', 1000, 1000, 300), 701), 'REFUND_EXCEEDS_PAID')],
  ['T2-24', 'H6', 'behaviour', () => rej(refund(mk('SHIPPED', 1000, 1000, 0), 0))],
  ['T2-25', 'H6', 'reason', () => reason(refund(mk('SHIPPED', 1000, 1000, 0), -1), 'INVALID_AMOUNT')],
  ['T2-26', 'H9', 'behaviour', () => rej(refund(mk('REFUNDED', 1000, 1000, 1000), 1))],
  ['T2-27', 'H9', 'reason', () => reason(ship(mk('REFUNDED', 1000, 1000, 1000)), 'INVALID_TRANSITION')],
  ['T2-28', 'H9', 'reason', () => reason(cancel(mk('REFUNDED', 1000, 1000, 1000)), 'INVALID_TRANSITION')],
  ['T2-29', 'H10', 'reason', () => reason(refund(mk('PAID', 1000, 1000, 0), -1), 'INVALID_TRANSITION')],
  ['T2-30', 'H10', 'reason', () => reason(pay(mk('SHIPPED', 1000, 1000, 0), 5), 'INVALID_TRANSITION')],
  ['T2-31', 'H11', 'reason', () => reason(ship(mk('CREATED', 1000, 0, 0)), 'INVALID_TRANSITION')],
  ['T2-32', 'base', 'behaviour', () => { const src = mk('SHIPPED', 1000, 1000, 0); okOrder(refund(src, 100)); assert.equal(src.refundedAmount, 0, 'must not mutate input'); }],
];
for (const [id, hole, kind, fn] of cases) test(`${id} [${hole}] [${kind}]`, fn);
