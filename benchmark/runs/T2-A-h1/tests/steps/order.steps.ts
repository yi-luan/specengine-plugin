import assert from 'node:assert/strict';
import { Before, Given, Then, When } from '@cucumber/cucumber';
import {
  cancel,
  createOrder,
  pay,
  refund,
  ship,
  type Order,
  type OrderResult,
} from '../../src/order.js';

// 每個場景開始前重置狀態
let order: Order | undefined;          // 目前的訂單（最後一次成功操作後的結果）
let last: OrderResult | undefined;     // 最後一次操作的結果
let inputRef: Order | undefined;       // 最後一次操作傳入的訂單物件
let inputSnapshot: Order | undefined;  // 傳入前的快照，用來檢查純函式是否修改輸入

Before(function () {
  order = undefined;
  last = undefined;
  inputRef = undefined;
  inputSnapshot = undefined;
});

function current(): Order {
  assert.ok(order, '尚未建立訂單');
  return order;
}

function apply(input: Order, result: OrderResult): void {
  inputRef = input;
  inputSnapshot = { ...input };
  last = result;
  if (result.ok) {
    order = result.order;
  }
}

function createFor(id: string, amount: number): void {
  const result = createOrder(id, amount);
  assert.ok(result.ok, `建立訂單失敗：${JSON.stringify(result)}`);
  order = result.order;
  last = result;
  inputRef = undefined;
  inputSnapshot = undefined;
}

// ---- Given ----

Given(/^已建立金額 (-?[\d.]+) 的訂單 "(\w+)"$/, function (amount: string, id: string) {
  createFor(id, Number(amount));
});

Given('已付款', function () {
  const o = current();
  apply(o, pay(o, o.amount));
  assert.ok(last?.ok, `前置條件付款失敗：${JSON.stringify(last)}`);
});

Given('已出貨', function () {
  const o = current();
  apply(o, ship(o));
  assert.ok(last?.ok, `前置條件出貨失敗：${JSON.stringify(last)}`);
});

Given('已取消', function () {
  const o = current();
  apply(o, cancel(o));
  assert.ok(last?.ok, `前置條件取消失敗：${JSON.stringify(last)}`);
});

// ---- When ----

When(/^建立訂單 "(\w+)"，金額 (-?[\d.]+)$/, function (id: string, amount: string) {
  const result = createOrder(id, Number(amount));
  last = result;
  if (result.ok) {
    order = result.order;
  } else {
    order = undefined;
  }
  inputRef = undefined;
  inputSnapshot = undefined;
});

When(/^付款 (-?[\d.]+)$/, function (amount: string) {
  const o = current();
  apply(o, pay(o, Number(amount)));
});

When('出貨', function () {
  const o = current();
  apply(o, ship(o));
});

When('取消', function () {
  const o = current();
  apply(o, cancel(o));
});

When(/^退款 (-?[\d.]+)$/, function (amount: string) {
  const o = current();
  apply(o, refund(o, Number(amount)));
});

// ---- Then ----

Then('操作失敗', function () {
  assert.ok(last, '沒有操作結果');
  assert.equal(last.ok, false, `預期失敗，實際：${JSON.stringify(last)}`);
  if (!last.ok) {
    assert.ok(last.reason.length > 0, '失敗時應回傳原因');
  }
});

Then(/^操作成功$/, function () {
  const r = last;
  assert.ok(r, '沒有操作結果');
  assert.ok(r.ok, `預期成功，實際：${JSON.stringify(r)}`);
});

Then(/^操作成功，訂單狀態為 "(\w+)"(.*)$/, function (status: string, rest: string) {
  const r = last;
  assert.ok(r, '沒有操作結果');
  assert.ok(r.ok, `預期成功，實際：${JSON.stringify(r)}`);
  const o = r.order;
  assert.equal(o.status, status);

  const amount = rest.match(/金額為 (-?\d+)/);
  if (amount) assert.equal(o.amount, Number(amount[1]));

  const paid = rest.match(/已付金額為 (-?\d+)/);
  if (paid) assert.equal(o.paidAmount, Number(paid[1]));

  const refunded = rest.match(/累計退款為 (-?\d+)/);
  if (refunded) assert.equal(o.refundedAmount, Number(refunded[1]));
});

Then(/^原訂單狀態仍為 "(\w+)"$/, function (status: string) {
  assert.ok(inputRef && inputSnapshot, '沒有傳入的訂單可供檢查');
  assert.equal(inputRef.status, status);
  assert.deepEqual(inputRef, inputSnapshot, '純函式不應修改傳入的訂單');
});
