import assert from 'node:assert/strict';
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import { createInventoryService } from '../../src/inventory.js';
import type { InventoryWorld } from '../support/world.js';
import { eventOfType, orderPlaced } from '../support/events.js';

Given('the inventory service starts with:', function (this: InventoryWorld, table: DataTable) {
  const stock: Record<string, number> = {};
  for (const row of table.hashes()) {
    stock[row.sku] = Number(row.qty);
  }
  this.service = createInventoryService(stock);
  this.emitted = [];
  this.all = [];
});

When(
  'the service handles an OrderPlaced event {string} for order {string} with sku {string} and qty {int}',
  function (this: InventoryWorld, id: string, orderId: string, sku: string, qty: number) {
    this.deliver(orderPlaced(id, orderId, sku, qty));
  },
);

When(
  'the service handles a {string} event {string} for order {string}',
  function (this: InventoryWorld, type: string, id: string, orderId: string) {
    this.deliver(eventOfType(type, id, orderId));
  },
);

When('the same event is delivered again', function (this: InventoryWorld) {
  if (!this.lastIncoming) throw new Error('no event has been delivered yet');
  this.deliver(this.lastIncoming);
});

Then(
  'the service emits exactly one {string} for order {string}',
  function (this: InventoryWorld, type: string, orderId: string) {
    assert.equal(this.emitted.length, 1, `expected exactly one event, got ${JSON.stringify(this.emitted)}`);
    const [event] = this.emitted;
    assert.equal(event.type, type);
    assert.equal(event.orderId, orderId);
  },
);

Then('the service emits nothing', function (this: InventoryWorld) {
  assert.deepEqual(this.emitted, []);
});

Then('available stock for {string} is {int}', function (this: InventoryWorld, sku: string, qty: number) {
  assert.equal(this.requireService().getAvailable(sku), qty);
});

Then(
  'every emitted event id is unique and follows the inventory id scheme',
  function (this: InventoryWorld) {
    const ids = this.all.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids among ${JSON.stringify(ids)}`);
    for (const event of this.all) {
      assert.equal(event.id, `inventory:${event.type}:${event.orderId}`);
    }
  },
);
