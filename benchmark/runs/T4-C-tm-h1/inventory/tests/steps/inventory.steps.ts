// 庫存服務 Step Definitions（direct 綁定：step 直接呼叫 InventoryService）。
// 句型字串由 spec-04 產出並由 spec-guard 凍結；spec-05 只填入函式本體。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { Event } from '../../src/events.js';
import type { InventoryWorld } from '../support/world.js';

const AT = '2026-06-15T12:00:00Z';

// 設定某 SKU 的庫存總量（Given，服務建立前）；服務已建立後同一句型用來檢查可供保留庫存（Then）。
// @rule R-INVENTORY-*
// @schema stock_item.total_qty: int
// @binds createInventoryService
Given('商品 {string} 的可供保留庫存為 {string}', function (this: InventoryWorld, sku: string, qty: string) {
  if (!this.hasService()) {
    this.stock[sku] = Number(qty);
    return;
  }
  assert.equal(this.svc().getAvailable(sku), Number(qty));
});

// 先前已成功保留某訂單的庫存（Given，透過 OrderPlaced 事件建立）。
// @rule R-INVENTORY-000
// @schema reservation.qty: int
// @binds InventoryService.handle
Given('訂單 {string} 已保留 {string} 個商品 {string}', function (this: InventoryWorld, orderId: string, qty: string, sku: string) {
  this.send({ id: this.nextEventId(), type: 'OrderPlaced', orderId, customerId: 'C-1', sku, qty: Number(qty), amount: 0, at: AT });
  assert.ok(this.events.some((e) => e.type === 'StockReserved' && e.orderId === orderId), '前置條件：訂單應已保留成功');
});

// 訂單先被記為已取消（Given，透過 OrderCancelled 事件建立）。
// @rule R-INVENTORY-006
// @schema none
// @binds InventoryService.handle
Given('訂單 {string} 已被記為已取消', function (this: InventoryWorld, orderId: string) {
  this.send({ id: this.nextEventId(), type: 'OrderCancelled', orderId });
});

// 訂單先被記為付款失敗（Given，透過 PaymentFailed 事件建立）。
// @rule R-INVENTORY-009
// @schema none
// @binds InventoryService.handle
Given('訂單 {string} 已被記為付款失敗', function (this: InventoryWorld, orderId: string) {
  this.send({ id: this.nextEventId(), type: 'PaymentFailed', orderId });
});

// 收到 OrderPlaced（When）。
// @rule R-INVENTORY-000
// @schema reservation.qty: int
// @binds InventoryService.handle
When('收到下單 訂單 {string} 商品 {string} 數量 {string}', function (this: InventoryWorld, orderId: string, sku: string, qty: string) {
  this.send({ id: this.nextEventId(), type: 'OrderPlaced', orderId, customerId: 'C-1', sku, qty: Number(qty), amount: 0, at: AT });
});

// 收到 PaymentFailed（When）。
// @rule R-INVENTORY-002
// @schema none
// @binds InventoryService.handle
When('收到付款失敗 訂單 {string}', function (this: InventoryWorld, orderId: string) {
  this.send({ id: this.nextEventId(), type: 'PaymentFailed', orderId });
});

// 收到 OrderCancelled（When）。
// @rule R-INVENTORY-003
// @schema none
// @binds InventoryService.handle
When('收到取消 訂單 {string}', function (this: InventoryWorld, orderId: string) {
  this.send({ id: this.nextEventId(), type: 'OrderCancelled', orderId });
});

// 同一個事件（同 id）再次送達（When）。
// @rule R-INVENTORY-005
// @schema none
// @binds InventoryService.handle
When('同一事件再次送達', function (this: InventoryWorld) {
  assert.ok(this.lastEvent, '前置條件：需要先有一個已送出的事件');
  this.events = this.svc().handle(this.lastEvent as Event);
});

// 系統發出某事件（Then）。
// @rule R-INVENTORY-*
// @schema none
// @binds InventoryService.handle
Then('系統發出 {string} 訂單 {string}', function (this: InventoryWorld, type: string, orderId: string) {
  assert.ok(
    this.events.some((e) => e.type === type && e.orderId === orderId),
    `應發出 ${type}（訂單 ${orderId}），實際為 ${JSON.stringify(this.events)}`,
  );
});

// 系統不發出某事件（Then）。
// @rule R-INVENTORY-*
// @schema none
// @binds InventoryService.handle
Then('系統不發出 {string} 訂單 {string}', function (this: InventoryWorld, type: string, orderId: string) {
  assert.ok(
    !this.events.some((e) => e.type === type && e.orderId === orderId),
    `不應發出 ${type}（訂單 ${orderId}），實際為 ${JSON.stringify(this.events)}`,
  );
});

// 系統不發出任何事件（Then）。
// @rule R-INVENTORY-*
// @schema none
// @binds InventoryService.handle
Then('系統不發出任何事件', function (this: InventoryWorld) {
  assert.equal(this.events.length, 0, `不應發出任何事件，實際為 ${JSON.stringify(this.events)}`);
});
