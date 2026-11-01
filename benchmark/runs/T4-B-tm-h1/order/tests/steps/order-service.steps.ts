import { Before, Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createOrderService } from '../../src/order.js';
import type { CommandResult, Event, OrderService, OrderStatus } from '../../src/events.js';

// 其他服務（庫存、付款）會送來的事件由測試自行建立，id 在測試內全域唯一。
const DEFAULT_AT = '2026-06-15T12:00:00Z';
const DEFAULT_CUSTOMER = 'C-1';
const DEFAULT_SKU = 'A';

let svc: OrderService;
let lastResult: CommandResult | undefined;
let lastEvents: Event[] = [];
let lastEvent: Event | undefined;
let seq = 0;

function nextId(): string {
  seq += 1;
  return `test:${seq}`;
}

function makeOtherEvent(type: string, orderId: string): Event {
  const id = nextId();
  switch (type) {
    case 'PaymentSucceeded':
    case 'PaymentRefunded':
      return { id, type, orderId, amount: 100 } as Event;
    case 'StockReserved':
    case 'StockRejected':
    case 'StockReleased':
    case 'PaymentFailed':
      return { id, type, orderId } as Event;
    default:
      throw new Error(`未知的事件型別：${type}`);
  }
}

function deliver(event: Event): void {
  lastEvent = event;
  lastEvents = svc.handle(event);
}

function placeDefault(orderId: string, at: string): CommandResult {
  return svc.placeOrder({
    orderId,
    customerId: DEFAULT_CUSTOMER,
    sku: DEFAULT_SKU,
    qty: 1,
    amount: 100,
    at,
  });
}

function ensureOrder(orderId: string, at: string): void {
  if (svc.getOrder(orderId) === undefined) {
    const r = placeDefault(orderId, at);
    assert.equal(r.ok, true, `測試前置條件：下單失敗 ${JSON.stringify(r)}`);
  }
}

function setStatus(orderId: string, status: OrderStatus, at = DEFAULT_AT): void {
  ensureOrder(orderId, at);
  switch (status) {
    case 'PENDING':
      return;
    case 'CONFIRMED':
      deliver(makeOtherEvent('PaymentSucceeded', orderId));
      return;
    case 'REJECTED':
      deliver(makeOtherEvent('StockRejected', orderId));
      return;
    case 'FAILED':
      deliver(makeOtherEvent('PaymentFailed', orderId));
      return;
    case 'CANCELLED': {
      const r = svc.cancelOrder(orderId, at);
      assert.equal(r.ok, true, '測試前置條件：取消失敗');
      return;
    }
  }
}

Before(() => {
  svc = createOrderService();
  lastResult = undefined;
  lastEvents = [];
  lastEvent = undefined;
  seq = 0;
});

// ---- 前置條件 ----

Given(/^訂單 "([^"]+)" 處於 "([A-Z]+)" 狀態$/, (orderId: string, status: string) => {
  setStatus(orderId, status as OrderStatus);
});

Given(
  /^訂單 "([^"]+)" 於 "([^"]+)" 下單且處於 "([A-Z]+)" 狀態$/,
  (orderId: string, at: string, status: string) => {
    ensureOrder(orderId, at);
    setStatus(orderId, status as OrderStatus, at);
  },
);

// ---- 動作（When 與 Given 共用文字的步驟只定義一次） ----

When(
  /^顧客下單 "([^"]+)" 數量 (-?[\d.]+) 金額 (-?[\d.]+)$/,
  (orderId: string, qty: string, amount: string) => {
    lastResult = svc.placeOrder({
      orderId,
      customerId: DEFAULT_CUSTOMER,
      sku: DEFAULT_SKU,
      qty: Number(qty),
      amount: Number(amount),
      at: DEFAULT_AT,
    });
    lastEvents = lastResult.ok ? lastResult.events : [];
  },
);

When(/^顧客取消訂單 "([^"]+)"$/, (orderId: string) => {
  lastResult = svc.cancelOrder(orderId, DEFAULT_AT);
  lastEvents = lastResult.ok ? lastResult.events : [];
});

When(/^服務收到事件 "([A-Za-z]+)" 針對訂單 "([^"]+)"$/, (type: string, orderId: string) => {
  deliver(makeOtherEvent(type, orderId));
});

When(/^再次收到同一個事件$/, () => {
  assert.ok(lastEvent, '測試前置條件：沒有可重送的事件');
  deliver(lastEvent);
});

When(/^時間推進到 "([^"]+)"$/, (now: string) => {
  lastEvents = svc.tick(now);
});

// ---- 結果檢查 ----

Then(/^回傳成功$/, () => {
  assert.ok(lastResult, '沒有指令結果');
  assert.equal(lastResult.ok, true, JSON.stringify(lastResult));
});

Then(/^回傳失敗$/, () => {
  assert.ok(lastResult, '沒有指令結果');
  assert.equal(lastResult.ok, false, '預期失敗但回傳成功');
});

Then(/^回傳失敗 原因為 "([A-Z_]+)"$/, (reason: string) => {
  assert.ok(lastResult, '沒有指令結果');
  assert.equal(lastResult.ok, false, '預期失敗但回傳成功');
  if (!lastResult.ok) assert.equal(lastResult.reason, reason);
});

Then(/^回傳事件包含 "([A-Za-z]+)"$/, (type: string) => {
  assert.ok(
    lastEvents.some((e) => e.type === type),
    `預期事件包含 ${type}，實際：${lastEvents.map((e) => e.type).join(', ')}`,
  );
});

Then(/^回傳的 OrderPlaced 數量為 (\d+) 且金額為 (\d+)$/, (qty: string, amount: string) => {
  const e = lastEvents.find((x) => x.type === 'OrderPlaced');
  assert.ok(e && e.type === 'OrderPlaced', '沒有 OrderPlaced 事件');
  assert.equal(e.qty, Number(qty));
  assert.equal(e.amount, Number(amount));
  assert.equal(e.orderId, 'O-1');
  assert.equal(e.customerId, DEFAULT_CUSTOMER);
  assert.equal(e.sku, DEFAULT_SKU);
  assert.equal(e.at, DEFAULT_AT);
});

Then(/^本次發出的事件數為 (\d+)$/, (n: string) => {
  assert.equal(lastEvents.length, Number(n), `實際事件：${JSON.stringify(lastEvents)}`);
});

Then(/^訂單 "([^"]+)" 狀態為 "([A-Z]+)"$/, (orderId: string, status: string) => {
  assert.equal(svc.getOrder(orderId)?.status, status);
});

Then(/^訂單 "([^"]+)" 取消原因為 "([A-Z]+)"$/, (orderId: string, reason: string) => {
  assert.equal(svc.getOrder(orderId)?.cancelReason, reason);
});

Then(/^訂單 "([^"]+)" 不存在$/, (orderId: string) => {
  assert.equal(svc.getOrder(orderId), undefined);
});
