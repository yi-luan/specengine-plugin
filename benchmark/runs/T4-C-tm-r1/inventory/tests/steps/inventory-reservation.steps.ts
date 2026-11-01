// Step Definitions：庫存保留（INVENTORY_RESERVATION）
// Binding Layer = direct：step 直接呼叫 src/inventory.ts 的服務。句型字串由 spec-guard 凍結，函式體由 spec-05 填入。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { Event } from '../../src/events.js';
import { createInventoryService } from '../../src/inventory.js';
import type { InventoryWorld } from '../support/world.js';

/** 測試自行建構其他服務會送來的事件（需求：開發期間另外兩個服務只是空殼） */
function buildOrderPlaced(orderId: string, eventId: string, sku: string, qty: number): Event {
  return { id: eventId, type: 'OrderPlaced', orderId, customerId: 'C1', sku, qty, amount: 100, at: '2026-06-15T12:00:00Z' };
}

function buildEvent(type: string, orderId: string, eventId: string): Event {
  switch (type) {
    case 'StockReserved':
    case 'StockRejected':
    case 'StockReleased':
    case 'PaymentFailed':
    case 'OrderCancelled':
      return { id: eventId, type, orderId };
    case 'PaymentSucceeded':
    case 'PaymentRefunded':
      return { id: eventId, type, orderId, amount: 100 };
    default:
      throw new Error(`測試不支援以此句型建構事件型別：${type}`);
  }
}

function requireService(world: InventoryWorld) {
  if (!world.service) throw new Error('尚未建立庫存服務，請先執行「商品 {string} 的初始庫存為 {string}」');
  return world.service;
}

// @rule R-INVENTORY_RESERVATION-*
// @schema inventory_stock.sku: varchar, inventory_stock.available: int
// @binds createInventoryService.createInventoryService
Given('商品 {string} 的初始庫存為 {string}', function (this: InventoryWorld, sku: string, stock: string) {
  this.service = createInventoryService({ [sku]: Number(stock) });
  this.lastResult = [];
  this.seenEventIds = [];
  this.queryResult = undefined;
});

// @rule R-INVENTORY_RESERVATION-000, R-INVENTORY_RESERVATION-001, R-INVENTORY_RESERVATION-002, R-INVENTORY_RESERVATION-003, R-INVENTORY_RESERVATION-004, R-INVENTORY_RESERVATION-005, R-INVENTORY_RESERVATION-006, R-INVENTORY_RESERVATION-007
// @schema stock_reservation.order_id: varchar, stock_reservation.sku: varchar, stock_reservation.qty: int, processed_event.event_id: varchar
// @binds InventoryService.handle
Given('庫存服務已處理訂單 {string} 的下單事件 {string}，商品 {string} 數量 {string}', function (this: InventoryWorld, orderId: string, eventId: string, sku: string, qty: string) {
  const emitted = requireService(this).handle(buildOrderPlaced(orderId, eventId, sku, Number(qty)));
  this.seenEventIds.push(...emitted.map((e) => e.id));
});

// @rule R-INVENTORY_RESERVATION-003, R-INVENTORY_RESERVATION-006, R-INVENTORY_RESERVATION-007, R-INVENTORY_RESERVATION-009
// @schema stock_reservation.status: varchar, processed_event.event_id: varchar
// @binds InventoryService.handle
Given('庫存服務已處理訂單 {string} 的 {string} 事件 {string}', function (this: InventoryWorld, orderId: string, type: string, eventId: string) {
  const emitted = requireService(this).handle(buildEvent(type, orderId, eventId));
  this.seenEventIds.push(...emitted.map((e) => e.id));
});

// @rule R-INVENTORY_RESERVATION-000, R-INVENTORY_RESERVATION-001, R-INVENTORY_RESERVATION-005, R-INVENTORY_RESERVATION-009, R-INVENTORY_RESERVATION-010
// @schema stock_reservation.order_id: varchar, stock_reservation.sku: varchar, stock_reservation.qty: int, processed_event.event_id: varchar
// @binds InventoryService.handle
When('庫存服務收到訂單 {string} 的下單事件 {string}，商品 {string} 數量 {string}', function (this: InventoryWorld, orderId: string, eventId: string, sku: string, qty: string) {
  this.lastResult = requireService(this).handle(buildOrderPlaced(orderId, eventId, sku, Number(qty)));
});

// @rule R-INVENTORY_RESERVATION-002, R-INVENTORY_RESERVATION-003, R-INVENTORY_RESERVATION-004, R-INVENTORY_RESERVATION-006, R-INVENTORY_RESERVATION-008
// @schema stock_reservation.status: varchar, processed_event.event_id: varchar
// @binds InventoryService.handle
When('庫存服務收到訂單 {string} 的 {string} 事件 {string}', function (this: InventoryWorld, orderId: string, type: string, eventId: string) {
  this.lastResult = requireService(this).handle(buildEvent(type, orderId, eventId));
});

// @rule R-INVENTORY_RESERVATION-007
// @schema inventory_stock.available: int
// @binds InventoryService.getAvailable
When('查詢商品 {string} 的可用庫存', function (this: InventoryWorld, sku: string) {
  this.queryResult = requireService(this).getAvailable(sku);
});

// @rule R-INVENTORY_RESERVATION-000, R-INVENTORY_RESERVATION-001, R-INVENTORY_RESERVATION-002, R-INVENTORY_RESERVATION-003, R-INVENTORY_RESERVATION-010
// @schema none
// @binds InventoryService.handle
Then('回傳事件為訂單 {string} 的 {string}', function (this: InventoryWorld, orderId: string, type: string) {
  assert.equal(this.lastResult.length, 1, `應恰好回傳 1 個事件，實際 ${JSON.stringify(this.lastResult)}`);
  const [event] = this.lastResult;
  assert.equal(event.type, type);
  assert.equal('orderId' in event ? event.orderId : undefined, orderId);
});

// @rule R-INVENTORY_RESERVATION-000, R-INVENTORY_RESERVATION-001, R-INVENTORY_RESERVATION-002, R-INVENTORY_RESERVATION-003
// @schema none
// @binds InventoryService.handle
Then('回傳事件的 id 與先前所有回傳事件的 id 皆不同', function (this: InventoryWorld) {
  for (const event of this.lastResult) {
    assert.ok(typeof event.id === 'string' && event.id.length > 0, '事件 id 必須為非空字串');
    assert.ok(!this.seenEventIds.includes(event.id), `事件 id 重複：${event.id}`);
    this.seenEventIds.push(event.id);
  }
});

// @rule R-INVENTORY_RESERVATION-004, R-INVENTORY_RESERVATION-005, R-INVENTORY_RESERVATION-006, R-INVENTORY_RESERVATION-008, R-INVENTORY_RESERVATION-009
// @schema none
// @binds InventoryService.handle
Then('回傳空陣列', function (this: InventoryWorld) {
  assert.deepEqual(this.lastResult, []);
});

// @rule R-INVENTORY_RESERVATION-*
// @schema inventory_stock.available: int
// @binds InventoryService.getAvailable
Then('商品 {string} 的可用庫存為 {string}', function (this: InventoryWorld, sku: string, expected: string) {
  assert.equal(requireService(this).getAvailable(sku), Number(expected));
});

// @rule R-INVENTORY_RESERVATION-007
// @schema inventory_stock.available: int
// @binds InventoryService.getAvailable
Then('查詢結果為 {string}', function (this: InventoryWorld, expected: string) {
  assert.equal(this.queryResult, Number(expected));
});
