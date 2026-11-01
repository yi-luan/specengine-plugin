import assert from 'node:assert/strict';
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { createOrderService } from '../../src/order.js';
import type { CommandResult, Event, OrderService } from '../../src/events.js';

// 每個情境重新建立訂單服務，並清空上一步的結果。
let service: OrderService;
let lastResult: CommandResult | undefined;
let lastEvents: Event[] = [];
let lastDelivered: Event | undefined;
let eventCounter = 0;

Before(function () {
  service = createOrderService();
  lastResult = undefined;
  lastEvents = [];
  lastDelivered = undefined;
  eventCounter = 0;
});

// 其他服務（庫存、付款）發出的事件由測試自行產生。
function makeEvent(type: string, orderId: string): Event {
  eventCounter += 1;
  const id = `test-evt-${eventCounter}`;
  switch (type) {
    case 'StockRejected':
    case 'PaymentFailed':
      return { id, type, orderId } as Event;
    case 'PaymentSucceeded':
      return { id, type, orderId, amount: 100 } as Event;
    default:
      throw new Error(`測試未支援的事件類型：${type}`);
  }
}

function deliver(event: Event): void {
  lastDelivered = event;
  lastEvents = service.handle(event);
}

Given('訂單服務已啟動', function () {
  // 由 Before 鉤子處理。
});

When('下單 {string} 顧客 {string} 商品 {string} 數量 {int} 金額 {int} 時間 {string}',
  function (orderId: string, customerId: string, sku: string, qty: number, amount: number, at: string) {
    lastResult = service.placeOrder({ orderId, customerId, sku, qty, amount, at });
    lastEvents = lastResult.ok ? lastResult.events : [];
  });

Then('下單結果應為成功', function () {
  assert.equal(lastResult?.ok, true, `預期下單成功，實際：${JSON.stringify(lastResult)}`);
});

Then('下單結果應為失敗', function () {
  assert.equal(lastResult?.ok, false, `預期下單失敗，實際：${JSON.stringify(lastResult)}`);
});

Then('應發出事件 {string}', function (type: string) {
  assert.ok(
    lastEvents.some((e) => e.type === type),
    `預期發出 ${type}，實際：${lastEvents.map((e) => e.type).join(', ') || '（無）'}`,
  );
});

Then('不應發出任何事件', function () {
  assert.deepEqual(lastEvents.map((e) => e.type), []);
});

Then('訂單 {string} 狀態應為 {string}', function (orderId: string, status: string) {
  assert.equal(service.getOrder(orderId)?.status, status);
});

Then('訂單 {string} 不存在', function (orderId: string) {
  assert.equal(service.getOrder(orderId), undefined);
});

Then('訂單 {string} 取消原因應為 {string}', function (orderId: string, reason: string) {
  assert.equal(service.getOrder(orderId)?.cancelReason, reason);
});

When('收到事件 {string} 訂單 {string}', function (type: string, orderId: string) {
  deliver(makeEvent(type, orderId));
});

When('再次收到同一個事件', function () {
  assert.ok(lastDelivered, '尚未收到任何事件');
  deliver(lastDelivered);
});

When('顧客取消訂單 {string} 時間 {string}', function (orderId: string, at: string) {
  lastResult = service.cancelOrder(orderId, at);
  lastEvents = lastResult.ok ? lastResult.events : [];
});

Then('取消結果應為成功', function () {
  assert.equal(lastResult?.ok, true, `預期取消成功，實際：${JSON.stringify(lastResult)}`);
});

Then('取消結果應為失敗', function () {
  assert.equal(lastResult?.ok, false, `預期取消失敗，實際：${JSON.stringify(lastResult)}`);
});

When('時間推進到 {string}', function (now: string) {
  lastEvents = service.tick(now);
});
