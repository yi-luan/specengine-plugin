import assert from 'node:assert/strict';
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import { createInventoryService, createPaymentService, type Event, type OrderStatus } from '../../src/shop.js';
import type { ServiceName, ShopWorld } from '../support/world.js';

type EventType = Event['type'];

function toServiceName(raw: string): ServiceName {
  if (raw === 'order' || raw === 'inventory' || raw === 'payment') return raw;
  throw new Error(`unknown service: ${raw}`);
}

/** 造一個合成事件（用來驗證服務對不關心 / 不認識的事件的反應）。 */
function syntheticEvent(type: EventType, orderId: string): Event {
  const id = `test-${type}-${orderId}-${Math.random().toString(36).slice(2)}`;
  switch (type) {
    case 'OrderPlaced':
      return { id, type, orderId, customerId: 'ghost', sku: 'SKU-A', qty: 1, amount: 1, at: '2026-01-01T00:00:00Z' };
    case 'PaymentSucceeded':
    case 'PaymentRefunded':
      return { id, type, orderId, amount: 1 };
    default:
      return { id, type, orderId };
  }
}

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('inventory stock:', function (this: ShopWorld, table: DataTable) {
  const stock: Record<string, number> = {};
  for (const row of table.hashes()) stock[row.sku] = Number(row.qty);
  this.inventory = createInventoryService(stock);
});

Given('customer balances:', function (this: ShopWorld, table: DataTable) {
  const balances: Record<string, number> = {};
  for (const row of table.hashes()) balances[row.customerId] = Number(row.balance);
  this.payment = createPaymentService(balances);
});

// ---------------------------------------------------------------------------
// When：指令
// ---------------------------------------------------------------------------

When(
  'customer {string} places order {string} for {float} of {string} at {float} on {string}',
  function (this: ShopWorld, customerId: string, orderId: string, qty: number, sku: string, amount: number, at: string) {
    this.lastResult = this.order.placeOrder({ orderId, customerId, sku, qty, amount, at });
    if (this.lastResult.ok) this.publish(this.lastResult.events);
  },
);

When('customer cancels order {string} at {string}', function (this: ShopWorld, orderId: string, at: string) {
  this.lastResult = this.order.cancelOrder(orderId, at);
  if (this.lastResult.ok) this.publish(this.lastResult.events);
});

When('time advances to {string}', function (this: ShopWorld, now: string) {
  this.lastHandleOutput = this.order.tick(now);
  this.publish(this.lastHandleOutput);
});

// ---------------------------------------------------------------------------
// When：事件送達
// ---------------------------------------------------------------------------

When('all pending events are delivered', function (this: ShopWorld) {
  this.drain(1);
});

When('all pending events are delivered twice', function (this: ShopWorld) {
  this.drain(2);
});

When('all pending events are delivered in reverse order', function (this: ShopWorld) {
  this.drainReversed();
});

When(
  'the {word} service receives the {string} event for order {string}',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    const event = this.findEvent(type as EventType, orderId);
    this.lastHandleOutput = this.deliverTo(toServiceName(service), event);
  },
);

When(
  'the {word} service handles a {string} event for order {string}',
  function (this: ShopWorld, service: string, type: string, orderId: string) {
    this.lastHandleOutput = this.deliverTo(toServiceName(service), syntheticEvent(type as EventType, orderId));
  },
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the command succeeds', function (this: ShopWorld) {
  assert.ok(this.lastResult, 'no command was issued');
  assert.equal(this.lastResult.ok, true, `command failed: ${JSON.stringify(this.lastResult)}`);
});

Then('the command fails', function (this: ShopWorld) {
  assert.ok(this.lastResult, 'no command was issued');
  assert.equal(this.lastResult.ok, false, 'expected the command to fail');
  if (!this.lastResult.ok) assert.ok(this.lastResult.reason.length > 0, 'failure reason must be non-empty');
});

Then('the command emits exactly {int} {string} event(s)', function (this: ShopWorld, count: number, type: string) {
  assert.ok(this.lastResult && this.lastResult.ok, 'expected a successful command');
  const events = this.lastResult.events;
  assert.equal(events.length, count);
  for (const event of events) assert.equal(event.type, type);
});

Then('the tick emits exactly {int} {string} event(s)', function (this: ShopWorld, count: number, type: string) {
  assert.equal(this.lastHandleOutput.length, count);
  for (const event of this.lastHandleOutput) assert.equal(event.type, type);
});

Then('the handle output is empty', function (this: ShopWorld) {
  assert.deepEqual(this.lastHandleOutput, []);
});

Then('order {string} has status {string}', function (this: ShopWorld, orderId: string, status: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `order ${orderId} not found`);
  assert.equal(order.status, status as OrderStatus);
});

Then(
  'order {string} has status {string} with cancel reason {string}',
  function (this: ShopWorld, orderId: string, status: string, reason: string) {
    const order = this.order.getOrder(orderId);
    assert.ok(order, `order ${orderId} not found`);
    assert.equal(order.status, status as OrderStatus);
    assert.equal(order.cancelReason, reason);
  },
);

Then('order {string} does not exist', function (this: ShopWorld, orderId: string) {
  assert.equal(this.order.getOrder(orderId), undefined);
});

Then('available stock of {string} is {int}', function (this: ShopWorld, sku: string, qty: number) {
  assert.equal(this.inventory.getAvailable(sku), qty);
});

Then('balance of {string} is {int}', function (this: ShopWorld, customerId: string, amount: number) {
  assert.equal(this.payment.getBalance(customerId), amount);
});

Then(
  '{int} {string} event(s) for order {string} was/were emitted',
  function (this: ShopWorld, count: number, type: string, orderId: string) {
    assert.equal(this.countEvents(type as EventType, orderId), count);
  },
);

Then(
  '{int} {string} event(s) for order {string} was/were emitted with amount {int}',
  function (this: ShopWorld, count: number, type: string, orderId: string, amount: number) {
    const events = this.emitted.filter((e) => e.type === type && e.orderId === orderId);
    assert.equal(events.length, count);
    for (const event of events) {
      assert.ok('amount' in event, `${type} event has no amount`);
      assert.equal(event.amount, amount);
    }
  },
);

Then('all emitted event ids are unique', function (this: ShopWorld) {
  const ids = this.emitted.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate event ids found');
  for (const id of ids) assert.ok(typeof id === 'string' && id.length > 0);
});

Then('at least {int} events were emitted', function (this: ShopWorld, count: number) {
  assert.ok(this.emitted.length >= count, `only ${this.emitted.length} events emitted`);
});
