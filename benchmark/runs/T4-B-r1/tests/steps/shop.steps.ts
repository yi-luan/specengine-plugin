import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Event } from '../../src/shop.js';
import type { ServiceName, ShopWorld } from '../support/world.js';

function asService(name: string): ServiceName {
  if (name === 'order' || name === 'inventory' || name === 'payment') return name;
  throw new Error(`unknown service "${name}"`);
}

function asEventType(name: string): Event['type'] {
  const types: Event['type'][] = [
    'OrderPlaced',
    'StockReserved',
    'StockRejected',
    'StockReleased',
    'PaymentSucceeded',
    'PaymentFailed',
    'PaymentRefunded',
    'OrderCancelled',
  ];
  if ((types as string[]).includes(name)) return name as Event['type'];
  throw new Error(`unknown event type "${name}"`);
}

// ---------------------------------------------------------------- seeding

Given('stock {string} is {int}', function (this: ShopWorld, sku: string, qty: number) {
  this.stock[sku] = qty;
});

Given('customer {string} has balance {int}', function (this: ShopWorld, customerId: string, balance: number) {
  this.balances[customerId] = balance;
});

// --------------------------------------------------------------- commands

When(
  '{string} places order {string} for {float} of {string} at amount {float} at {string}',
  function (this: ShopWorld, customerId: string, orderId: string, qty: number, sku: string, amount: number, at: string) {
    this.runCommand(this.order.placeOrder({ orderId, customerId, sku, qty, amount, at }));
  },
);

When(
  '{int} orders are placed by {string} for {int} of {string} at amount {int} at {string} and broadcast',
  function (this: ShopWorld, count: number, customerId: string, qty: number, sku: string, amount: number, at: string) {
    for (let i = 1; i <= count; i++) {
      this.runCommand(this.order.placeOrder({ orderId: `bulk-${i}`, customerId, sku, qty, amount, at }));
      assert.equal(this.lastResult?.ok, true, `bulk order ${i} should succeed`);
    }
    this.broadcastUntilQuiet();
  },
);

When('the customer cancels order {string} at {string}', function (this: ShopWorld, orderId: string, at: string) {
  this.runCommand(this.order.cancelOrder(orderId, at));
});

When('time advances to {string}', function (this: ShopWorld, now: string) {
  this.record(this.order.tick(now));
});

When('all emitted events are broadcast until quiet', function (this: ShopWorld) {
  this.broadcastUntilQuiet();
});

// -------------------------------------------------------- single delivery

When(
  'the {word} service handles the {string} event for {string}',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    this.deliver(asService(service), this.findEvent(asEventType(type), orderId));
  },
);

When(
  'the {word} service handles the {string} event for {string} again',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    this.deliver(asService(service), this.findEvent(asEventType(type), orderId));
  },
);

When(
  'the {word} service handles a fresh {string} event for {string}',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    this.deliver(asService(service), this.freshCopy(asEventType(type), orderId));
  },
);

When(
  'the {word} service handles a synthetic {string} event for {string}',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    this.deliver(asService(service), this.synthetic(asEventType(type), orderId));
  },
);

When(
  'the {word} service handles a synthetic {string} event for {string} with amount {int}',
  function (this: ShopWorld, service: string, type: string, orderId: string, amount: number) {
    this.deliver(asService(service), this.synthetic(asEventType(type), orderId, amount));
  },
);

// ------------------------------------------------------- command results

Then('the command succeeds', function (this: ShopWorld) {
  assert.ok(this.lastResult, 'no command has been run');
  assert.deepEqual(this.lastResult.ok, true, `expected ok:true but got ${JSON.stringify(this.lastResult)}`);
});

Then('the command fails with reason {string}', function (this: ShopWorld, reason: string) {
  assert.ok(this.lastResult, 'no command has been run');
  assert.equal(this.lastResult.ok, false, 'expected the command to fail');
  if (this.lastResult.ok === false) assert.equal(this.lastResult.reason, reason);
});

