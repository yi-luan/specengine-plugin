import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { applyCoupons, type Coupon } from '../../src/coupon.js';
import type { CouponWorld } from '../support/world.js';

const DEFAULT_VALID_FROM = '2026-01-01T00:00:00Z';
const DEFAULT_VALID_TO = '2026-12-31T23:59:59Z';

function parseType(word: string): Coupon['type'] {
  if (word === 'PERCENT' || word === 'FIXED') return word;
  throw new Error(`Unknown coupon type "${word}"`);
}

function parseBool(word: string): boolean {
  if (word === 'true' || word === 'stackable') return true;
  if (word === 'false' || word === 'non-stackable') return false;
  throw new Error(`Unknown boolean word "${word}"`);
}

Given('the order is for tenant {string}', function (this: CouponWorld, tenantId: string) {
  this.tenantId = tenantId;
});

Given('the order amount is {float}', function (this: CouponWorld, amount: number) {
  this.orderAmount = amount;
});

Given('the checkout time is {string}', function (this: CouponWorld, now: string) {
  this.now = now;
});

// Short form: default tenant A, default validity window.
Given(
  'a {word} {word} coupon {string} with value {float}',
  function (this: CouponWorld, stackWord: string, typeWord: string, code: string, value: number) {
    this.coupons.push({
      tenantId: 'A',
      code,
      type: parseType(typeWord),
      value,
      validFrom: DEFAULT_VALID_FROM,
      validTo: DEFAULT_VALID_TO,
      stackable: parseBool(stackWord),
    });
  },
);

Given(
  'a {word} {word} coupon {string} with value {float} and minimum order {float}',
  function (
    this: CouponWorld,
    stackWord: string,
    typeWord: string,
    code: string,
    value: number,
    minOrderAmount: number,
  ) {
    this.coupons.push({
      tenantId: 'A',
      code,
      type: parseType(typeWord),
      value,
      validFrom: DEFAULT_VALID_FROM,
      validTo: DEFAULT_VALID_TO,
      stackable: parseBool(stackWord),
      minOrderAmount,
    });
  },
);

// Long form: explicit tenant and validity window.
Given(
  'a coupon {string} of tenant {string} type {word} value {float} valid from {string} to {string} stackable {word}',
  function (
    this: CouponWorld,
    code: string,
    tenantId: string,
    typeWord: string,
    value: number,
    validFrom: string,
    validTo: string,
    stackWord: string,
  ) {
    this.coupons.push({
      tenantId,
      code,
      type: parseType(typeWord),
      value,
      validFrom,
      validTo,
      stackable: parseBool(stackWord),
    });
  },
);

Given('the coupon {string} is presented again', function (this: CouponWorld, code: string) {
  const existing = this.coupons.find((c) => c.code === code);
  if (!existing) throw new Error(`No coupon "${code}" to duplicate`);
  this.coupons.push({ ...existing });
});

When('the coupons are applied', function (this: CouponWorld) {
  this.result = applyCoupons({
    tenantId: this.tenantId,
    orderAmount: this.orderAmount,
    coupons: this.coupons,
    now: this.now,
  });
});

Then(
  'the result is successful with final amount {int}, discount {int} and applied codes {string}',
  function (this: CouponWorld, finalAmount: number, discount: number, codes: string) {
    assert.ok(this.result, 'applyCoupons was not called');
    assert.deepEqual(this.result, {
      ok: true,
      finalAmount,
      discount,
      applied: codes === '' ? [] : codes.split(',').map((s) => s.trim()),
    });
  },
);

Then('the result fails with reason {string}', function (this: CouponWorld, reason: string) {
  assert.ok(this.result, 'applyCoupons was not called');
  assert.deepEqual(this.result, { ok: false, reason });
});
