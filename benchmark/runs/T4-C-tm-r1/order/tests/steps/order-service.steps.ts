// 訂單服務（ORDER_SERVICE）Step Definitions。
// 句型與 .specengine/spec/features/訂單服務.feature 逐字一致；雙引號參數一律 {string}。
// Binding Layer = direct：函式體直接呼叫 src/order.ts 的 createOrderService()。
// spec-04 產出句型契約（全部紅燈）；spec-05 只改函式體，不改句型。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import { createOrderService } from '../../src/order.js';
import type { OrderWorld } from '../support/world.js';

const service = (world: OrderWorld) => {
  if (!world.service) throw new Error('訂單服務尚未啟動：請先執行 Given 訂單服務已啟動');
  return world.service;
};

// @rule R-ORDER_SERVICE-*
// @schema none
// @binds OrderService.createOrderService
Given('訂單服務已啟動', function (this: OrderWorld) {
  this.service = createOrderService();
});

// @rule R-ORDER_SERVICE-*
// @schema orders.order_id: varchar, orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
Given(
  '顧客 {string} 已下單 {string}，商品 {string} 數量 {string} 金額 {string}，下單時間 {string}',
  function (this: OrderWorld, customerId: string, orderId: string, sku: string, qty: string, amount: string, at: string) {
    const result = service(this).placeOrder({ orderId, customerId, sku, qty: Number(qty), amount: Number(amount), at });
    assert.equal(result.ok, true, `前置下單失敗：${JSON.stringify(result)}`);
    if (result.ok) this.record(result.events);
    this.amounts.set(orderId, Number(amount));
  }
);

// @rule R-ORDER_SERVICE-004, R-ORDER_SERVICE-005, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009
// @schema orders.status: varchar, processed_events.event_id: varchar
// @binds OrderService.handle
Given('訂單 {string} 已收到事件 {string}', function (this: OrderWorld, orderId: string, type: string) {
  this.record(service(this).handle(this.buildInbound(this.nextInboundId(), type, orderId)));
});

// @rule R-ORDER_SERVICE-005, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009, R-ORDER_SERVICE-011
// @schema orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.cancelOrder
Given('訂單 {string} 已被顧客取消於 {string}', function (this: OrderWorld, orderId: string, at: string) {
  const result = service(this).cancelOrder(orderId, at);
  assert.equal(result.ok, true, `前置取消失敗：${JSON.stringify(result)}`);
  if (result.ok) this.record(result.events);
});

// @rule R-ORDER_SERVICE-006
// @schema processed_events.event_id: varchar
// @binds OrderService.handle
Given(
  '訂單服務已收到事件 {string} 類型 {string} 訂單 {string}',
  function (this: OrderWorld, id: string, type: string, orderId: string) {
    this.record(service(this).handle(this.buildInbound(id, type, orderId)));
  }
);

