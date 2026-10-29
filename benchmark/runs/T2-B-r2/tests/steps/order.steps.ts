import { Given, When, Then, defineParameterType } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  createOrder,
  pay,
  ship,
  cancel,
  refund,
  type Order,
  type OrderResult,
  type OrderStatus,
} from '../../src/order.js';
import type { OrderWorld } from '../support/world.js';

// Amounts in scenarios may be integers, fractions, negatives, NaN or Infinity.
defineParameterType({
  name: 'amount',
  regexp: /-?\d+(?:\.\d+)?|NaN|-?Infinity/,
  transformer: (s: string) => Number(s),
});

function unwrap(result: OrderResult, context: string): Order {
  assert.equal(result.ok, true, `${context}: expected success but got ${JSON.stringify(result)}`);
  return (result as { ok: true; order: Order }).order;
}

/** Runs one operation against the current order, recording input/snapshot/result. */
function act(world: OrderWorld, operation: (order: Order) => OrderResult): void {
  assert.ok(world.order, 'no current order in this scenario');
  world.input = world.order;
  world.snapshot = structuredClone(world.order);
  world.result = operation(world.order);
  if (world.result.ok) {
    world.order = world.result.order;
  }
}

// ---------- Given ----------

Given(
  'an order {string} with amount {int} in status {word}',
  function (this: OrderWorld, id: string, amount: number, status: string) {
    const target = status as OrderStatus;
    let order = unwrap(createOrder(id, amount), 'createOrder');
    if (target !== 'CREATED') {
      order = unwrap(pay(order, amount), 'pay');
    }
    if (target === 'SHIPPED' || target === 'REFUNDED') {
      order = unwrap(ship(order), 'ship');
    }
    if (target === 'CANCELLED') {
      order = unwrap(cancel(order), 'cancel');
    }
    if (target === 'REFUNDED') {
      order = unwrap(refund(order, amount), 'refund');
    }
    assert.equal(order.status, target, `fixture did not reach status ${status}`);
    this.order = order;
  },
);

Given('it already has {int} refunded', function (this: OrderWorld, amount: number) {
  assert.ok(this.order, 'no current order in this scenario');
  this.order = unwrap(refund(this.order, amount), 'refund (fixture)');
});

// ---------- When ----------

When(
  'I create an order {string} with amount {amount}',
  function (this: OrderWorld, id: string, amount: number) {
    this.input = null;
    this.snapshot = null;
    this.result = createOrder(id, amount);
    if (this.result.ok) {
      this.order = this.result.order;
    }
  },
);

When('I pay {amount}', function (this: OrderWorld, amount: number) {
  act(this, (order) => pay(order, amount));
});

When('I ship the order', function (this: OrderWorld) {
  act(this, (order) => ship(order));
});

When('I cancel the order', function (this: OrderWorld) {
  act(this, (order) => cancel(order));
});

When('I refund {amount}', function (this: OrderWorld, amount: number) {
  act(this, (order) => refund(order, amount));
});

// ---------- Then ----------

Then('the operation succeeds', function (this: OrderWorld) {
  assert.ok(this.result, 'no operation was performed');
  assert.equal(this.result.ok, true, `expected success but got ${JSON.stringify(this.result)}`);
});

Then('the operation fails with reason {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.result, 'no operation was performed');
  assert.equal(this.result.ok, false, `expected failure but got ${JSON.stringify(this.result)}`);
  assert.equal((this.result as { ok: false; reason: string }).reason, reason);
});

Then('the order status is {word}', function (this: OrderWorld, status: string) {
  assert.ok(this.order, 'no current order');
  assert.equal(this.order.status, status);
});

Then('the order amount is {int}', function (this: OrderWorld, amount: number) {
  assert.ok(this.order, 'no current order');
  assert.equal(this.order.amount, amount);
});

Then('the paid amount is {int}', function (this: OrderWorld, amount: number) {
  assert.ok(this.order, 'no current order');
  assert.equal(this.order.paidAmount, amount);
});

Then('the refunded amount is {int}', function (this: OrderWorld, amount: number) {
  assert.ok(this.order, 'no current order');
  assert.equal(this.order.refundedAmount, amount);
});

Then('the input order is unchanged', function (this: OrderWorld) {
  assert.ok(this.input && this.snapshot, 'no input order was recorded');
  assert.deepEqual(this.input, this.snapshot, 'the input order was mutated');
});

Then('the returned order is a new object', function (this: OrderWorld) {
  assert.ok(this.result && this.result.ok, 'last operation did not succeed');
  assert.notEqual(this.result.order, this.input, 'the returned order is the same object as the input');
});
