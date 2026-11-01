import { Before, Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Event, PaymentService } from '../../src/events.js';
import { createPaymentService } from '../../src/payment.js';

type Ctx = {
  initialBalances: Record<string, number>;
  service: PaymentService;
  lastEmitted: Event[];
  allEmitted: Event[];
};

let ctx: Ctx;

Before(() => {
  ctx = {
    initialBalances: {},
    service: createPaymentService({}),
    lastEmitted: [],
    allEmitted: [],
  };
});

function dispatch(event: Event): void {
  ctx.lastEmitted = ctx.service.handle(event);
  ctx.allEmitted.push(...ctx.lastEmitted);
}

Given('顧客餘額如下', (table: DataTable) => {
  const balances: Record<string, number> = {};
  for (const row of table.hashes()) {
    balances[row.customerId] = Number(row.balance);
  }
  ctx.initialBalances = balances;
  ctx.service = createPaymentService(balances);
});

Given(
  '收到 OrderPlaced 事件 {string}，訂單 {string} 顧客 {string} 金額 {int}',
  (id: string, orderId: string, customerId: string, amount: number) => {
    dispatch({ id, type: 'OrderPlaced', orderId, customerId, sku: 'sku-1', qty: 1, amount, at: '2026-06-15T12:00:00Z' });
  },
);

Given('收到 StockReserved 事件 {string}，訂單 {string}', (id: string, orderId: string) => {
  dispatch({ id, type: 'StockReserved', orderId });
});

Given('收到 StockRejected 事件 {string}，訂單 {string}', (id: string, orderId: string) => {
  dispatch({ id, type: 'StockRejected', orderId });
});

Given('收到 StockReleased 事件 {string}，訂單 {string}', (id: string, orderId: string) => {
  dispatch({ id, type: 'StockReleased', orderId });
});

Given('收到 OrderCancelled 事件 {string}，訂單 {string}', (id: string, orderId: string) => {
  dispatch({ id, type: 'OrderCancelled', orderId });
});

Given('收到 PaymentSucceeded 事件 {string}，訂單 {string} 金額 {int}', (id: string, orderId: string, amount: number) => {
  dispatch({ id, type: 'PaymentSucceeded', orderId, amount });
});

Given('收到 PaymentFailed 事件 {string}，訂單 {string}', (id: string, orderId: string) => {
  dispatch({ id, type: 'PaymentFailed', orderId });
});

Given('收到 PaymentRefunded 事件 {string}，訂單 {string} 金額 {int}', (id: string, orderId: string, amount: number) => {
  dispatch({ id, type: 'PaymentRefunded', orderId, amount });
});

Then('發出 {int} 個事件', (count: number) => {
  assert.equal(ctx.lastEmitted.length, count, `emitted: ${JSON.stringify(ctx.lastEmitted)}`);
});

Then('發出的事件是 {string}，訂單 {string} 金額 {int}', (type: string, orderId: string, amount: number) => {
  assert.equal(ctx.lastEmitted.length, 1, `emitted: ${JSON.stringify(ctx.lastEmitted)}`);
  const e = ctx.lastEmitted[0];
  assert.equal(e.type, type);
  assert.equal(e.orderId, orderId);
  assert.ok('amount' in e, 'event has no amount');
  assert.equal(e.amount, amount);
  assert.equal(typeof e.id, 'string');
  assert.ok(e.id.length > 0, 'event id must not be empty');
});

Then('發出的事件是 {string}，訂單 {string}', (type: string, orderId: string) => {
  assert.equal(ctx.lastEmitted.length, 1, `emitted: ${JSON.stringify(ctx.lastEmitted)}`);
  const e = ctx.lastEmitted[0];
  assert.equal(e.type, type);
  assert.equal(e.orderId, orderId);
  assert.equal(typeof e.id, 'string');
  assert.ok(e.id.length > 0, 'event id must not be empty');
});

Then('顧客 {string} 餘額為 {int}', (customerId: string, balance: number) => {
  assert.equal(ctx.service.getBalance(customerId), balance);
});

Then('至今發出的所有事件 id 都不重複', () => {
  const ids = ctx.allEmitted.map((e) => e.id);
  assert.ok(ids.length > 0, 'no events emitted');
  assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.join(', ')}`);
});

Then('建立服務時傳入的餘額表中 {string} 仍為 {int}', (customerId: string, balance: number) => {
  assert.equal(ctx.initialBalances[customerId], balance);
});
