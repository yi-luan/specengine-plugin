// tests/steps/order-saga.steps.ts
// 模組：ORDER_SAGA（事件驅動下單流程）
// Binding Layer = direct：Step 直接呼叫 src/shop.ts 的 Service（透過 World 持有的實例）。
// 句型字串與 .specengine/spec/features/事件驅動下單流程.feature 一致，spec-05 期間由 spec-guard 凍結。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { OrderSagaWorld } from '../support/world.js';
import type { Event } from '../../src/shop.js';

const toEventType = (type: string): Event['type'] => type as Event['type'];

// @rule R-ORDER_SAGA-*
// @schema inventory_stock.sku: varchar, inventory_stock.available: int
// @binds InventoryService.createInventoryService
Given('庫存服務 SKU {string} 的初始庫存為 {string}', function (this: OrderSagaWorld, sku: string, qty: string) {
  this.stock[sku] = Number(qty);
});

// @rule R-ORDER_SAGA-*
// @schema customer_balances.customer_id: varchar, customer_balances.balance: int
// @binds PaymentService.createPaymentService
Given('付款服務顧客 {string} 的初始餘額為 {string}', function (this: OrderSagaWorld, customerId: string, balance: string) {
  this.balances[customerId] = Number(balance);
});

// @rule R-ORDER_SAGA-000, R-ORDER_SAGA-001, R-ORDER_SAGA-017, R-ORDER_SAGA-018
// @schema orders.order_id: varchar, orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
When('顧客下單 訂單 {string} 顧客 {string} SKU {string} 數量 {string} 金額 {string} 時間 {string}', function (this: OrderSagaWorld, orderId: string, customerId: string, sku: string, qty: string, amount: string, at: string) {
  this.lastResult = this.order.placeOrder({ orderId, customerId, sku, qty: Number(qty), amount: Number(amount), at });
  this.record(this.lastResult.ok ? this.lastResult.events : []);
});

// @rule R-ORDER_SAGA-010, R-ORDER_SAGA-019, R-ORDER_SAGA-020
// @schema orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.cancelOrder
When('顧客於 {string} 取消訂單 {string}', function (this: OrderSagaWorld, at: string, orderId: string) {
  this.lastResult = this.order.cancelOrder(orderId, at);
  this.record(this.lastResult.ok ? this.lastResult.events : []);
});

// @rule R-ORDER_SAGA-013
// @schema orders.placed_at: timestamp, orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.tick
When('訂單服務時間推進到 {string}', function (this: OrderSagaWorld, now: string) {
  this.record(this.order.tick(now));
});

// @rule R-ORDER_SAGA-*
// @schema processed_events.event_id: varchar
// @binds OrderService.handle
When('將訂單 {string} 的事件 {string} 送達 {string}', function (this: OrderSagaWorld, orderId: string, type: string, service: string) {
  const event = this.findEvent(orderId, toEventType(type));
  this.record(this.serviceByName(service).handle(event));
});

// @rule R-ORDER_SAGA-014, R-ORDER_SAGA-021, R-ORDER_SAGA-023, R-ORDER_SAGA-024
// @schema processed_events.event_id: varchar
// @binds OrderService.handle
When('將訂單 {string} 的外來事件 {string} 送達 {string}', function (this: OrderSagaWorld, orderId: string, type: string, service: string) {
  const event = this.syntheticEvent(orderId, toEventType(type));
  this.record(this.serviceByName(service).handle(event));
});

// @rule R-ORDER_SAGA-000, R-ORDER_SAGA-016
// @schema none
// @binds OrderService.handle
When('所有待傳遞的事件依序廣播給三個服務直到沒有新事件', function (this: OrderSagaWorld) {
  this.broadcastAll();
});

// @rule R-ORDER_SAGA-001, R-ORDER_SAGA-010
// @schema none
// @binds World.lastResult
Then('指令結果為 {string}', function (this: OrderSagaWorld, expected: string) {
  assert.equal(expected, '成功', `本句型只接受「成功」，收到：${expected}`);
  assert.ok(this.lastResult, '尚未執行任何指令');
  assert.equal(this.lastResult.ok, true, `指令失敗：${this.lastResult.ok ? '' : this.lastResult.reason}`);
});

// @rule R-ORDER_SAGA-017, R-ORDER_SAGA-018, R-ORDER_SAGA-019, R-ORDER_SAGA-020
// @schema none
// @binds World.lastResult
Then('指令結果為失敗，原因 {string}', function (this: OrderSagaWorld, reason: string) {
  assert.ok(this.lastResult, '尚未執行任何指令');
  assert.equal(this.lastResult.ok, false, '指令應失敗卻成功');
  if (!this.lastResult.ok) assert.equal(this.lastResult.reason, reason);
});

