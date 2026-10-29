import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { createOrder, pay, ship, cancel, refund, type Order, type OrderStatus } from '../../src/order.js';
import type { OrderWorld } from '../support/world.js';

function requireResult(world: OrderWorld) {
  assert.ok(world.result, '尚未執行任何操作');
  return world.result;
}

function requireCurrent(world: OrderWorld): Order {
  assert.ok(world.current, '目前沒有成功的訂單');
  return world.current;
}

function reasonOf(result: { ok: boolean; reason?: string }): string {
  return result.ok ? '' : (result.reason ?? '');
}

/** 以純函式一路把訂單推進到指定狀態，當作測試前置 */
function buildOrderAt(id: string, amount: number, status: OrderStatus): Order {
  const created = createOrder(id, amount);
  assert.ok(created.ok, `建立前置訂單失敗：${reasonOf(created)}`);
  let order = created.order;
  if (status === 'CREATED') return order;

  const paid = pay(order, amount);
  assert.ok(paid.ok, `前置付款失敗：${reasonOf(paid)}`);
  order = paid.order;
  if (status === 'PAID') return order;

  if (status === 'CANCELLED') {
    const cancelled = cancel(order);
    assert.ok(cancelled.ok, `前置取消失敗：${reasonOf(cancelled)}`);
    return cancelled.order;
  }

  const shipped = ship(order);
  assert.ok(shipped.ok, `前置出貨失敗：${reasonOf(shipped)}`);
  order = shipped.order;
  if (status === 'SHIPPED') return order;

  const refunded = refund(order, amount);
  assert.ok(refunded.ok, `前置退款失敗：${reasonOf(refunded)}`);
  return refunded.order;
}

Given('系統中沒有任何訂單', function (this: OrderWorld) {
  this.reset();
});

Given(
  '已有一筆編號 {string} 金額 {int} 狀態為 {string} 的訂單',
  function (this: OrderWorld, id: string, amount: number, status: string) {
    this.current = buildOrderAt(id, amount, status as OrderStatus);
    this.result = { ok: true, order: this.current };
  },
);

When('我建立編號 {string} 金額 {float} 的訂單', function (this: OrderWorld, id: string, amount: number) {
  this.original = undefined;
  this.originalSnapshot = undefined;
  this.result = createOrder(id, amount);
  if (this.result.ok) {
    this.current = this.result.order;
  }
});

When('我付款 {float}', function (this: OrderWorld, amount: number) {
  this.apply((order) => pay(order, amount));
});

When('我出貨', function (this: OrderWorld) {
  this.apply((order) => ship(order));
});

When('我取消訂單', function (this: OrderWorld) {
  this.apply((order) => cancel(order));
});

When('我退款 {float}', function (this: OrderWorld, amount: number) {
  this.apply((order) => refund(order, amount));
});

Then('操作成功', function (this: OrderWorld) {
  const result = requireResult(this);
  assert.equal(result.ok, true, `預期成功，實際失敗：${reasonOf(result)}`);
});

Then('操作失敗', function (this: OrderWorld) {
  const result = requireResult(this);
  assert.equal(result.ok, false, '預期失敗，實際成功');
});

Then('失敗原因包含 {string}', function (this: OrderWorld, fragment: string) {
  const result = requireResult(this);
  assert.equal(result.ok, false, '預期失敗，實際成功');
  if (!result.ok) {
    assert.ok(
      result.reason.includes(fragment),
      `失敗原因「${result.reason}」未包含「${fragment}」`,
    );
  }
});

Then('訂單狀態為 {string}', function (this: OrderWorld, status: string) {
  assert.equal(requireCurrent(this).status, status);
});

Then('訂單金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireCurrent(this).amount, amount);
});

Then('已付金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireCurrent(this).paidAmount, amount);
});

Then('累計退款金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireCurrent(this).refundedAmount, amount);
});

Then('最後一筆成功的訂單累計退款金額為 {int}', function (this: OrderWorld, amount: number) {
  assert.equal(requireCurrent(this).refundedAmount, amount);
});

Then('回傳的訂單是新的物件', function (this: OrderWorld) {
  const result = requireResult(this);
  assert.ok(result.ok, '預期成功');
  if (result.ok) {
    assert.notStrictEqual(result.order, this.original, '回傳的訂單應是新的物件');
  }
});

Then('原訂單狀態仍為 {string}', function (this: OrderWorld, status: string) {
  assert.ok(this.original && this.originalSnapshot, '沒有原訂單可比對');
  assert.equal(this.original.status, status);
  assert.deepEqual(this.original, this.originalSnapshot, '原訂單不應被修改');
});

Then('原訂單已付金額仍為 {int}', function (this: OrderWorld, amount: number) {
  assert.ok(this.original, '沒有原訂單可比對');
  assert.equal(this.original.paidAmount, amount);
});
