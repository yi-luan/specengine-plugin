import { Given, When, Then, World, setWorldConstructor } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import * as order from '../../src/order.js';
import type { Order, OrderResult, OrderStatus } from '../../src/order.js';

const STATUS_BY_LABEL: Record<string, OrderStatus> = {
  已建立: 'CREATED',
  已付款: 'PAID',
  已出貨: 'SHIPPED',
  已取消: 'CANCELLED',
  已退款: 'REFUNDED',
};

class OrderWorld extends World {
  order?: Order;
  result?: OrderResult;
  snapshot?: string;
  original?: Order;
  seq = 0;

  nextId(): string {
    this.seq += 1;
    return `O-${this.seq}`;
  }
}
setWorldConstructor(OrderWorld);

function requireOrder(w: OrderWorld): Order {
  assert.ok(w.order, '尚未有訂單');
  return w.order;
}

// 執行一個以既有訂單為輸入的操作；記錄操作前快照與結果，成功時更新目前訂單。
function runOnOrder(w: OrderWorld, op: (o: Order) => OrderResult): void {
  const current = requireOrder(w);
  w.original = current;
  w.snapshot = JSON.stringify(current);
  w.result = op(current);
  if (w.result.ok) w.order = w.result.order;
}

function create(w: OrderWorld, amount: number): void {
  w.result = order.createOrder(w.nextId(), amount);
  assert.equal(w.result.ok, true, '建立訂單失敗，無法準備前置狀態');
  w.order = w.result.order;
}

function pay(w: OrderWorld, amount: number): void {
  runOnOrder(w, (o) => order.pay(o, amount));
  assert.equal(w.result?.ok, true, '付款失敗，無法準備前置狀態');
}

// ---- Given：前置狀態皆透過公開操作建立 ----

Given('已建立金額為 {int} 元的訂單', function (this: OrderWorld, amount: number) {
  create(this, amount);
});

Given('已付款的金額為 {int} 元的訂單', function (this: OrderWorld, amount: number) {
  create(this, amount);
  pay(this, amount);
});

Given('已出貨的金額為 {int} 元的訂單', function (this: OrderWorld, amount: number) {
  create(this, amount);
  pay(this, amount);
  runOnOrder(this, (o) => order.ship(o));
  assert.equal(this.result?.ok, true, '出貨失敗，無法準備前置狀態');
});

Given('已取消的金額為 {int} 元的訂單', function (this: OrderWorld, amount: number) {
  create(this, amount);
  runOnOrder(this, (o) => order.cancel(o));
  assert.equal(this.result?.ok, true, '取消失敗，無法準備前置狀態');
});

Given('已出貨且已累計退款 {int} 元、金額為 {int} 元的訂單', function (this: OrderWorld, refunded: number, amount: number) {
  create(this, amount);
  pay(this, amount);
  runOnOrder(this, (o) => order.ship(o));
  assert.equal(this.result?.ok, true, '出貨失敗，無法準備前置狀態');
  runOnOrder(this, (o) => order.refund(o, refunded));
  assert.equal(this.result?.ok, true, '退款失敗，無法準備前置狀態');
});

// ---- When ----

When('建立金額為 {int} 元的訂單', function (this: OrderWorld, amount: number) {
  this.result = order.createOrder(this.nextId(), amount);
  if (this.result.ok) this.order = this.result.order;
});

When('付款 {int} 元', function (this: OrderWorld, amount: number) {
  runOnOrder(this, (o) => order.pay(o, amount));
});

When('出貨', function (this: OrderWorld) {
  runOnOrder(this, (o) => order.ship(o));
});

When('取消', function (this: OrderWorld) {
  runOnOrder(this, (o) => order.cancel(o));
});

When('申請退款 {int} 元', function (this: OrderWorld, amount: number) {
  runOnOrder(this, (o) => order.refund(o, amount));
});

// ---- Then ----

Then('操作成功', function (this: OrderWorld) {
  assert.equal(this.result?.ok, true, `預期成功，實際結果：${JSON.stringify(this.result)}`);
});

Then('操作失敗並回傳原因', function (this: OrderWorld) {
  assert.ok(this.result, '沒有操作結果');
  assert.equal(this.result.ok, false, '預期失敗，但操作成功');
  if (!this.result.ok) {
    assert.ok(this.result.reason.length > 0, '失敗原因為空');
  }
});

Then('訂單狀態為 {string}', function (this: OrderWorld, label: string) {
  const expected = STATUS_BY_LABEL[label];
  assert.ok(expected, `未知的狀態標籤：${label}`);
  assert.equal(requireOrder(this).status, expected);
});

Then('訂單金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireOrder(this).amount, amount);
});

Then('已付金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireOrder(this).paidAmount, amount);
});

Then('累計退款金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireOrder(this).refundedAmount, amount);
});

Then('原訂單未被修改', function (this: OrderWorld) {
  assert.ok(this.original && this.snapshot, '沒有操作前的訂單快照');
  assert.equal(JSON.stringify(this.original), this.snapshot, '原訂單物件被修改');
});

Then('訂單維持原狀', function (this: OrderWorld) {
  assert.ok(this.snapshot, '沒有操作前快照');
  assert.equal(JSON.stringify(requireOrder(this)), this.snapshot);
});
