import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createOrderService } from '../../src/order.js';
import type { CommandResult, Event, OrderService } from '../../src/events.js';

type World = {
  svc: OrderService;
  lastResult?: CommandResult;
  lastEvents: Event[];
  lastReceived?: Event;
  emitted: Event[];
  seq: number;
};

let w: World;

Before(() => {
  w = { svc: createOrderService(), lastEvents: [], emitted: [], seq: 0 };
});

function record(events: Event[]) {
  w.lastEvents = events;
  w.emitted.push(...events);
}

function applyResult(r: CommandResult) {
  w.lastResult = r;
  record(r.ok ? r.events : []);
}

function nextForeignId(): string {
  w.seq += 1;
  return `foreign-${w.seq}`;
}

function buildEvent(type: string, orderId: string, amount: number, id: string): Event {
  switch (type) {
    case 'OrderPlaced':
      return { id, type, orderId, customerId: 'x', sku: 'x', qty: 1, amount, at: '2026-06-15T12:00:00Z' };
    case 'StockReserved':
    case 'StockRejected':
    case 'StockReleased':
    case 'PaymentFailed':
    case 'OrderCancelled':
      return { id, type, orderId };
    case 'PaymentSucceeded':
    case 'PaymentRefunded':
      return { id, type, orderId, amount };
    default:
      throw new Error(`未知事件類型 ${type}`);
  }
}

Given('一個全新的訂單服務', () => {
  w.svc = createOrderService();
});

Given(
  '顧客 {string} 於 {string} 下單 {string}，商品 {string} 數量 {float} 金額 {float}',
  (customerId: string, at: string, orderId: string, sku: string, qty: number, amount: number) => {
    applyResult(w.svc.placeOrder({ orderId, customerId, sku, qty, amount, at }));
  },
);

Given('顧客於 {string} 取消訂單 {string}', (at: string, orderId: string) => {
  applyResult(w.svc.cancelOrder(orderId, at));
});

Given('時間推進到 {string}', (now: string) => {
  record(w.svc.tick(now));
});

Given('收到事件 {string} 訂單 {string}', (type: string, orderId: string) => {
  const ev = buildEvent(type, orderId, 0, nextForeignId());
  w.lastReceived = ev;
  record(w.svc.handle(ev));
});

Given('收到事件 {string} 訂單 {string} 金額 {int}', (type: string, orderId: string, amount: number) => {
  const ev = buildEvent(type, orderId, amount, nextForeignId());
  w.lastReceived = ev;
  record(w.svc.handle(ev));
});

Given(
  '收到事件 {string} 訂單 {string} 金額 {int}，事件 id {string}',
  (type: string, orderId: string, amount: number, id: string) => {
    const ev = buildEvent(type, orderId, amount, id);
    w.lastReceived = ev;
    record(w.svc.handle(ev));
  },
);

When('再次收到相同的事件', () => {
  assert.ok(w.lastReceived, '沒有先前收到的事件');
  record(w.svc.handle(w.lastReceived));
});

Then('下單成功', () => {
  assert.ok(w.lastResult, '沒有執行過命令');
  assert.equal(w.lastResult.ok, true, `預期成功，實際：${JSON.stringify(w.lastResult)}`);
});

Then('下單失敗', () => {
  assert.ok(w.lastResult, '沒有執行過命令');
  assert.equal(w.lastResult.ok, false, '預期失敗但成功了');
  if (!w.lastResult.ok) assert.ok(w.lastResult.reason.length > 0, '失敗必須附理由');
});

Then('取消成功', () => {
  assert.ok(w.lastResult, '沒有執行過命令');
  assert.equal(w.lastResult.ok, true, `預期成功，實際：${JSON.stringify(w.lastResult)}`);
});

Then('取消失敗', () => {
  assert.ok(w.lastResult, '沒有執行過命令');
  assert.equal(w.lastResult.ok, false, '預期失敗但成功了');
  if (!w.lastResult.ok) assert.ok(w.lastResult.reason.length > 0, '失敗必須附理由');
  assert.deepEqual(w.lastEvents, [], '取消失敗不應發出事件');
});

Then('不應發出任何事件', () => {
  assert.deepEqual(w.lastEvents, []);
});

Then(
  '應發出 {int} 個 {string} 事件，內容為 orderId {string}、customerId {string}、sku {string}、qty {int}、amount {int}、at {string}',
  (n: number, type: string, orderId: string, customerId: string, sku: string, qty: number, amount: number, at: string) => {
    assert.equal(w.lastEvents.length, n, `事件數不符：${JSON.stringify(w.lastEvents)}`);
    const ev = w.lastEvents[0];
    assert.equal(ev.type, type);
    assert.ok(typeof ev.id === 'string' && ev.id.length > 0, '事件必須有 id');
    assert.deepEqual(
      { ...ev, id: undefined },
      { id: undefined, type, orderId, customerId, sku, qty, amount, at },
    );
  },
);

Then('應發出 {int} 個 {string} 事件，訂單 {string}', (n: number, type: string, orderId: string) => {
  assert.equal(w.lastEvents.length, n, `事件數不符：${JSON.stringify(w.lastEvents)}`);
  for (const ev of w.lastEvents) {
    assert.equal(ev.type, type);
    assert.equal(ev.orderId, orderId);
    assert.ok(typeof ev.id === 'string' && ev.id.length > 0, '事件必須有 id');
  }
});

Then('訂單 {string} 狀態為 {string}', (orderId: string, status: string) => {
  const o = w.svc.getOrder(orderId);
  assert.ok(o, `找不到訂單 ${orderId}`);
  assert.equal(o.status, status);
  assert.equal(o.cancelReason, undefined, '非取消狀態不應有取消原因');
});

Then('訂單 {string} 狀態為 {string}，取消原因 {string}', (orderId: string, status: string, reason: string) => {
  const o = w.svc.getOrder(orderId);
  assert.ok(o, `找不到訂單 ${orderId}`);
  assert.equal(o.status, status);
  assert.equal(o.cancelReason, reason);
});

Then('查無訂單 {string}', (orderId: string) => {
  assert.equal(w.svc.getOrder(orderId), undefined);
});

Then('目前為止發出的事件 id 全部不重複且皆以 {string} 開頭', (prefix: string) => {
  assert.ok(w.emitted.length >= 2, '測試資料不足');
  const ids = w.emitted.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `事件 id 重複：${ids.join(',')}`);
  for (const id of ids) assert.ok(id.startsWith(prefix), `事件 id ${id} 未以 ${prefix} 開頭`);
});
