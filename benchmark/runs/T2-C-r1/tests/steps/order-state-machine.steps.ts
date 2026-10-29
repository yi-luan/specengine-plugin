// tests/steps/order-state-machine.steps.ts
// 模組：ORDER_STATE_MACHINE（訂單狀態機）。Binding Layer = direct：Step 直接呼叫 src/order.ts 匯出的純函式。
// spec-04 產出句型與註解；spec-05 只填函式體接 src/order.ts，句型字串不可動（spec-guard 凍結）。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { OrderWorld } from '../support/world.js';
import { cancel, createOrder, pay, refund, ship, type Order, type OrderResult, type OrderStatus } from '../../src/order.js';

/** 對 World.current 執行一次操作：先深拷貝輸入，呼叫後若成功則把回傳的新訂單當作下一次的輸入。 */
function run(world: OrderWorld, fn: (order: Order) => OrderResult): void {
  assert.ok(world.current, '尚未準備訂單（請先 Given 一筆訂單或建立訂單）');
  world.input = world.current;
  world.before = structuredClone(world.current);
  world.result = fn(world.current);
  if (world.result.ok) world.current = world.result.order;
}

function okOrder(world: OrderWorld): Order {
  assert.ok(world.result, '尚未執行任何操作');
  if (!world.result.ok) assert.fail(`預期操作成功，實際失敗：${world.result.reason}`);
  return world.result.order;
}

// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.status: varchar, orders.amount: int, orders.paid_amount: int, orders.refunded_amount: int
// @binds order.Order（直接以 Given 給定的欄位組出 Order 物件作為操作輸入）
Given('一筆狀態為 {string} 的訂單，訂單金額為 {string}、已付金額為 {string}、累計退款金額為 {string}', function (this: OrderWorld, status: string, amount: string, paid: string, refunded: string) {
  this.current = {
    id: 'given-order',
    status: status as OrderStatus,
    amount: Number(amount),
    paidAmount: Number(paid),
    refundedAmount: Number(refunded),
  };
  this.input = this.before = this.result = undefined;
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-001
// @schema orders.id: varchar, orders.amount: int
// @binds order.createOrder
When('操作者建立訂單，識別字 {string}、金額 {string}', function (this: OrderWorld, id: string, amount: string) {
  this.input = this.before = undefined;
  this.result = createOrder(id, Number(amount));
  if (this.result.ok) this.current = this.result.order;
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-002, R-ORDER_STATE_MACHINE-016
// @schema orders.paid_amount: int
// @binds order.pay
When('操作者付款 {string}', function (this: OrderWorld, amount: string) {
  run(this, (o) => pay(o, Number(amount)));
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-013
// @schema orders.status: varchar
// @binds order.ship
When('操作者出貨', function (this: OrderWorld) {
  run(this, (o) => ship(o));
});

// @rule R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-009
// @schema orders.status: varchar, orders.refunded_amount: int
// @binds order.cancel
When('操作者取消訂單', function (this: OrderWorld) {
  run(this, (o) => cancel(o));
});

// @rule R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-014, R-ORDER_STATE_MACHINE-015
// @schema orders.refunded_amount: int
// @binds order.refund
When('操作者退款 {string}', function (this: OrderWorld, amount: string) {
  run(this, (o) => refund(o, Number(amount)));
});

// @rule R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012, R-ORDER_STATE_MACHINE-017
// @schema none
// @binds order.pay（op=pay）／order.ship（op=ship）／order.cancel（op=cancel）／order.refund（op=refund）；金額 "-" 表示該操作不需金額
When('操作者對訂單執行 {string} 操作，金額 {string}', function (this: OrderWorld, op: string, amount: string) {
  const n = Number(amount); // 金額 "-" 轉成 NaN；ship／cancel 不使用金額
  switch (op) {
    case 'pay': return run(this, (o) => pay(o, n));
    case 'ship': return run(this, (o) => ship(o));
    case 'cancel': return run(this, (o) => cancel(o));
    case 'refund': return run(this, (o) => refund(o, n));
    default: assert.fail(`未知操作：${op}`);
  }
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.OrderResult（ok 為 true）
Then('操作成功', function (this: OrderWorld) {
  okOrder(this);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.OrderResult（ok 為 false，reason 為固定英文代碼，見 terms.md MSG-001～004）
Then('操作失敗，失敗原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.result, '尚未執行任何操作');
  if (this.result.ok) assert.fail('預期操作失敗，實際成功');
  assert.equal(this.result.reason, reason);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.status: varchar
// @binds order.Order（status）
Then('回傳訂單的狀態為 {string}', function (this: OrderWorld, status: string) {
  assert.equal(okOrder(this).status, status);
});

// @rule R-ORDER_STATE_MACHINE-000
// @schema orders.amount: int
// @binds order.Order（amount）
Then('回傳訂單的訂單金額為 {string}', function (this: OrderWorld, amount: string) {
  assert.equal(okOrder(this).amount, Number(amount));
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-004
// @schema orders.paid_amount: int
// @binds order.Order（paidAmount）
Then('回傳訂單的已付金額為 {string}', function (this: OrderWorld, paid: string) {
  assert.equal(okOrder(this).paidAmount, Number(paid));
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006
// @schema orders.refunded_amount: int
// @binds order.Order（refundedAmount）
Then('回傳訂單的累計退款金額為 {string}', function (this: OrderWorld, refunded: string) {
  assert.equal(okOrder(this).refundedAmount, Number(refunded));
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.Order（傳入物件深比對 World.before）
Then('傳入的訂單內容與呼叫前相同', function (this: OrderWorld) {
  assert.ok(this.input && this.before, '本次操作沒有傳入訂單物件');
  assert.deepEqual(this.input, this.before);
});

// @rule R-ORDER_STATE_MACHINE-008
// @schema none
// @binds order.Order（回傳物件與傳入物件參考不同）
Then('回傳的訂單不是傳入的同一個物件', function (this: OrderWorld) {
  assert.notEqual(okOrder(this), this.input);
});
