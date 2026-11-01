import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Event, PlaceOrderInput } from '../../src/events.js';
import type { OrderWorld } from '../support/world.js';

const DEFAULTS = { customerId: 'C1', sku: 'A', qty: 2, amount: 100 };

function toInput(row: Record<string, string>): PlaceOrderInput {
  return {
    orderId: row.orderId ?? '',
    customerId: row.customerId ?? '',
    sku: row.sku ?? '',
    qty: Number(row.qty),
    amount: Number(row.amount),
    at: row.at ?? '',
  };
}

function place(world: OrderWorld, input: PlaceOrderInput): void {
  const result = world.service.placeOrder(input);
  world.lastResult = result;
  world.record(result.ok ? result.events : []);
}

function receive(world: OrderWorld, type: Event['type'], orderId: string, extra?: Record<string, unknown>): void {
  const event = world.makeEvent(type, orderId, extra);
  world.lastReceived = event;
  world.record(world.service.handle(event));
}

function cancel(world: OrderWorld, orderId: string, at: string): void {
  const result = world.service.cancelOrder(orderId, at);
  world.lastResult = result;
  world.record(result.ok ? result.events : []);
}

function tick(world: OrderWorld, now: string): void {
  world.record(world.service.tick(now));
}

// ---------- Given ----------

Given('no orders exist', function (this: OrderWorld) {
  // 每個情境都有全新的服務實例；無需動作。
});

Given('order {string} was placed at {string}', function (this: OrderWorld, orderId: string, at: string) {
  place(this, { orderId, at, ...DEFAULTS });
  assert.equal(this.lastResult?.ok, true, 'setup placeOrder should succeed');
});

Given(
  'order {string} was placed at {string} and received {word}',
  function (this: OrderWorld, orderId: string, at: string, type: Event['type']) {
    place(this, { orderId, at, ...DEFAULTS });
    assert.equal(this.lastResult?.ok, true, 'setup placeOrder should succeed');
    receive(this, type, orderId);
  },
);

// ---------- When（也用於 Given/And 的前置動作）----------

When('the customer places order:', function (this: OrderWorld, table: DataTable) {
  const rows = table.hashes();
  assert.equal(rows.length, 1, 'expected exactly one order row');
  place(this, toInput(rows[0]!));
});

When('the customer places order {string} again', function (this: OrderWorld, orderId: string) {
  place(this, { orderId, at: '2026-06-15T12:00:00Z', ...DEFAULTS });
});

When('the service receives {word} for order {string}', function (this: OrderWorld, type: Event['type'], orderId: string) {
  receive(this, type, orderId);
});

When(
  'the service receives {word} for order {string} with amount {int}',
  function (this: OrderWorld, type: Event['type'], orderId: string, amount: number) {
    receive(this, type, orderId, { amount });
  },
);

When('the service receives the same event again', function (this: OrderWorld) {
  assert.ok(this.lastReceived, 'no previously received event');
  this.record(this.service.handle(this.lastReceived));
});

When('the customer cancels order {string} at {string}', function (this: OrderWorld, orderId: string, at: string) {
  cancel(this, orderId, at);
});

When('time advances to {string}', function (this: OrderWorld, now: string) {
  tick(this, now);
});

// ---------- Then ----------

Then('the command succeeds', function (this: OrderWorld) {
  assert.ok(this.lastResult, 'no command result recorded');
  assert.deepEqual({ ok: this.lastResult.ok }, { ok: true }, JSON.stringify(this.lastResult));
});

Then('the command fails with reason {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.lastResult, 'no command result recorded');
  assert.equal(this.lastResult.ok, false, 'expected the command to fail');
  if (!this.lastResult.ok) assert.equal(this.lastResult.reason, reason);
});

Then('order {string} has status {word}', function (this: OrderWorld, orderId: string, status: string) {
  const order = this.service.getOrder(orderId);
  assert.ok(order, `order ${orderId} should exist`);
  assert.equal(order.status, status);
  if (status !== 'CANCELLED') assert.equal(order.cancelReason, undefined, 'cancelReason should be absent');
});

Then(
  'order {string} has status {word} with cancel reason {word}',
  function (this: OrderWorld, orderId: string, status: string, reason: string) {
    const order = this.service.getOrder(orderId);
    assert.ok(order, `order ${orderId} should exist`);
    assert.deepEqual(order, { status, cancelReason: reason });
  },
);

Then('order {string} does not exist', function (this: OrderWorld, orderId: string) {
  assert.equal(this.service.getOrder(orderId), undefined);
});

Then('no events are emitted', function (this: OrderWorld) {
  assert.deepEqual(this.lastEvents, []);
});

Then('exactly one OrderPlaced event is emitted matching:', function (this: OrderWorld, table: DataTable) {
  const expected = toInput(table.hashes()[0]!);
  assert.equal(this.lastEvents.length, 1, `expected 1 event, got ${JSON.stringify(this.lastEvents)}`);
  const event = this.lastEvents[0]!;
  assert.equal(event.type, 'OrderPlaced');
  assert.ok(typeof event.id === 'string' && event.id.length > 0, 'event id must be a non-empty string');
  const { id: _id, type: _type, ...payload } = event as Extract<Event, { type: 'OrderPlaced' }>;
  assert.deepEqual(payload, expected);
});

Then(
  'exactly {int} OrderCancelled events are emitted for orders {string}',
  function (this: OrderWorld, count: number, orderIds: string) {
    const expectedIds = orderIds.split(',').map((s) => s.trim());
    assert.equal(this.lastEvents.length, count, `events: ${JSON.stringify(this.lastEvents)}`);
    assert.deepEqual(
      this.lastEvents.map((e) => ({ type: e.type, orderId: e.orderId })),
      expectedIds.map((orderId) => ({ type: 'OrderCancelled', orderId })),
    );
    for (const e of this.lastEvents) assert.ok(typeof e.id === 'string' && e.id.length > 0);
  },
);

Then('all emitted event ids are unique and start with {string}', function (this: OrderWorld, prefix: string) {
  const ids = this.allEmitted.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(',')}`);
  for (const id of ids) assert.ok(id.startsWith(prefix), `id ${id} should start with ${prefix}`);
});

Then('{int} events have been emitted in total', function (this: OrderWorld, count: number) {
  assert.equal(this.allEmitted.length, count);
});
