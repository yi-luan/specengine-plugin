// 付款服務（PAYMENT）Step Definitions。句型字串與 .specengine/spec/features/付款服務.feature 一致，
// spec-05 期間由 spec-guard.js 凍結句型；函式體可自由實作。
// Binding Layer = direct：@binds 指向被測 Service（PaymentService）的方法。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { PaymentWorld } from '../support/world.js';

// @rule R-PAYMENT-*
// @schema customer_balance.customer_id: varchar, customer_balance.balance: int
// @binds PaymentService.createPaymentService
Given('顧客 {string} 的初始餘額為 {string}', function (this: PaymentWorld, customerId: string, balance: string) {
  this.initialBalances[customerId] = Number(balance);
});

// @rule R-PAYMENT-*
// @schema payment_order.order_id: varchar, payment_order.customer_id: varchar, payment_order.amount: int, processed_event.id: varchar
// @binds PaymentService.handle
Given('付款服務已收到訂單 {string} 的下單事件，id 為 {string}，顧客 {string}，金額 {string}', function (this: PaymentWorld, orderId: string, eventId: string, customerId: string, amount: string) {
  this.feed(this.buildOrderPlaced(orderId, eventId, customerId, Number(amount)));
});

// @rule R-PAYMENT-*
// @schema payment_order.order_id: varchar, payment_order.status: varchar, processed_event.id: varchar
// @binds PaymentService.handle
Given('付款服務已收到訂單 {string} 的 {string} 事件，id 為 {string}', function (this: PaymentWorld, orderId: string, type: string, eventId: string) {
  this.feed(this.buildEvent(type, orderId, eventId));
});

// @rule R-PAYMENT-002, R-PAYMENT-008, R-PAYMENT-009, R-PAYMENT-011, R-PAYMENT-015
// @schema payment_order.order_id: varchar, payment_order.customer_id: varchar, payment_order.amount: int, processed_event.id: varchar
// @binds PaymentService.handle
When('付款服務收到訂單 {string} 的下單事件，id 為 {string}，顧客 {string}，金額 {string}', function (this: PaymentWorld, orderId: string, eventId: string, customerId: string, amount: string) {
  this.feed(this.buildOrderPlaced(orderId, eventId, customerId, Number(amount)));
});

// @rule R-PAYMENT-000, R-PAYMENT-001, R-PAYMENT-003, R-PAYMENT-004, R-PAYMENT-005, R-PAYMENT-007, R-PAYMENT-009, R-PAYMENT-010, R-PAYMENT-011, R-PAYMENT-012, R-PAYMENT-013, R-PAYMENT-014, R-PAYMENT-015
// @schema payment_order.order_id: varchar, payment_order.status: varchar, processed_event.id: varchar
// @binds PaymentService.handle
When('付款服務收到訂單 {string} 的 {string} 事件，id 為 {string}', function (this: PaymentWorld, orderId: string, type: string, eventId: string) {
  this.feed(this.buildEvent(type, orderId, eventId));
});

// @rule R-PAYMENT-006
// @schema customer_balance.customer_id: varchar, customer_balance.balance: int
// @binds PaymentService.getBalance
When('查詢顧客 {string} 的餘額', function (this: PaymentWorld, customerId: string) {
  this.lastBalance = this.getService().getBalance(customerId);
});

// @rule R-PAYMENT-000, R-PAYMENT-003, R-PAYMENT-008, R-PAYMENT-015
// @schema emitted_event.type: varchar, emitted_event.order_id: varchar, emitted_event.amount: int
// @binds PaymentService.handle
Then('回傳恰好 {string} 個事件，類型為 {string}，訂單 {string}，金額 {string}', function (this: PaymentWorld, count: string, type: string, orderId: string, amount: string) {
  assert.equal(this.lastResult.length, Number(count), `回傳事件數應為 ${count}，實際 ${JSON.stringify(this.lastResult)}`);
  const ev = this.lastResult[0];
  assert.equal(ev.type, type);
  assert.equal(ev.orderId, orderId);
  assert.ok('amount' in ev, `事件 ${ev.type} 應帶 amount`);
  assert.equal((ev as { amount: number }).amount, Number(amount));
});

// @rule R-PAYMENT-001, R-PAYMENT-008, R-PAYMENT-010
// @schema emitted_event.type: varchar, emitted_event.order_id: varchar
// @binds PaymentService.handle
Then('回傳恰好 {string} 個事件，類型為 {string}，訂單 {string}', function (this: PaymentWorld, count: string, type: string, orderId: string) {
  assert.equal(this.lastResult.length, Number(count), `回傳事件數應為 ${count}，實際 ${JSON.stringify(this.lastResult)}`);
  const ev = this.lastResult[0];
  assert.equal(ev.type, type);
  assert.equal(ev.orderId, orderId);
});

// @rule R-PAYMENT-002, R-PAYMENT-004, R-PAYMENT-005, R-PAYMENT-007, R-PAYMENT-009, R-PAYMENT-011, R-PAYMENT-012, R-PAYMENT-013, R-PAYMENT-014, R-PAYMENT-015
// @schema none
// @binds PaymentService.handle
Then('回傳空陣列', function (this: PaymentWorld) {
  assert.deepEqual(this.lastResult, []);
});

// @rule R-PAYMENT-000, R-PAYMENT-001, R-PAYMENT-003, R-PAYMENT-008
// @schema emitted_event.id: varchar
// @binds PaymentService.handle
Then('回傳事件的 id 為未曾出現過的新值', function (this: PaymentWorld) {
  assert.ok(this.lastResult.length > 0, '應有回傳事件');
  for (const ev of this.lastResult) assert.equal(typeof ev.id, 'string');
  for (const ev of this.lastResult) assert.ok(ev.id.length > 0, '事件 id 不得為空');
  assert.ok(this.lastResultIdsFresh, `回傳事件 id 與先前出現過的 id 重複：${JSON.stringify(this.lastResult.map((e) => e.id))}`);
});

// @rule R-PAYMENT-*
// @schema customer_balance.customer_id: varchar, customer_balance.balance: int
// @binds PaymentService.getBalance
Then('顧客 {string} 的餘額為 {string}', function (this: PaymentWorld, customerId: string, expected: string) {
  assert.equal(this.getService().getBalance(customerId), Number(expected));
});

// @rule R-PAYMENT-006
// @schema customer_balance.balance: int
// @binds PaymentService.getBalance
Then('查詢結果為 {string}', function (this: PaymentWorld, expected: string) {
  assert.equal(this.lastBalance, Number(expected));
});