// @rule R-ORDER_SAGA-*
// @schema none
// @binds World.lastEvents
Then('本次產生的事件為 {string}', function (this: OrderSagaWorld, types: string) {
  const expected = types === '無' ? [] : types.split(',').map((t) => t.trim());
  assert.deepEqual(this.lastEvents.map((e) => e.type), expected);
});

// @rule R-ORDER_SAGA-*
// @schema none
// @binds World.lastEvents
Then('本次產生的事件皆屬於訂單 {string}', function (this: OrderSagaWorld, orderId: string) {
  assert.ok(this.lastEvents.length > 0, '本次沒有產生任何事件');
  for (const event of this.lastEvents) assert.equal(event.orderId, orderId);
});

// @rule R-ORDER_SAGA-004, R-ORDER_SAGA-012
// @schema none
// @binds World.lastEvents
Then('本次產生的事件 {string} 的金額為 {string}', function (this: OrderSagaWorld, type: string, amount: string) {
  const event = this.lastEvents.find((e) => e.type === type);
  assert.ok(event, `本次未產生事件 ${type}`);
  assert.ok('amount' in event, `事件 ${type} 沒有金額欄位`);
  assert.equal(event.amount, Number(amount));
});

// @rule R-ORDER_SAGA-001
// @schema orders.order_id: varchar, orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds World.lastEvents
Then('本次產生的事件 {string} 內容為 訂單 {string} 顧客 {string} SKU {string} 數量 {string} 金額 {string} 時間 {string}', function (this: OrderSagaWorld, type: string, orderId: string, customerId: string, sku: string, qty: string, amount: string, at: string) {
  const event = this.lastEvents.find((e) => e.type === type);
  assert.ok(event, `本次未產生事件 ${type}`);
  assert.equal(event.type, 'OrderPlaced');
  if (event.type === 'OrderPlaced') {
    assert.deepEqual(
      { orderId: event.orderId, customerId: event.customerId, sku: event.sku, qty: event.qty, amount: event.amount, at: event.at },
      { orderId, customerId, sku, qty: Number(qty), amount: Number(amount), at },
    );
  }
});

// @rule R-ORDER_SAGA-*
// @schema orders.status: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 的狀態為 {string}', function (this: OrderSagaWorld, orderId: string, status: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `訂單 ${orderId} 不存在`);
  assert.equal(order.status, status);
});

// @rule R-ORDER_SAGA-010, R-ORDER_SAGA-013, R-ORDER_SAGA-020, R-ORDER_SAGA-023
// @schema orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 的取消原因為 {string}', function (this: OrderSagaWorld, orderId: string, reason: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `訂單 ${orderId} 不存在`);
  assert.equal(order.cancelReason, reason);
});

// @rule R-ORDER_SAGA-001
// @schema orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 沒有取消原因', function (this: OrderSagaWorld, orderId: string) {
  const order = this.order.getOrder(orderId);
  assert.ok(order, `訂單 ${orderId} 不存在`);
  assert.equal(order.cancelReason, undefined);
});

// @rule R-ORDER_SAGA-018, R-ORDER_SAGA-023
// @schema orders.order_id: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 不存在', function (this: OrderSagaWorld, orderId: string) {
  assert.equal(this.order.getOrder(orderId), undefined);
});

// @rule R-ORDER_SAGA-*
// @schema inventory_stock.available: int
// @binds InventoryService.getAvailable
Then('SKU {string} 的可用庫存為 {string}', function (this: OrderSagaWorld, sku: string, expected: string) {
  assert.equal(this.inventory.getAvailable(sku), Number(expected));
});

// @rule R-ORDER_SAGA-*
// @schema customer_balances.balance: int
// @binds PaymentService.getBalance
Then('顧客 {string} 的餘額為 {string}', function (this: OrderSagaWorld, customerId: string, expected: string) {
  assert.equal(this.payment.getBalance(customerId), Number(expected));
});

// @rule R-ORDER_SAGA-016
// @schema processed_events.event_id: varchar
// @binds World.allEvents
Then('系統內所有已發出事件的 id 皆不重複', function (this: OrderSagaWorld) {
  assert.ok(this.allEvents.length > 0, '系統內沒有任何事件');
  const ids = this.allEvents.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, '事件 id 有重複');
});
