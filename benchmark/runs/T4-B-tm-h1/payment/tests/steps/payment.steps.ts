import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PaymentWorld } from '../support/world.js';
import type { Event } from '../../src/events.js';

function findEvent<T extends Event['type']>(events: Event[], type: T, orderId: string): Extract<Event, { type: T }> | undefined {
  return events.find((e): e is Extract<Event, { type: T }> => e.type === type && e.orderId === orderId);
}

// ---- Given ----

Given('顧客 {string} 的餘額為 {int}', function (this: PaymentWorld, customerId: string, amount: number) {
  this.balances[customerId] = amount;
});

Given('訂單 {string} 已建立，屬於顧客 {string}，金額為 {int}', function (this: PaymentWorld, orderId: string, customerId: string, amount: number) {
  this.send(this.orderPlaced(orderId, customerId, amount));
});

// ---- When ----

When('收到訂單 {string} 的「庫存已保留」', function (this: PaymentWorld, orderId: string) {
  this.send(this.stockReserved(orderId));
});

When('收到訂單 {string} 的「庫存拒絕」', function (this: PaymentWorld, orderId: string) {
  this.send(this.stockRejected(orderId));
});

When('收到訂單 {string} 的「訂單已取消」', function (this: PaymentWorld, orderId: string) {
  this.send(this.orderCancelled(orderId));
});

When('收到訂單 {string} 的「訂單已建立」，顧客為 {string}，金額為 {int}', function (this: PaymentWorld, orderId: string, customerId: string, amount: number) {
  this.send(this.orderPlaced(orderId, customerId, amount));
});

When('再次送達訂單 {string} 的「庫存已保留」', function (this: PaymentWorld, orderId: string) {
  this.resend('StockReserved', orderId);
});

When('再次送達訂單 {string} 的「訂單已取消」', function (this: PaymentWorld, orderId: string) {
  this.resend('OrderCancelled', orderId);
});

// ---- Then ----

Then('顧客 {string} 的餘額應為 {int}', function (this: PaymentWorld, customerId: string, expected: number) {
  assert.equal(this.balanceOf(customerId), expected);
});

Then('付款服務發出「付款成功」事件，訂單為 {string}，金額為 {int}', function (this: PaymentWorld, orderId: string, amount: number) {
  const e = findEvent(this.lastEmitted, 'PaymentSucceeded', orderId);
  assert.ok(e, `應發出 PaymentSucceeded (${orderId})，實際為 ${JSON.stringify(this.lastEmitted)}`);
  assert.equal(e.amount, amount);
  assert.equal(this.lastEmitted.length, 1);
});

Then('付款服務發出「付款失敗」事件，訂單為 {string}', function (this: PaymentWorld, orderId: string) {
  const e = findEvent(this.lastEmitted, 'PaymentFailed', orderId);
  assert.ok(e, `應發出 PaymentFailed (${orderId})，實際為 ${JSON.stringify(this.lastEmitted)}`);
  assert.equal(this.lastEmitted.length, 1);
});

Then('付款服務發出「已退款」事件，訂單為 {string}，金額為 {int}', function (this: PaymentWorld, orderId: string, amount: number) {
  const e = findEvent(this.lastEmitted, 'PaymentRefunded', orderId);
  assert.ok(e, `應發出 PaymentRefunded (${orderId})，實際為 ${JSON.stringify(this.lastEmitted)}`);
  assert.equal(e.amount, amount);
  assert.equal(this.lastEmitted.length, 1);
});

Then('付款服務不發出任何事件', function (this: PaymentWorld) {
  assert.deepEqual(this.lastEmitted, []);
});
