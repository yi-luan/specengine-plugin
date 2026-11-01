import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { ShopWorld } from '../support/harness.js';

Given('商品 {string} 初始庫存為 {int}', function (this: ShopWorld, sku: string, qty: number) {
  this.stockInit[sku] = qty;
});

Given('顧客 {string} 初始餘額為 {int}', function (this: ShopWorld, customerId: string, amount: number) {
  this.balanceInit[customerId] = amount;
});

Given('事件自動送達已關閉', function (this: ShopWorld) {
  this.autoSettle = false;
});

When('顧客 {string} 以訂單 {string} 下單商品 {string} 數量 {int} 金額 {int} 於 {string}',
  function (this: ShopWorld, customerId: string, orderId: string, sku: string, qty: number, amount: number, at: string) {
    this.now = at;
    this.placeOrder({ orderId, customerId, sku, qty, amount, at });
  });

When('顧客取消訂單 {string}', function (this: ShopWorld, orderId: string) {
  this.cancel(orderId);
});

When('時間推進到 {string}', function (this: ShopWorld, now: string) {
  this.tick(now);
});

When('處理佇列中的剩餘事件', function (this: ShopWorld) {
  this.ensure().settle();
});

When('送達佇列中的 {string} 事件', function (this: ShopWorld, type: string) {
  this.ensure().deliverOne(type as never);
});

When('重新送達 {string} 事件', function (this: ShopWorld, type: string) {
  this.ensure().redeliver(type as never);
});

When('外部送達 {string} 事件給訂單 {string} 金額 {int}',
  function (this: ShopWorld, type: string, orderId: string, amount: number) {
    this.inject(type as 'PaymentSucceeded', orderId, amount);
  });

Then('訂單 {string} 狀態為 {string}', function (this: ShopWorld, orderId: string, status: string) {
  assert.equal(this.ensure().order.getOrder(orderId)?.status, status);
});

Then('訂單 {string} 取消原因為 {string}', function (this: ShopWorld, orderId: string, reason: string) {
  assert.equal(this.ensure().order.getOrder(orderId)?.cancelReason, reason);
});

Then('商品 {string} 可供保留數量為 {int}', function (this: ShopWorld, sku: string, qty: number) {
  assert.equal(this.ensure().inventory.getAvailable(sku), qty);
});

Then('顧客 {string} 餘額為 {int}', function (this: ShopWorld, customerId: string, amount: number) {
  assert.equal(this.ensure().payment.getBalance(customerId), amount);
});

Then('系統已送出事件 {string}', function (this: ShopWorld, type: string) {
  assert.ok(this.emitted.some((e) => e.type === type), `expected event ${type} to be emitted`);
});

Then('系統未送出事件 {string}', function (this: ShopWorld, type: string) {
  assert.ok(!this.emitted.some((e) => e.type === type), `expected event ${type} NOT to be emitted`);
});

Then('系統送出的 {string} 金額為 {int}', function (this: ShopWorld, type: string, amount: number) {
  const e = this.emitted.find((x) => x.type === type);
  assert.ok(e && 'amount' in e && e.amount === amount, `expected ${type} with amount ${amount}`);
});

Then('顧客取消被拒絕', function (this: ShopWorld) {
  assert.equal(this.lastResult?.ok, false);
});

Then('最後一次下單被拒絕', function (this: ShopWorld) {
  assert.equal(this.lastResult?.ok, false);
});
