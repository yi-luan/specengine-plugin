// 訂單狀態機的 Step Definitions（Binding Layer = direct，無 Driver 層）。
// 句型字串與 .feature 一致（spec-guard 凍結）；函式體只做參數轉換、呼叫 src/order.ts 純函式、斷言。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import {
  cancel,
  createOrder,
  pay,
  refund,
  ship,
  type Order,
  type OrderStatus,
} from '../../src/order.js';
import type { OrderWorld } from '../support/world.js';

// 白話狀態（.feature 用語）→ 產品碼狀態代碼
const STATUS: Record<string, OrderStatus> = {
  已建立: 'CREATED',
  已付款: 'PAID',
  已出貨: 'SHIPPED',
  已取消: 'CANCELLED',
  已退款: 'REFUNDED',
};

function requireOrder(world: OrderWorld): Order {
  assert.ok(world.order, '此步驟需要先有一張訂單');
  return world.order;
}

// 訂單狀態、金額與累計退款的前置資料設定（全模組共用）
// @rule R-ORDER_STATE_MACHINE-*
// @schema orders.status: varchar
// @schema orders.amount: int
// @schema orders.paid_amount: int
// @schema orders.refunded_amount: int
// @binds none
Given(
  '一張訂單狀態為 {string}，訂單金額為 {string}，已付金額為 {string}，累計退款金額為 {string}',
  function (this: OrderWorld, status: string, amount: string, paid: string, refunded: string) {
    this.order = {
      id: 'O-1',
      status: STATUS[status] as OrderStatus,
      amount: Number(amount),
      paidAmount: Number(paid),
      refundedAmount: Number(refunded),
    };
    this.result = undefined;
  },
);

// 建立訂單（對應 createOrder(id, amount)）
// @rule R-ORDER_STATE_MACHINE-001, R-ORDER_STATE_MACHINE-002
// @schema orders.id: varchar
// @schema orders.amount: int
// @binds order.createOrder
When('呼叫 {string}，編號為 {string}，金額為 {string}', function (this: OrderWorld, _op: string, id: string, amount: string) {
  this.result = createOrder(id, Number(amount));
  if (this.result.ok) this.order = this.result.order;
});

// 付款與退款（需要金額參數）
// @rule R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009, R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012
// @schema orders.amount: int
// @binds order.pay
When('呼叫 {string}，金額為 {string}', function (this: OrderWorld, op: string, amount: string) {
  const order = requireOrder(this);
  this.result = op === '付款' ? pay(order, Number(amount)) : refund(order, Number(amount));
  if (this.result.ok) this.order = this.result.order;
});

// 出貨與取消（無金額參數）
// @rule R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-010
// @schema orders.status: varchar
// @binds order.ship
When('呼叫 {string}', function (this: OrderWorld, op: string) {
  const order = requireOrder(this);
  this.result = op === '出貨' ? ship(order) : cancel(order);
  if (this.result.ok) this.order = this.result.order;
});

// 操作結果斷言
// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-001, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009
// @schema none
// @binds none
Then('操作成功', function (this: OrderWorld) {
  assert.equal(this.result?.ok, true, `預期成功，實際為 ${JSON.stringify(this.result)}`);
});

// 操作失敗與固定英文代碼斷言
// @rule R-ORDER_STATE_MACHINE-002, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012
// @schema none
// @binds none
Then('操作失敗，原因為 {string}', function (this: OrderWorld, reason: string) {
  assert.ok(this.result && this.result.ok === false, '預期失敗');
  assert.equal(this.result.reason, reason);
});

// 訂單狀態斷言
// @rule R-ORDER_STATE_MACHINE-000, R-ORDER_STATE_MACHINE-001, R-ORDER_STATE_MACHINE-004, R-ORDER_STATE_MACHINE-005, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009, R-ORDER_STATE_MACHINE-010, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012
// @schema orders.status: varchar
// @binds none
Then('訂單狀態為 {string}', function (this: OrderWorld, status: string) {
  assert.equal(requireOrder(this).status, STATUS[status]);
});

// 已付金額斷言
// @rule R-ORDER_STATE_MACHINE-001, R-ORDER_STATE_MACHINE-003, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007
// @schema orders.paid_amount: int
// @binds none
Then('已付金額為 {string}', function (this: OrderWorld, paid: string) {
  assert.equal(requireOrder(this).paidAmount, Number(paid));
});

// 累計退款金額斷言
// @rule R-ORDER_STATE_MACHINE-001, R-ORDER_STATE_MACHINE-006, R-ORDER_STATE_MACHINE-007, R-ORDER_STATE_MACHINE-008, R-ORDER_STATE_MACHINE-009, R-ORDER_STATE_MACHINE-011, R-ORDER_STATE_MACHINE-012
// @schema orders.refunded_amount: int
// @binds none
Then('累計退款金額為 {string}', function (this: OrderWorld, refunded: string) {
  assert.equal(requireOrder(this).refundedAmount, Number(refunded));
});
