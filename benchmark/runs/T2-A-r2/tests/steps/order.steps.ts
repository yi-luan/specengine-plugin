import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  createOrder,
  pay,
  ship,
  cancel,
  refund,
  type Order,
  type OrderResult,
  type OrderStatus,
} from '../../src/order.js';

type World = {
  order: Order | undefined;        // 目前的訂單（最後一次成功操作的結果）
  snapshot: Order | undefined;     // 最後一次操作前傳入的 order 深拷貝（驗證純函式）
  input: Order | undefined;        // 最後一次操作實際傳入的 order 物件
  result: OrderResult | undefined; // 最後一次操作的結果
};

const world: World = { order: undefined, snapshot: undefined, input: undefined, result: undefined };

Before(() => {
  world.order = undefined;
  world.snapshot = undefined;
  world.input = undefined;
  world.result = undefined;
});

function currentOrder(): Order {
  assert.ok(world.order, '尚未有訂單可操作');
  return world.order;
}

function apply(fn: (order: Order) => OrderResult): void {
  const input = currentOrder();
  world.input = input;
  world.snapshot = structuredClone(input);
  world.result = fn(input);
  if (world.result.ok) {
    world.order = world.result.order;
  }
}

function unwrap(result: OrderResult | undefined): Order {
  assert.ok(result, '尚未執行任何操作');
  assert.ok(result.ok, `預期操作成功，實際失敗：${result.ok ? '' : result.reason}`);
  return result.order;
}

/** 以合法流程把訂單推進到指定狀態。 */
function orderInStatus(status: OrderStatus, amount: number): Order {
  let order = unwrap(createOrder('O-TEST', amount));
  if (status === 'CREATED') return order;
  if (status === 'CANCELLED') return unwrap(cancel(order));
  order = unwrap(pay(order, amount));
  if (status === 'PAID') return order;
  order = unwrap(ship(order));
  if (status === 'SHIPPED') return order;
  return unwrap(refund(order, amount)); // REFUNDED
}

Given('已有一筆狀態為 {string} 金額 {int} 的訂單', (status: OrderStatus, amount: number) => {
  world.order = orderInStatus(status, amount);
  assert.equal(world.order.status, status);
});

When('建立訂單 {string} 金額 {float}', (id: string, amount: number) => {
  world.input = undefined;
  world.snapshot = undefined;
  world.result = createOrder(id, amount);
  if (world.result.ok) {
    world.order = world.result.order;
  }
});

When('付款 {float}', (amount: number) => {
  apply((o) => pay(o, amount));
});

When('出貨', () => {
  apply((o) => ship(o));
});

When('取消', () => {
  apply((o) => cancel(o));
});

When('退款 {float}', (amount: number) => {
  apply((o) => refund(o, amount));
});

Then('操作成功', () => {
  assert.ok(world.result, '尚未執行任何操作');
  assert.ok(world.result.ok, `預期操作成功，實際失敗：${world.result.ok ? '' : world.result.reason}`);
});

Then('操作失敗', () => {
  assert.ok(world.result, '尚未執行任何操作');
  assert.equal(world.result.ok, false, '預期操作失敗，實際成功');
});

Then('失敗原因包含 {string}', (text: string) => {
  assert.ok(world.result, '尚未執行任何操作');
  assert.equal(world.result.ok, false, '預期操作失敗，實際成功');
  if (!world.result.ok) {
    assert.ok(
      world.result.reason.includes(text),
      `失敗原因「${world.result.reason}」不包含「${text}」`,
    );
  }
});

Then('訂單狀態為 {string}', (status: OrderStatus) => {
  assert.equal(unwrap(world.result).status, status);
});

Then('訂單金額為 {int}', (amount: number) => {
  assert.equal(unwrap(world.result).amount, amount);
});

Then('已付金額為 {int}', (amount: number) => {
  assert.equal(unwrap(world.result).paidAmount, amount);
});

Then('累計退款金額為 {int}', (amount: number) => {
  assert.equal(unwrap(world.result).refundedAmount, amount);
});

Then('原訂單未被修改', () => {
  assert.ok(world.input && world.snapshot, '此操作沒有傳入訂單');
  assert.deepEqual(world.input, world.snapshot, '傳入的 order 物件被修改了');
});

Then('回傳的訂單是新的物件', () => {
  const returned = unwrap(world.result);
  assert.notEqual(returned, world.input, '回傳的 order 與傳入的是同一個物件');
});
