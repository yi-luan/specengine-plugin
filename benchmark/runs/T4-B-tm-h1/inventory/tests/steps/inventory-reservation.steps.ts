import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { Event, InventoryService } from '../../src/events.js';
import { createInventoryService } from '../../src/inventory.js';

const SKU = 'A';
const CUSTOMER = 'C1';
const AT = '2026-06-15T12:00:00Z';

let service: InventoryService;
let lastEvents: Event[] = [];

function deliver(event: Event): void {
  lastEvents = service.handle(event);
}

Given('庫存服務的初始庫存為 SKU {string} 數量 {int}', function (sku: string, qty: number) {
  service = createInventoryService({ [sku]: qty });
  lastEvents = [];
});

Given('已收到 OrderPlaced 事件 編號 {string} 訂單 {string} 數量 {int}', function (id: string, orderId: string, qty: number) {
  deliver({ id, type: 'OrderPlaced', orderId, customerId: CUSTOMER, sku: SKU, qty, amount: 100, at: AT });
});

When('收到 OrderPlaced 事件 編號 {string} 訂單 {string} 數量 {int}', function (id: string, orderId: string, qty: number) {
  deliver({ id, type: 'OrderPlaced', orderId, customerId: CUSTOMER, sku: SKU, qty, amount: 100, at: AT });
});

When('收到 PaymentFailed 事件 編號 {string} 訂單 {string}', function (id: string, orderId: string) {
  deliver({ id, type: 'PaymentFailed', orderId });
});

When('收到 OrderCancelled 事件 編號 {string} 訂單 {string}', function (id: string, orderId: string) {
  deliver({ id, type: 'OrderCancelled', orderId, });
});

When('收到 PaymentSucceeded 事件 編號 {string} 訂單 {string}', function (id: string, orderId: string) {
  deliver({ id, type: 'PaymentSucceeded', orderId, amount: 100 });
});

Then('回傳事件為 {string} 訂單 {string}', function (type: string, orderId: string) {
  assert.equal(lastEvents.length, 1, `預期回傳 1 個事件，實際為 ${lastEvents.length}`);
  const [event] = lastEvents;
  assert.equal(event.type, type);
  assert.equal((event as { orderId: string }).orderId, orderId);
});

Then('不回傳任何事件', function () {
  assert.deepEqual(lastEvents, []);
});

Then('SKU {string} 可用庫存為 {int}', function (sku: string, expected: number) {
  assert.equal(service.getAvailable(sku), expected);
});
