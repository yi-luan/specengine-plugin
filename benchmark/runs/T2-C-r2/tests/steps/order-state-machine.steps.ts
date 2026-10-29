// tests/steps/order-state-machine.steps.ts
// 模組：ORDER_STATE_MACHINE（訂單狀態機）
// Binding Layer = direct：Step 直接呼叫 src/order.ts 匯出的純函式。
// spec-04 產出時全部拋 Contract Not Implemented；spec-05 已於函式體接上 src/order.ts（句型未動）。
// 句型字串為契約，spec-05 期間由 spec-guard.js 凍結，不得改名／刪除／新增。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { OrderWorld } from '../support/world.js';
import { cancel, createOrder, pay, refund, ship, type Order, type OrderResult, type OrderStatus } from '../../src/order.js';

/** 對 World 目前的訂單執行一次純函式操作：先留存傳入物件與深拷貝快照，成功時以回傳的新訂單取代目前訂單。 */
function operate(world: OrderWorld, fn: (order: Order) => OrderResult): void {
  const input = world.order;
  assert.ok(input, '尚未以 Given 建立前置訂單');
  world.inputOrder = input;
  world.inputSnapshot = structuredClone(input);
  world.result = fn(input);
  if (world.result.ok) world.order = world.result.order;
}

const currentOrder = (world: OrderWorld): Order => {
  assert.ok(world.order, '目前沒有訂單');
  return world.order;
};

// @rule R-ORDER_STATE_MACHINE-002, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009, R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012, R-ORDER_STATE_MACHINE-013, R-ORDER_STATE_MACHINE-014, R-ORDER_STATE_MACHINE-015, R-ORDER_STATE_MACHINE-016, R-ORDER_STATE_MACHINE-017, R-ORDER_STATE_MACHINE-018, R-ORDER_STATE_MACHINE-019
// @schema orders.status: varchar, orders.amount: int, orders.paid_amount: int, orders.refunded_amount: int
// @binds order.Order（直接以型別組裝前置訂單物件，不經任何函式）
Given('一筆狀態為 {string} 的訂單，訂單金額 {string}、已付金額 {string}、累計退款金額 {string}', function (this: OrderWorld, status: string, amount: string, paid: string, refunded: string) {
  this.order = { id: 'ORD-GIVEN', status: status as OrderStatus, amount: Number(amount), paidAmount: Number(paid), refundedAmount: Number(refunded) };
  this.inputOrder = undefined;
  this.inputSnapshot = undefined;
  this.result = undefined;
});

// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-001
// @schema orders.id: varchar, orders.amount: int
// @binds order.createOrder
When('客戶以金額 {string} 建立編號 {string} 的訂單', function (this: OrderWorld, amount: string, id: string) {
  this.result = createOrder(id, Number(amount));
  if (this.result.ok) this.order = this.result.order;
});

// @rule R-ORDER_STATE_MACHINE-002, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-019
// @schema orders.paid_amount: int
// @binds order.pay
When('客戶付款 {string}', function (this: OrderWorld, amount: string) {
  operate(this, (o) => pay(o, Number(amount)));
});

// @rule R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-016
// @schema orders.status: varchar
// @binds order.ship
When('商家出貨', function (this: OrderWorld) {
  operate(this, (o) => ship(o));
});

// @rule R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-015
// @schema orders.status: varchar, orders.refunded_amount: int
// @binds order.cancel
When('客戶取消訂單', function (this: OrderWorld) {
  operate(this, (o) => cancel(o));
});

// @rule R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009, R-ORDER_STATE_MACHINE-013, R-ORDER_STATE_MACHINE-014
// @schema orders.refunded_amount: int
// @binds order.refund
When('客戶申請退款 {string}', function (this: OrderWorld, amount: string) {
  operate(this, (o) => refund(o, Number(amount)));
});

// @rule R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012, R-ORDER_STATE_MACHINE-017, R-ORDER_STATE_MACHINE-018
// @schema orders.status: varchar
// @binds order.pay／order.ship／order.cancel／order.refund（依操作名稱「付款／出貨／取消／退款」分派；出貨與取消忽略金額）
When('對訂單執行 {string} 操作，金額 {string}', function (this: OrderWorld, operation: string, amount: string) {
  const n = Number(amount);
  const dispatch: Record<string, (o: Order) => OrderResult> = {
    付款: (o) => pay(o, n),
    出貨: (o) => ship(o),
    取消: (o) => cancel(o),
    退款: (o) => refund(o, n),
  };
  const fn = dispatch[operation];
  assert.ok(fn, `未知操作：${operation}`);
  operate(this, fn);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.OrderResult.ok
Then('操作結果為 {string}', function (this: OrderWorld, expected: string) {
  assert.ok(this.result, '尚未執行任何操作');
  assert.equal(this.result.ok, expected === '成功', `預期操作結果為 ${expected}，實際：${JSON.stringify(this.result)}`);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.OrderResult.reason
Then('操作失敗，失敗原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.result, '尚未執行任何操作');
  assert.equal(this.result.ok, false, `預期失敗，實際成功：${JSON.stringify(this.result)}`);
  if (!this.result.ok) assert.equal(this.result.reason, reason);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema none
// @binds order.Order（純函式不變性：傳入物件與操作前快照深度相等）
Then('傳入的訂單未被修改', function (this: OrderWorld) {
  assert.ok(this.inputOrder && this.inputSnapshot, '本步驟需在以既有訂單為輸入的操作之後');
  assert.deepEqual(this.inputOrder, this.inputSnapshot, '傳入的訂單物件被就地修改');
  if (this.result?.ok) assert.notEqual(this.result.order, this.inputOrder, '成功時必須回傳新的訂單物件');
});

// @rule R-ORDER_STATE_MACHINE-000
// @schema orders.id: varchar
// @binds order.Order.id
Then('訂單編號為 {string}', function (this: OrderWorld, id: string) {
  assert.equal(currentOrder(this).id, id);
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.status: varchar
// @binds order.Order.status
Then('訂單狀態為 {string}', function (this: OrderWorld, status: string) {
  assert.equal(currentOrder(this).status, status);
});

// @rule R-ORDER_STATE_MACHINE-000
// @schema orders.amount: int
// @binds order.Order.amount
Then('訂單金額為 {string}', function (this: OrderWorld, amount: string) {
  assert.equal(currentOrder(this).amount, Number(amount));
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.paid_amount: int
// @binds order.Order.paidAmount
Then('已付金額為 {string}', function (this: OrderWorld, paid: string) {
  assert.equal(currentOrder(this).paidAmount, Number(paid));
});

// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.refunded_amount: int
// @binds order.Order.refundedAmount
Then('累計退款金額為 {string}', function (this: OrderWorld, refunded: string) {
  assert.equal(currentOrder(this).refundedAmount, Number(refunded));
});
