// 付款服務的 Step Definitions。事件由測試自行準備，模擬其他服務送來的廣播。
import { Before, Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createPaymentService } from '../../src/payment.js';
import type { Event, PaymentService } from '../../src/events.js';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

let balances: Record<string, number> = {};
let svc: PaymentService | undefined;
let seq = 0;
let lastSent: Event | undefined;
let lastOut: Event[] = [];
let emitted: Event[] = [];

Before(() => {
  balances = {};
  svc = undefined;
  seq = 0;
  lastSent = undefined;
  lastOut = [];
  emitted = [];
});

function service(): PaymentService {
  if (!svc) svc = createPaymentService(balances);
  return svc;
}

function deliver(ev: Event): void {
  lastSent = ev;
  lastOut = service().handle(ev);
  emitted.push(...lastOut);
}

function send(e: DistributiveOmit<Event, 'id'>): void {
  deliver({ id: `test-${++seq}`, ...e } as Event);
}

Given('顧客 {string} 的餘額為 {int}', (customerId: string, amount: number) => {
  balances[customerId] = amount;
});

When('訂單 {string} 由顧客 {string} 下單，金額為 {int}', (orderId: string, customerId: string, amount: number) => {
  send({
    type: 'OrderPlaced',
    orderId,
    customerId,
    sku: 'SKU-1',
    qty: 1,
    amount,
    at: '2026-06-15T12:00:00Z',
  });
});

When('庫存已為訂單 {string} 保留', (orderId: string) => {
  send({ type: 'StockReserved', orderId });
});

When('訂單 {string} 被取消', (orderId: string) => {
  send({ type: 'OrderCancelled', orderId });
});

When('重送上一個事件', () => {
  assert.ok(lastSent, '沒有可重送的上一個事件');
  deliver(lastSent);
});

Then('付款服務發出 {string}', (type: string) => {
  assert.ok(lastOut.some((e) => e.type === type), `預期發出 ${type}，實際為 ${JSON.stringify(lastOut)}`);
});

Then('付款服務發出 {string}，金額為 {int}', (type: string, amount: number) => {
  const found = lastOut.find((e) => e.type === type);
  assert.ok(found, `預期發出 ${type}，實際為 ${JSON.stringify(lastOut)}`);
  assert.equal((found as { amount?: number }).amount, amount);
});

Then('付款服務不發出任何事件', () => {
  assert.deepEqual(lastOut, []);
});

Then('付款服務累計發出 {string} 共 {int} 次', (type: string, times: number) => {
  assert.equal(emitted.filter((e) => e.type === type).length, times);
});

Then('顧客 {string} 的餘額應為 {int}', (customerId: string, amount: number) => {
  assert.equal(service().getBalance(customerId), amount);
});
