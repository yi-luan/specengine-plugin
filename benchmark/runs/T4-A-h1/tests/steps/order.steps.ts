import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { ShopWorld } from '../support/world.js';

Given('庫存 {string} 有 {int} 件', function (this: ShopWorld, sku: string, qty: number) {
  this.stock[sku] = qty;
  this.reset();
});

Given('顧客 {string} 餘額 {int}', function (this: ShopWorld, customerId: string, balance: number) {
  this.balances[customerId] = balance;
  this.reset();
});

When(
  '顧客 {string} 下單 {string} 商品 {string} 數量 {int} 金額 {int} 時間 {string}',
  function (this: ShopWorld, customerId: string, orderId: string, sku: string, qty: number, amount: number, at: string) {
    this.lastResult = this.order.placeOrder({ orderId, customerId, sku, qty, amount, at });
    if (this.lastResult.ok) this.bus.publish(this.lastResult.events);
  },
);

When('顧客取消訂單 {string} 時間 {string}', function (this: ShopWorld, orderId: string, at: string) {
  this.lastResult = this.order.cancelOrder(orderId, at);
  if (this.lastResult.ok) this.bus.publish(this.lastResult.events);
});

When('時間推進到 {string}', function (this: ShopWorld, now: string) {
  this.now = now;
  this.bus.publish(this.order.tick(now));
});

When('系統處理完所有事件', function (this: ShopWorld) {
  this.bus.drain();
});

When('系統處理完所有事件且每個事件都重複送達', function (this: ShopWorld) {
  this.bus.drain({ duplicate: true });
});

When('待送達的事件順序反轉', function (this: ShopWorld) {
  this.bus.reverseQueue();
});

Then('操作成功', function (this: ShopWorld) {
  assert.ok(this.lastResult, '沒有執行任何操作');
  assert.equal(this.lastResult.ok, true, `預期成功，實際失敗：${this.lastResult.ok ? '' : this.lastResult.reason}`);
});

Then('操作失敗，原因為 {string}', function (this: ShopWorld, reason: string) {
  assert.ok(this.lastResult, '沒有執行任何操作');
  assert.deepEqual(this.lastResult, { ok: false, reason });
});

Then('訂單 {string} 狀態為 {string}', function (this: ShopWorld, orderId: string, status: string) {
  assert.equal(this.order.getOrder(orderId)?.status, status);
});

Then('訂單 {string} 狀態為 {string} 且取消原因為 {string}', function (this: ShopWorld, orderId: string, status: string, reason: string) {
  assert.deepEqual(this.order.getOrder(orderId), { status, cancelReason: reason });
});

Then('庫存 {string} 可用數量為 {int}', function (this: ShopWorld, sku: string, qty: number) {
  assert.equal(this.inventory.getAvailable(sku), qty);
});

Then('顧客 {string} 餘額為 {int}', function (this: ShopWorld, customerId: string, balance: number) {
  assert.equal(this.payment.getBalance(customerId), balance);
});

Then('系統發出過 {string} 事件 {int} 次', function (this: ShopWorld, type: string, times: number) {
  const count = this.bus.emitted.filter((e) => e.type === type).length;
  assert.equal(count, times, `${type} 應發出 ${times} 次，實際 ${count} 次`);
});
