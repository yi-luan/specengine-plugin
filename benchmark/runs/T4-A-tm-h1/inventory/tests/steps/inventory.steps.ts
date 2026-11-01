// 庫存服務的 Step Definitions。事件由測試自行準備（其他服務在此專案中只是空殼）。
import { Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Event, InventoryService } from '../../src/events.js';
import { createInventoryService } from '../../src/inventory.js';

type Ctx = {
  stock: Record<string, number>;
  service?: InventoryService;
  delivered: Map<string, Event>; // key: `${type}|${orderId}`，用於重複送達
  last: Event[]; // 最近一次 handle 發出的事件
  allEmitted: Event[];
  seq: number;
};

let ctx: Ctx;

Before(() => {
  ctx = { stock: {}, delivered: new Map(), last: [], allEmitted: [], seq: 0 };
});

function service(): InventoryService {
  ctx.service ??= createInventoryService(ctx.stock);
  return ctx.service;
}

function makeEvent(fields: Record<string, unknown>): Event {
  ctx.seq += 1;
  return { id: `test-${ctx.seq}`, ...fields } as unknown as Event;
}

function deliver(event: Event): void {
  ctx.delivered.set(`${event.type}|${event.orderId}`, event);
  const out = service().handle(event);
  ctx.last = out;
  ctx.allEmitted.push(...out);
}

function orderPlaced(orderId: string, sku: string, qty: number): Event {
  return makeEvent({
    type: 'OrderPlaced',
    orderId,
    customerId: 'C1',
    sku,
    qty,
    amount: qty * 100,
    at: '2026-06-15T12:00:00Z',
  });
}

Given('庫存服務有 {string} 庫存 {int}', (sku: string, qty: number) => {
  assert.equal(ctx.service, undefined, '庫存必須在任何事件送達前設定');
  ctx.stock[sku] = qty;
});

When('收到 OrderPlaced 訂單 {string} 購買 {string} 數量 {int}', (orderId: string, sku: string, qty: number) => {
  deliver(orderPlaced(orderId, sku, qty));
});

When('收到 PaymentFailed 訂單 {string}', (orderId: string) => {
  deliver(makeEvent({ type: 'PaymentFailed', orderId }));
});

When('收到 OrderCancelled 訂單 {string}', (orderId: string) => {
  deliver(makeEvent({ type: 'OrderCancelled', orderId, }));
});

When('重複送達 {string} 訂單 {string}', (type: string, orderId: string) => {
  const original = ctx.delivered.get(`${type}|${orderId}`);
  assert.ok(original, `尚未送達過 ${type} 訂單 ${orderId}`);
  deliver(original);
});

Then('本次共發出 {int} 個事件', (n: number) => {
  assert.equal(ctx.last.length, n);
});

Then('發出的事件是 {string} 訂單 {string}', (type: string, orderId: string) => {
  assert.equal(ctx.last.length, 1, `應只發出一個事件，實際為 ${ctx.last.length} 個`);
  const [event] = ctx.last;
  assert.equal(event.type, type);
  assert.equal(event.orderId, orderId);
});

Then('SKU {string} 可供保留數量是 {int}', (sku: string, n: number) => {
  assert.equal(service().getAvailable(sku), n);
});

Then('所有已發出事件的 id 互不相同', () => {
  const ids = ctx.allEmitted.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `事件 id 有重複：${ids.join(', ')}`);
});
