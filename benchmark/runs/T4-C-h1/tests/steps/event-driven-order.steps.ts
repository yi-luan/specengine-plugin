// 事件驅動下單流程的 Step Definitions（Binding Layer: direct）。
// 句型必須與 .specengine/spec/features/事件驅動下單流程.feature 一致（spec-guard 凍結句型字串）。
// step 函式直接呼叫產品 Service（經由 World 的事件佇列），不經 Driver 層。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { STATUS_MAP, type ServiceName, type World } from '../support/world.js';

const SERVICE_OF: Record<string, ServiceName> = {
  訂單服務: '訂單服務',
  庫存服務: '庫存服務',
  付款服務: '付款服務',
};

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema stock.total_qty: int
// @binds InventoryService.getAvailable
Given('商品 {string} 的庫存為 {string}', function (this: World, sku: string, qty: string) {
  this.stockConfig[sku] = Number(qty);
});

// 同一句型同時用於 Given（設定餘額）與 Then（斷言餘額）：服務尚未建立時是設定，已建立時是斷言
// @rule R-EVENT_DRIVEN_ORDER-*
// @schema balances.balance: int
// @binds PaymentService.getBalance
Given('顧客 {string} 的餘額為 {string}', function (this: World, customerId: string, balance: string) {
  if (!this.started) {
    this.balanceConfig[customerId] = Number(balance);
    return;
  }
  assert.equal(this.balance(customerId), Number(balance));
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
When(
  '顧客 {string} 在 {string} 下單 {string} 商品 {string} 數量 {string} 金額 {string}',
  function (this: World, customerId: string, at: string, orderId: string, sku: string, qty: string, amount: string) {
    this.beginStep();
    this.placeOrder({
      orderId,
      customerId,
      sku,
      qty: Number(qty),
      amount: Number(amount),
      at,
    });
  },
);

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema orders.status: varchar
// @binds OrderService.cancelOrder
When('顧客取消訂單 {string} 於 {string}', function (this: World, orderId: string, at: string) {
  this.beginStep();
  this.cancelOrder(orderId, at);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds OrderService.tick
When('時間推進到 {string}', function (this: World, now: string) {
  this.beginStep();
  this.tick(now);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds OrderService.handle
When('將訂單 {string} 的事件 {string} 送達 {string}', function (this: World, orderId: string, eventType: string, service: string) {
  this.beginStep();
  this.deliver(orderId, eventType, SERVICE_OF[service]);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds OrderService.handle
When('將訂單 {string} 的事件 {string} 重複送達 {string}', function (this: World, orderId: string, eventType: string, service: string) {
  this.beginStep();
  this.deliverDuplicate(orderId, eventType, SERVICE_OF[service]);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds OrderService.handle
When('所有待送達事件都送達所有服務', function (this: World) {
  this.beginStep();
  this.deliverAll();
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds World.lastCommand
Then('最近一次指令的結果為 {string}', function (this: World, expected: string) {
  assert.ok(this.lastCommand, '沒有任何指令結果');
  assert.equal(this.lastCommand.ok, expected === '成功');
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds World.lastCommand
Then('最近一次指令的失敗原因為 {string}', function (this: World, reason: string) {
  assert.ok(this.lastCommand, '沒有任何指令結果');
  assert.equal(this.lastCommand.ok, false);
  assert.equal(this.lastCommand.ok ? '' : this.lastCommand.reason, reason);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema orders.status: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 的狀態為 {string}', function (this: World, orderId: string, status: string) {
  assert.equal(this.orderStatus(orderId)?.status, STATUS_MAP[status]);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 的取消原因為 {string}', function (this: World, orderId: string, reason: string) {
  assert.equal(this.orderStatus(orderId)?.cancelReason, reason);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema orders.id: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 不存在', function (this: World, orderId: string) {
  assert.equal(this.orderStatus(orderId), undefined);
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema stock.total_qty: int
// @binds InventoryService.getAvailable
Then('商品 {string} 的可供保留庫存為 {string}', function (this: World, sku: string, qty: string) {
  assert.equal(this.available(sku), Number(qty));
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds World.eventLog
Then('事件 {string} 發出次數為 {string}', function (this: World, eventType: string, count: string) {
  assert.equal(this.eventLog.filter((e) => e.type === eventType).length, Number(count));
});

// @rule R-EVENT_DRIVEN_ORDER-*
// @schema none
// @binds World.lastStepEvents
Then('本次操作發出事件數為 {string}', function (this: World, count: string) {
  assert.equal(this.lastStepEvents.length, Number(count));
});
