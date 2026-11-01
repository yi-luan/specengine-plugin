// 訂單服務（ORDER_SERVICE）Step Definitions。
// Binding Layer 為 direct：step 直接呼叫 OrderService 方法（無 Driver 層）。
// 句型字串由 spec-04 產出並由 spec-guard 凍結；函式體由 spec-05 實作。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { DEFAULT_PLACED_AT, OrderWorld, STATUS_CODE } from '../support/order-world.js';

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-004, R-ORDER_SERVICE-009
// @schema orders.order_id: varchar
// @binds OrderService.getOrder
Given('訂單編號 {string} 尚未存在', function (this: OrderWorld, _orderId: string) {
  // 每個 Scenario 都是全新的服務，沒有任何既有訂單，無需額外前置動作。
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-004, R-ORDER_SERVICE-005
// @schema orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
When('顧客 {string} 下單 {string}，商品 {string}，數量 {string}，金額 {string}，時間 {string}', function (this: OrderWorld, customerId: string, orderId: string, sku: string, qty: string, amount: string, at: string) {
  this.lastResult = this.service.placeOrder({
    orderId,
    customerId,
    sku,
    qty: Number(qty),
    amount: Number(amount),
    at,
  });
  this.lastEvents = this.lastResult.ok ? this.lastResult.events : [];
});

// @rule R-ORDER_SERVICE-000
// @schema none
// @binds OrderService.placeOrder
Then('下單結果為成功', function (this: OrderWorld) {
  assert.equal(this.lastResult?.ok, true);
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-001, R-ORDER_SERVICE-002, R-ORDER_SERVICE-003, R-ORDER_SERVICE-005, R-ORDER_SERVICE-006, R-ORDER_SERVICE-007, R-ORDER_SERVICE-008, R-ORDER_SERVICE-012, R-ORDER_SERVICE-013
// @schema orders.status: varchar
// @binds OrderService.getOrder
// 同一句型同時用於 Given 與 Then（Cucumber 以句型字串比對，與關鍵字無關）。
// Given（Context）→ 準備前置狀態；Then（Outcome）→ 斷言狀態。
Given('訂單 {string} 狀態為 {string}', function (this: OrderWorld, orderId: string, status: string) {
  if (this.phase === 'Context') {
    this.ensureOrder(orderId, status);
    return;
  }
  assert.equal(this.service.getOrder(orderId)?.status, STATUS_CODE[status]);
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-006, R-ORDER_SERVICE-007, R-ORDER_SERVICE-010
// @schema none
// @binds OrderService.handle
Then('發出事件 {string}', function (this: OrderWorld, eventType: string) {
  assert.ok(this.lastEvents.some((e) => e.type === eventType), `未發出 ${eventType}，實際：${JSON.stringify(this.lastEvents)}`);
});

// @rule R-ORDER_SERVICE-010, R-ORDER_SERVICE-011, R-ORDER_SERVICE-012
// @schema orders.placed_at: timestamp, orders.status: varchar
// @binds OrderService.placeOrder
Given('訂單 {string} 狀態為 {string}，下單時間為 {string}', function (this: OrderWorld, orderId: string, status: string, placedAt: string) {
  this.ensureOrder(orderId, status, placedAt);
});

// @rule R-ORDER_SERVICE-001, R-ORDER_SERVICE-002, R-ORDER_SERVICE-003, R-ORDER_SERVICE-013
// @schema none
// @binds OrderService.handle
When('收到 {string} 事件，訂單編號為 {string}', function (this: OrderWorld, eventType: string, orderId: string) {
  this.lastEvents = this.service.handle(this.makeEvent(eventType, orderId));
});

// @rule R-ORDER_SERVICE-001, R-ORDER_SERVICE-002, R-ORDER_SERVICE-003, R-ORDER_SERVICE-004, R-ORDER_SERVICE-005, R-ORDER_SERVICE-006, R-ORDER_SERVICE-007, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009, R-ORDER_SERVICE-010, R-ORDER_SERVICE-011, R-ORDER_SERVICE-012, R-ORDER_SERVICE-013, R-ORDER_SERVICE-014
// @schema none
// @binds OrderService.handle
Then('不發出任何事件', function (this: OrderWorld) {
  assert.deepEqual(this.lastEvents, []);
});

// @rule R-ORDER_SERVICE-004, R-ORDER_SERVICE-005
// @schema none
// @binds OrderService.placeOrder
Then('下單結果為失敗，原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.equal(this.lastResult?.ok, false);
  assert.equal(this.lastResult && !this.lastResult.ok ? this.lastResult.reason : undefined, reason);
});

// @rule R-ORDER_SERVICE-004
// @schema orders.order_id: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 不存在', function (this: OrderWorld, orderId: string) {
  assert.equal(this.service.getOrder(orderId), undefined);
});

// @rule R-ORDER_SERVICE-005
// @schema orders.order_id: varchar, orders.status: varchar
// @binds OrderService.placeOrder
Given('訂單 {string} 已存在且狀態為 {string}', function (this: OrderWorld, orderId: string, status: string) {
  this.ensureOrder(orderId, status, DEFAULT_PLACED_AT);
});

// @rule R-ORDER_SERVICE-006, R-ORDER_SERVICE-007, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009
// @schema orders.order_id: varchar
// @binds OrderService.cancelOrder
When('顧客 {string} 取消訂單 {string}，時間 {string}', function (this: OrderWorld, _customerId: string, orderId: string, at: string) {
  this.lastOrderId = orderId;
  this.lastCancel = this.service.cancelOrder(orderId, at);
  this.lastEvents = this.lastCancel.ok ? this.lastCancel.events : [];
});

// @rule R-ORDER_SERVICE-006, R-ORDER_SERVICE-007
// @schema none
// @binds OrderService.cancelOrder
Then('取消結果為成功', function (this: OrderWorld) {
  assert.equal(this.lastCancel?.ok, true);
});

// @rule R-ORDER_SERVICE-006, R-ORDER_SERVICE-007, R-ORDER_SERVICE-010
// @schema orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then('取消原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.equal(this.service.getOrder(this.lastOrderId)?.cancelReason, reason);
});

// @rule R-ORDER_SERVICE-008, R-ORDER_SERVICE-009
// @schema none
// @binds OrderService.cancelOrder
Then('取消結果為失敗，原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.equal(this.lastCancel?.ok, false);
  assert.equal(this.lastCancel && !this.lastCancel.ok ? this.lastCancel.reason : undefined, reason);
});

// @rule R-ORDER_SERVICE-010, R-ORDER_SERVICE-011, R-ORDER_SERVICE-012
// @schema none
// @binds OrderService.tick
When('時間推進到 {string}', function (this: OrderWorld, now: string) {
  this.lastEvents = this.service.tick(now);
  this.lastOrderId = this.lastEvents[0]?.orderId ?? this.lastOrderId;
});

// @rule R-ORDER_SERVICE-014
// @schema none
// @binds OrderService.handle
Given('事件 {string}（PaymentSucceeded）已套用於訂單 {string}', function (this: OrderWorld, eventId: string, orderId: string) {
  const event = this.makeEvent('PaymentSucceeded', orderId, eventId);
  this.lastEvents = this.service.handle(event);
});

// @rule R-ORDER_SERVICE-014
// @schema none
// @binds OrderService.handle
When('同一事件 {string} 再次送達', function (this: OrderWorld, eventId: string) {
  this.lastEvents = this.service.handle(this.getEvent(eventId));
});
