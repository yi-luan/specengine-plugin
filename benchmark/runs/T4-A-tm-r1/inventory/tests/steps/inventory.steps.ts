import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createInventoryService } from '../../src/inventory.js';
import type { Event } from '../../src/events.js';
import type { InventoryWorld } from '../support/world.js';

type OrderScopedType = Exclude<Event['type'], 'OrderPlaced'>;

/** 模擬同事服務送來、只帶 orderId 的事件。 */
function externalEvent(world: InventoryWorld, type: string, orderId: string): Event {
  const id = world.nextExternalId('ext');
  switch (type as OrderScopedType) {
    case 'PaymentSucceeded':
      return { id, type: 'PaymentSucceeded', orderId, amount: 100 };
    case 'PaymentRefunded':
      return { id, type: 'PaymentRefunded', orderId, amount: 100 };
    case 'StockReserved':
      return { id, type: 'StockReserved', orderId };
    case 'StockRejected':
      return { id, type: 'StockRejected', orderId };
    case 'StockReleased':
      return { id, type: 'StockReleased', orderId };
    case 'PaymentFailed':
      return { id, type: 'PaymentFailed', orderId };
    case 'OrderCancelled':
      return { id, type: 'OrderCancelled', orderId };
    default:
      throw new Error(`測試不支援的事件類型：${type}`);
  }
}

let lastOrderPlaced: Event | undefined;
const inbound: Event[] = [];

Given('庫存服務的初始庫存為:', function (this: InventoryWorld, table: DataTable) {
  const stock: Record<string, number> = {};
  for (const row of table.hashes()) stock[row.sku] = Number(row.qty);
  this.initialStock = stock;
  this.service = createInventoryService(stock);
  this.lastEmitted = [];
  this.allEmitted = [];
  inbound.length = 0;
  lastOrderPlaced = undefined;
});

Given('訂單 {string} 已保留商品 {string} 數量 {int}', function (this: InventoryWorld, orderId: string, sku: string, qty: number) {
  const before = this.service!.getAvailable(sku);
  const e = this.orderPlaced(orderId, sku, qty);
  inbound.push(e);
  const emitted = this.dispatch(e);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].type, 'StockReserved');
  assert.equal(this.service!.getAvailable(sku), before - qty);
});

When('收到訂單 {string} 的 OrderPlaced，商品 {string} 數量 {int}', function (this: InventoryWorld, orderId: string, sku: string, qty: number) {
  const e = this.orderPlaced(orderId, sku, qty);
  lastOrderPlaced = e;
  inbound.push(e);
  this.dispatch(e);
});

When('再次收到同一個 OrderPlaced 事件', function (this: InventoryWorld) {
  assert.ok(lastOrderPlaced, '沒有可重送的 OrderPlaced');
  this.dispatch({ ...lastOrderPlaced });
});

When(/^(?:再次)?收到訂單 "([^"]+)" 的 "([^"]+)"$/, function (this: InventoryWorld, orderId: string, type: string) {
  const e = externalEvent(this, type, orderId);
  inbound.push(e);
  this.dispatch(e);
});

Then('庫存服務發出 {int} 個事件', function (this: InventoryWorld, n: number) {
  assert.equal(this.lastEmitted.length, n, `實際發出：${JSON.stringify(this.lastEmitted)}`);
});

Then('庫存服務總共發出 {int} 個事件', function (this: InventoryWorld, n: number) {
  assert.equal(this.allEmitted.length, n, `實際發出：${JSON.stringify(this.allEmitted)}`);
});

Then('發出的事件為 {string}，訂單 {string}', function (this: InventoryWorld, type: string, orderId: string) {
  assert.equal(this.lastEmitted.length, 1, `實際發出：${JSON.stringify(this.lastEmitted)}`);
  const e = this.lastEmitted[0];
  assert.equal(e.type, type);
  assert.equal(e.orderId, orderId);
  assert.ok(typeof e.id === 'string' && e.id.length > 0, '事件必須有 id');
});

Then('{string} 的可用庫存為 {int}', function (this: InventoryWorld, sku: string, qty: number) {
  assert.equal(this.service!.getAvailable(sku), qty);
});

Then('所有發出事件的 id 皆不重複且與送入事件的 id 不同', function (this: InventoryWorld) {
  const ids = this.allEmitted.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `id 重複：${ids.join(', ')}`);
  const inboundIds = new Set(inbound.map((e) => e.id));
  for (const id of ids) assert.ok(!inboundIds.has(id), `與送入事件 id 衝突：${id}`);
});

Then('傳入的初始庫存物件中 {string} 仍為 {int}', function (this: InventoryWorld, sku: string, qty: number) {
  assert.equal(this.initialStock[sku], qty);
});