// @rule R-ORDER_SERVICE-005, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009
// @schema orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.tick
Given('時間已推進到 {string}', function (this: OrderWorld, now: string) {
  this.record(service(this).tick(now));
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-011, R-ORDER_SERVICE-012
// @schema orders.order_id: varchar, orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
When(
  '顧客 {string} 下單 {string}，商品 {string} 數量 {string} 金額 {string}，下單時間 {string}',
  function (this: OrderWorld, customerId: string, orderId: string, sku: string, qty: string, amount: string, at: string) {
    const result = service(this).placeOrder({ orderId, customerId, sku, qty: Number(qty), amount: Number(amount), at });
    this.lastResult = result;
    this.record(result.ok ? result.events : []);
    if (result.ok) this.amounts.set(orderId, Number(amount));
  }
);

// @rule R-ORDER_SERVICE-001, R-ORDER_SERVICE-002, R-ORDER_SERVICE-003, R-ORDER_SERVICE-006, R-ORDER_SERVICE-008, R-ORDER_SERVICE-013
// @schema orders.status: varchar, processed_events.event_id: varchar
// @binds OrderService.handle
When(
  '訂單服務收到事件 {string} 類型 {string} 訂單 {string}',
  function (this: OrderWorld, id: string, type: string, orderId: string) {
    this.record(service(this).handle(this.buildInbound(id, type, orderId)));
  }
);

// @rule R-ORDER_SERVICE-004, R-ORDER_SERVICE-009, R-ORDER_SERVICE-010
// @schema orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.cancelOrder
When('顧客取消訂單 {string} 於 {string}', function (this: OrderWorld, orderId: string, at: string) {
  const result = service(this).cancelOrder(orderId, at);
  this.lastResult = result;
  this.record(result.ok ? result.events : []);
});

// @rule R-ORDER_SERVICE-005
// @schema orders.status: varchar, orders.cancel_reason: varchar, orders.placed_at: timestamp
// @binds OrderService.tick
When('時間推進到 {string}', function (this: OrderWorld, now: string) {
  this.record(service(this).tick(now));
});

// @rule R-ORDER_SERVICE-007
// @schema orders.order_id: varchar
// @binds OrderService.getOrder
When('查詢訂單 {string}', function (this: OrderWorld, orderId: string) {
  this.lastQuery = service(this).getOrder(orderId);
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-004
// @schema none
// @binds OrderService.placeOrder
Then('命令結果為成功', function (this: OrderWorld) {
  assert.ok(this.lastResult, '尚未執行任何命令');
  assert.equal(this.lastResult.ok, true, `命令結果應為成功，實際：${JSON.stringify(this.lastResult)}`);
});

// @rule R-ORDER_SERVICE-009, R-ORDER_SERVICE-010, R-ORDER_SERVICE-011, R-ORDER_SERVICE-012
// @schema none
// @binds OrderService.placeOrder
Then('命令結果為失敗，原因 {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.lastResult, '尚未執行任何命令');
  assert.deepEqual(this.lastResult, { ok: false, reason });
});

// @rule R-ORDER_SERVICE-*
// @schema emitted_events.event_id: varchar
// @binds OrderService.handle
Then('發出的事件數為 {string}', function (this: OrderWorld, count: string) {
  assert.equal(this.lastEvents.length, Number(count), `發出的事件：${JSON.stringify(this.lastEvents)}`);
});

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-004, R-ORDER_SERVICE-005
// @schema emitted_events.type: varchar, emitted_events.order_id: varchar
// @binds OrderService.placeOrder
Then(
  '第 {string} 個發出的事件類型為 {string}，訂單為 {string}',
  function (this: OrderWorld, index: string, type: string, orderId: string) {
    const event = this.lastEvents[Number(index) - 1];
    assert.ok(event, `找不到第 ${index} 個事件`);
    assert.equal(event.type, type);
    assert.equal(event.orderId, orderId);
  }
);

// @rule R-ORDER_SERVICE-000
// @schema orders.customer_id: varchar, orders.sku: varchar, orders.qty: int, orders.amount: int, orders.placed_at: timestamp
// @binds OrderService.placeOrder
Then(
  '發出的 OrderPlaced 事件內容為顧客 {string} 商品 {string} 數量 {string} 金額 {string} 時間 {string}',
  function (this: OrderWorld, customerId: string, sku: string, qty: string, amount: string, at: string) {
    const event = this.lastEvents.find((e) => e.type === 'OrderPlaced');
    assert.ok(event && event.type === 'OrderPlaced', '沒有發出 OrderPlaced 事件');
    assert.equal(event.customerId, customerId);
    assert.equal(event.sku, sku);
    assert.equal(event.qty, Number(qty));
    assert.equal(event.amount, Number(amount));
    assert.equal(event.at, at);
  }
);

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-004, R-ORDER_SERVICE-005
// @schema emitted_events.event_id: varchar
// @binds OrderService.placeOrder
Then('所有發出的事件 id 皆為非空字串且互不重複', function (this: OrderWorld) {
  assert.ok(this.allEmitted.length > 0, '本情境尚未發出任何事件');
  const ids = this.allEmitted.map((e) => e.id);
  for (const id of ids) assert.ok(typeof id === 'string' && id.length > 0, `事件 id 不是非空字串：${JSON.stringify(id)}`);
  assert.equal(new Set(ids).size, ids.length, `事件 id 重複：${JSON.stringify(ids)}`);
});

// @rule R-ORDER_SERVICE-005
// @schema emitted_events.type: varchar, emitted_events.order_id: varchar
// @binds OrderService.tick
Then('發出的事件中含訂單 {string} 的 {string} 事件', function (this: OrderWorld, orderId: string, type: string) {
  const matches = this.lastEvents.filter((e) => e.orderId === orderId && e.type === type);
  assert.equal(matches.length, 1, `訂單 ${orderId} 的 ${type} 事件應恰有 1 個，實際 ${matches.length}`);
});

// @rule R-ORDER_SERVICE-005
// @schema emitted_events.order_id: varchar
// @binds OrderService.tick
Then('發出的事件中不含訂單 {string} 的事件', function (this: OrderWorld, orderId: string) {
  assert.equal(this.lastEvents.filter((e) => e.orderId === orderId).length, 0);
});

// @rule R-ORDER_SERVICE-*
// @schema orders.status: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 狀態為 {string}', function (this: OrderWorld, orderId: string, status: string) {
  const order = service(this).getOrder(orderId);
  assert.ok(order, `訂單 ${orderId} 不存在`);
  assert.equal(order.status, status);
});

// @rule R-ORDER_SERVICE-004, R-ORDER_SERVICE-005, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009, R-ORDER_SERVICE-011
// @schema orders.status: varchar, orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then(
  '訂單 {string} 狀態為 {string}，取消原因為 {string}',
  function (this: OrderWorld, orderId: string, status: string, reason: string) {
    const order = service(this).getOrder(orderId);
    assert.ok(order, `訂單 ${orderId} 不存在`);
    assert.deepEqual(order, { status, cancelReason: reason });
  }
);

// @rule R-ORDER_SERVICE-000, R-ORDER_SERVICE-001, R-ORDER_SERVICE-002, R-ORDER_SERVICE-003, R-ORDER_SERVICE-005, R-ORDER_SERVICE-006, R-ORDER_SERVICE-008, R-ORDER_SERVICE-009
// @schema orders.cancel_reason: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 無取消原因', function (this: OrderWorld, orderId: string) {
  const order = service(this).getOrder(orderId);
  assert.ok(order, `訂單 ${orderId} 不存在`);
  assert.equal(order.cancelReason, undefined);
});

// @rule R-ORDER_SERVICE-007, R-ORDER_SERVICE-010, R-ORDER_SERVICE-012, R-ORDER_SERVICE-013
// @schema orders.order_id: varchar
// @binds OrderService.getOrder
Then('訂單 {string} 不存在', function (this: OrderWorld, orderId: string) {
  assert.equal(service(this).getOrder(orderId), undefined);
});
