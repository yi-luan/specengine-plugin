// 付款服務的 Step Definitions（Binding Layer: direct，step 直接接 PaymentService 介面）。
// 句型字串是 spec-guard 凍結的契約，函式體由 spec-05 實作。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { Event } from '../../src/events.js';
import type { PaymentWorld } from '../support/world.js';
import { PaymentProbe } from '../support/payment-probe.js';

const AT = '2026-06-15T12:00:00Z';

function placed(orderId: string, customerId: string, amount: number): Event {
  return { id: `order-placed-${orderId}`, type: 'OrderPlaced', orderId, customerId, sku: 'SKU-1', qty: 1, amount, at: AT };
}
function reserved(id: string, orderId: string): Event {
  return { id, type: 'StockReserved', orderId };
}
function cancelled(id: string, orderId: string): Event {
  return { id, type: 'OrderCancelled', orderId };
}

// @rule R-PAYMENT-*
// @schema balance_account.balance: int
// @binds createPaymentService
// @binds PaymentService.getBalance
// 同一句型在 Given（設定初始餘額）與 Then（驗證餘額）都會出現；
// 尚未建立服務時視為設定，已建立服務時視為驗證。
Given('顧客 {string} 餘額為 {string}', function (this: PaymentWorld, customerId: string, balance: string) {
  if (!this.service) {
    this.balances[customerId] = Number(balance);
    return;
  }
  assert.strictEqual(this.balanceOf(customerId), Number(balance));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Given('付款服務已收到訂單 {string} 的下單事件，顧客為 {string}，金額為 {string}', function (this: PaymentWorld, orderId: string, customerId: string, amount: string) {
  this.setup(placed(orderId, customerId, Number(amount)));
});

// @rule R-PAYMENT-*
// @schema none
// @binds none（前置條件的否定，無動作）
Given('付款服務尚未收到訂單 {string} 的下單事件', function (this: PaymentWorld, orderId: string) {
  // 不送入下單事件即可
});

// @rule R-PAYMENT-*
// @schema none
// @binds createPaymentService
Given('顧客 {string} 未登錄餘額', function (this: PaymentWorld, customerId: string) {
  // 初始餘額表不含此顧客即可
});

// @rule R-PAYMENT-*
// @schema payment_charge.amount: int
// @binds PaymentService.handle
Given('訂單 {string} 已被扣款 {string}，顧客為 {string}', function (this: PaymentWorld, orderId: string, amount: string, customerId: string) {
  // 步驟文字的餘額是扣款後的餘額，建立服務前把扣款金額加回初始餘額
  if (!this.service) this.balances[customerId] = (this.balances[customerId] ?? 0) + Number(amount);
  this.setup(placed(orderId, customerId, Number(amount)));
  this.setup(reserved(`stock-reserved-${orderId}`, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds none（前置條件的否定，無動作）
Given('訂單 {string} 從未被扣款', function (this: PaymentWorld, orderId: string) {
  // 不送入庫存保留事件即可
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Given('訂單 {string} 已被退款', function (this: PaymentWorld, orderId: string) {
  // 步驟未指定金額；退款前後淨額為 0，因此用 50 建立「扣款後全額退款」的狀態
  const customerId = Object.keys(this.balances)[0] ?? 'C1';
  this.setup(placed(orderId, customerId, 50));
  this.setup(reserved(`stock-reserved-${orderId}`, orderId));
  this.setup(cancelled(`cancel-${orderId}`, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Given('訂單 {string} 已被記錄為已取消', function (this: PaymentWorld, orderId: string) {
  this.setup(cancelled(`cancel-${orderId}`, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
When('付款服務收到庫存保留事件 {string}，訂單為 {string}', function (this: PaymentWorld, eventId: string, orderId: string) {
  this.act(reserved(eventId, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
When('付款服務再次收到庫存保留事件 {string}，訂單為 {string}', function (this: PaymentWorld, eventId: string, orderId: string) {
  this.act(reserved(eventId, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
When('付款服務收到取消事件 {string}，訂單為 {string}', function (this: PaymentWorld, eventId: string, orderId: string) {
  this.act(cancelled(eventId, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
When('付款服務再次收到取消事件 {string}，訂單為 {string}', function (this: PaymentWorld, eventId: string, orderId: string) {
  this.act(cancelled(eventId, orderId));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
When('付款服務收到訂單 {string} 的下單事件，顧客為 {string}，金額為 {string}', function (this: PaymentWorld, orderId: string, customerId: string, amount: string) {
  this.act(placed(orderId, customerId, Number(amount)));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Then('付款服務發出事件 {string}', function (this: PaymentWorld, eventType: string) {
  assert.ok(this.emitted.some((e) => e.type === eventType), `未發出 ${eventType}`);
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Then('付款服務未發出事件 {string}', function (this: PaymentWorld, eventType: string) {
  assert.ok(!this.emitted.some((e) => e.type === eventType), `不應發出 ${eventType}`);
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Then('付款服務只發出一次事件 {string}', function (this: PaymentWorld, eventType: string) {
  assert.strictEqual(this.emitted.filter((e) => e.type === eventType).length, 1);
});

// @rule R-PAYMENT-*
// @schema payment_charge.amount: int
// @binds PaymentService.handle
Then('付款服務發出的 {string} 金額為 {string}', function (this: PaymentWorld, eventType: string, amount: string) {
  const ev = this.emitted.find((e) => e.type === eventType);
  assert.ok(ev && 'amount' in ev, `未發出含金額的 ${eventType}`);
  assert.strictEqual(ev.amount, Number(amount));
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentService.handle
Then('付款服務不發出任何事件', function (this: PaymentWorld) {
  assert.strictEqual(this.emitted.length, 0, `不應發出事件，實際：${this.emitted.map((e) => e.type).join(',')}`);
});

// @rule R-PAYMENT-*
// @schema payment_charge.amount: int
// @binds PaymentProbe.chargeOf
Then('訂單 {string} 記錄為已扣款，金額為 {string}', function (this: PaymentWorld, orderId: string, amount: string) {
  assert.strictEqual(PaymentProbe.chargeOf(this.ensureService(), orderId), Number(amount));
});

// @rule R-PAYMENT-*
// @schema payment_charge.status: varchar
// @binds PaymentProbe.statusOf
Then('訂單 {string} 記錄為已退款', function (this: PaymentWorld, orderId: string) {
  assert.strictEqual(PaymentProbe.statusOf(this.ensureService(), orderId), 'REFUNDED');
});

// @rule R-PAYMENT-*
// @schema payment_charge.status: varchar
// @binds PaymentProbe.statusOf
Then('訂單 {string} 記錄為已取消', function (this: PaymentWorld, orderId: string) {
  assert.strictEqual(PaymentProbe.statusOf(this.ensureService(), orderId), 'CANCELLED');
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentProbe.pendingOf
Then('付款服務暫存訂單 {string} 的庫存保留事件', function (this: PaymentWorld, orderId: string) {
  assert.strictEqual(PaymentProbe.pendingOf(this.ensureService(), orderId), true);
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentProbe.pendingOf
Then('付款服務不再暫存訂單 {string} 的庫存保留事件', function (this: PaymentWorld, orderId: string) {
  assert.strictEqual(PaymentProbe.pendingOf(this.ensureService(), orderId), false);
});

// @rule R-PAYMENT-*
// @schema none
// @binds PaymentProbe.pendingOf
Then('訂單 {string} 沒有暫存的庫存保留事件', function (this: PaymentWorld, orderId: string) {
  assert.strictEqual(PaymentProbe.pendingOf(this.ensureService(), orderId), false);
});
