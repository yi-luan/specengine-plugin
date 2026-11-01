import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createPaymentService } from '../../src/payment.js';
import type { Event } from '../../src/events.js';
import type { PaymentWorld } from '../support/world.js';

// ---------- helpers ----------

/** Fabricate an inbound event of a type that carries only an order id (plus dummy fields). */
function makeEvent(world: PaymentWorld, type: string, orderId: string): Event {
  const id = world.nextId('in');
  switch (type) {
    case 'StockReserved':
      return { id, type: 'StockReserved', orderId };
    case 'StockRejected':
      return { id, type: 'StockRejected', orderId };
    case 'StockReleased':
      return { id, type: 'StockReleased', orderId };
    case 'OrderCancelled':
      return { id, type: 'OrderCancelled', orderId };
    case 'PaymentFailed':
      return { id, type: 'PaymentFailed', orderId };
    case 'PaymentSucceeded':
      return { id, type: 'PaymentSucceeded', orderId, amount: 1 };
    case 'PaymentRefunded':
      return { id, type: 'PaymentRefunded', orderId, amount: 1 };
    default:
      throw new Error(`unknown inbound event type in step: ${type}`);
  }
}

function emittedFor(world: PaymentWorld, type: string, orderId: string): Event[] {
  return world.lastEvents.filter((e) => e.type === type && e.orderId === orderId);
}

// ---------- Given ----------

Given('a payment service with balances:', function (this: PaymentWorld, table: DataTable) {
  const balances: Record<string, number> = {};
  for (const row of table.hashes()) balances[row.customer] = Number(row.balance);
  this.service = createPaymentService(balances);
});

Given('a payment service with no customers', function (this: PaymentWorld) {
  this.service = createPaymentService({});
});

// ---------- When ----------

When(
  'the service receives OrderPlaced for order {string} by customer {string} amount {int}',
  function (this: PaymentWorld, orderId: string, customerId: string, amount: number) {
    this.send({
      id: this.nextId('in'),
      type: 'OrderPlaced',
      orderId,
      customerId,
      sku: 'sku-1',
      qty: 1,
      amount,
      at: '2026-06-15T12:00:00Z',
    });
  },
);

When('the service receives {word} for order {string}', function (this: PaymentWorld, type: string, orderId: string) {
  this.send(makeEvent(this, type, orderId));
});

When(
  'the same {word} event for order {string} is delivered again',
  function (this: PaymentWorld, type: string, orderId: string) {
    const original = this.lastInbound(type as Event['type'], orderId);
    if (!original) throw new Error(`no earlier ${type} for order ${orderId} to redeliver`);
    this.send(original);
  },
);

// ---------- Then ----------

Then('no event is emitted', function (this: PaymentWorld) {
  assert.deepEqual(this.lastEvents, []);
});

Then('exactly one {word} is emitted for order {string}', function (this: PaymentWorld, type: string, orderId: string) {
  assert.equal(this.lastEvents.length, 1, `expected exactly one event, got ${JSON.stringify(this.lastEvents)}`);
  assert.equal(emittedFor(this, type, orderId).length, 1, `expected a ${type} for ${orderId}, got ${JSON.stringify(this.lastEvents)}`);
});

Then(
  'exactly one {word} is emitted for order {string} with amount {int}',
  function (this: PaymentWorld, type: string, orderId: string, amount: number) {
    assert.equal(this.lastEvents.length, 1, `expected exactly one event, got ${JSON.stringify(this.lastEvents)}`);
    const matches = emittedFor(this, type, orderId);
    assert.equal(matches.length, 1, `expected a ${type} for ${orderId}, got ${JSON.stringify(this.lastEvents)}`);
    const e = matches[0];
    assert.ok('amount' in e, `${type} carries no amount`);
    assert.equal(e.amount, amount);
  },
);

Then('customer {string} now has balance {int}', function (this: PaymentWorld, customerId: string, balance: number) {
  if (!this.service) throw new Error('payment service has not been created in this scenario');
  assert.equal(this.service.getBalance(customerId), balance);
});

Then('{int} events were emitted in total for order {string}', function (this: PaymentWorld, count: number, orderId: string) {
  const forOrder = this.allEvents.filter((e) => e.orderId === orderId);
  assert.equal(forOrder.length, count, `events for ${orderId}: ${JSON.stringify(forOrder)}`);
});

Then('all emitted event ids are unique', function (this: PaymentWorld) {
  const ids = this.allEvents.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids among ${JSON.stringify(ids)}`);
  for (const id of ids) assert.ok(id.length > 0, 'empty event id');
});
