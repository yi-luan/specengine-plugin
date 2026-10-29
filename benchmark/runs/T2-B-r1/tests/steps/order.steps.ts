import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {
  cancel,
  createOrder,
  pay,
  refund,
  ship,
  type Order,
  type OrderResult,
  type OrderStatus,
} from '../../src/order.js';
import type { OrderWorld } from '../support/world.js';

const STATUSES: readonly OrderStatus[] = ['CREATED', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED'];

function asStatus(value: string): OrderStatus {
  assert.ok((STATUSES as readonly string[]).includes(value), `未知狀態：${value}`);
  return value as OrderStatus;
}

function currentOrder(world: OrderWorld): Order {
  assert.ok(world.order, '尚未有訂單（請先用 Given 建構或成功建立訂單）');
  return world.order;
}

/** 執行一次操作：記錄傳入物件與快照，成功時把手上的訂單換成新訂單。 */
function perform(world: OrderWorld, run: (order: Order) => OrderResult): void {
  const input = currentOrder(world);
  world.input = input;
  world.snapshot = structuredClone(input);
  const result = run(input);
  world.result = result;
  if (result.ok) {
    world.order = result.order;
  }
}

Given(
  '一筆狀態為 {word}、金額 {int}、已付 {int}、已退 {int} 的訂單',
  function (this: OrderWorld, status: string, amount: number, paid: number, refunded: number) {
    this.order = {
      id: 'o-1',
      status: asStatus(status),
      amount,
      paidAmount: paid,
      refundedAmount: refunded,
    };
    this.input = undefined;
    this.snapshot = undefined;
    this.result = undefined;
  },
);

When('以 id {string}、金額 {float} 建立訂單', function (this: OrderWorld, id: string, amount: number) {
  this.input = undefined;
  this.snapshot = undefined;
  const result = createOrder(id, amount);
  this.result = result;
  if (result.ok) {
    this.order = result.order;
  }
});

When('付款 {int}', function (this: OrderWorld, amount: number) {
  perform(this, (order) => pay(order, amount));
});

When('出貨', function (this: OrderWorld) {
  perform(this, (order) => ship(order));
});

When('取消訂單', function (this: OrderWorld) {
  perform(this, (order) => cancel(order));
});

When('退款 {int}', function (this: OrderWorld, amount: number) {
  perform(this, (order) => refund(order, amount));
});

When('執行 {word}', function (this: OrderWorld, action: string) {
  switch (action) {
    case 'pay':
      perform(this, (order) => pay(order, order.amount));
      break;
    case 'ship':
      perform(this, (order) => ship(order));
      break;
    case 'cancel':
      perform(this, (order) => cancel(order));
      break;
    case 'refund':
      perform(this, (order) => refund(order, 1));
      break;
    default:
      assert.fail(`未知操作：${action}`);
  }
});

Then('操作成功且訂單狀態為 {word}', function (this: OrderWorld, status: string) {
  const result = this.result;
  assert.ok(result, '尚未執行任何操作');
  assert.ok(result.ok, `預期成功，實際失敗：${result.ok ? '' : result.reason}`);
  assert.equal(result.order.status, asStatus(status));
});

Then('操作失敗且原因為 {word}', function (this: OrderWorld, reason: string) {
  const result = this.result;
  assert.ok(result, '尚未執行任何操作');
  assert.equal(result.ok, false, '預期失敗，實際成功');
  if (!result.ok) {
    assert.equal(result.reason, reason);
  }
});

Then(
  '訂單的 amount 為 {int}、paidAmount 為 {int}、refundedAmount 為 {int}',
  function (this: OrderWorld, amount: number, paid: number, refunded: number) {
    const result = this.result;
    assert.ok(result && result.ok, '預期有成功結果');
    assert.deepEqual(
      { amount: result.order.amount, paidAmount: result.order.paidAmount, refundedAmount: result.order.refundedAmount },
      { amount, paidAmount: paid, refundedAmount: refunded },
    );
  },
);

Then('訂單的 id 為 {string}', function (this: OrderWorld, id: string) {
  const result = this.result;
  assert.ok(result && result.ok, '預期有成功結果');
  assert.equal(result.order.id, id);
});

Then('傳入的訂單未被修改', function (this: OrderWorld) {
  assert.ok(this.input && this.snapshot, '此步驟需要先有一個帶訂單的 When 操作');
  assert.deepEqual(this.input, this.snapshot);
});

Then('回傳的訂單是新的物件', function (this: OrderWorld) {
  const result = this.result;
  assert.ok(result && result.ok, '預期有成功結果');
  assert.ok(this.input, '此步驟需要先有一個帶訂單的 When 操作');
  assert.notEqual(result.order, this.input, '回傳的訂單必須是新的物件參考');
});