// ---------------------------------------------------------- order state

Then('order {string} has status {string}', function (this: ShopWorld, orderId: string, status: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `order ${orderId} not found`);
  assert.equal(order.status, status);
});

Then(
  'order {string} has status {string} with cancel reason {string}',
  function (this: ShopWorld, orderId: string, status: string, reason: string) {
    const order = this.order.getOrder(orderId);
    assert.ok(order, `order ${orderId} not found`);
    assert.equal(order.status, status);
    assert.equal(order.cancelReason, reason);
  },
);

Then('order {string} has no cancel reason', function (this: ShopWorld, orderId: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `order ${orderId} not found`);
  assert.equal(order.cancelReason, undefined);
  assert.equal('cancelReason' in order, false, 'cancelReason key must be absent');
});

Then('order {string} is not found', function (this: ShopWorld, orderId: string) {
  assert.equal(this.order.getOrder(orderId), undefined);
});

// ------------------------------------------------- inventory and payment

Then('available stock of {string} is {int}', function (this: ShopWorld, sku: string, qty: number) {
  assert.equal(this.inventory.getAvailable(sku), qty);
});

Then('balance of {string} is {int}', function (this: ShopWorld, customerId: string, balance: number) {
  assert.equal(this.payment.getBalance(customerId), balance);
});

// --------------------------------------------------------------- events

Then('the last call emitted no events', function (this: ShopWorld) {
  assert.deepEqual(this.lastEvents, []);
});

Then('the last call emitted {int} event(s)', function (this: ShopWorld, count: number) {
  assert.equal(this.lastEvents.length, count, `emitted: ${JSON.stringify(this.lastEvents)}`);
});

Then(
  'the last call emitted exactly one {string} event for {string}',
  function (this: ShopWorld, type: string, orderId: string) {
    assert.equal(this.lastEvents.length, 1, `emitted: ${JSON.stringify(this.lastEvents)}`);
    assert.equal(this.lastEvents[0].type, type);
    assert.equal(this.lastEvents[0].orderId, orderId);
  },
);

Then(
  'the last call emitted exactly one {string} event for {string} with amount {int}',
  function (this: ShopWorld, type: string, orderId: string, amount: number) {
    assert.equal(this.lastEvents.length, 1, `emitted: ${JSON.stringify(this.lastEvents)}`);
    const e = this.lastEvents[0];
    assert.equal(e.type, type);
    assert.equal(e.orderId, orderId);
    assert.equal('amount' in e ? e.amount : undefined, amount);
  },
);

Then(
  'the OrderPlaced event carries customer {string}, sku {string}, qty {int}, amount {int}, at {string}',
  function (this: ShopWorld, customerId: string, sku: string, qty: number, amount: number, at: string) {
    const e = this.lastEvents[0];
    assert.ok(e && e.type === 'OrderPlaced', 'last event is not OrderPlaced');
    if (e.type === 'OrderPlaced') {
      assert.equal(e.customerId, customerId);
      assert.equal(e.sku, sku);
      assert.equal(e.qty, qty);
      assert.equal(e.amount, amount);
      assert.equal(e.at, at);
      assert.equal(typeof e.id, 'string');
      assert.ok(e.id.length > 0, 'event id must not be empty');
    }
  },
);

Then(
  'exactly {int} {string} event(s) were emitted for {string}',
  function (this: ShopWorld, count: number, type: string, orderId: string) {
    assert.equal(this.countEvents(asEventType(type), orderId), count);
  },
);

Then('at least {int} events were emitted', function (this: ShopWorld, count: number) {
  assert.ok(this.allEvents.length >= count, `only ${this.allEvents.length} events emitted`);
});

Then('all emitted event ids are unique', function (this: ShopWorld) {
  const ids = this.allEvents.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate event ids found');
  for (const id of ids) assert.ok(typeof id === 'string' && id.length > 0, 'empty event id');
});
