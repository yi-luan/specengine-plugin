// 限量搶購 Step Definitions（Binding Layer = direct：Step 直接呼叫 src/flash.ts 的 FlashSale）
// 句型字串由 spec-04 產出並被 spec-guard 凍結；spec-05 只填函式體。
import assert from 'node:assert/strict';
import { Given, When, Then } from '@cucumber/cucumber';
import type { FlashSaleWorld } from '../support/world.js';
import { StallingStore } from '../support/memory-store.js';
import type { Result } from '../../src/flash-types.js';

type GrabValue = { holdId: string; expiresAt: string };

/** 「成功」對應 ok:true，其餘字串對應失敗原因代碼（terms.md 固定文案） */
function assertResult(result: Result<unknown> | undefined, expected: string): void {
  assert.ok(result, '尚無任何操作結果');
  if (expected === '成功') {
    assert.equal(result.ok, true, `預期成功，實際失敗：${result.ok ? '' : result.reason}`);
  } else {
    assert.equal(result.ok, false, `預期失敗 ${expected}，實際成功`);
    assert.equal(result.ok ? '' : result.reason, expected);
  }
}

// @rule R-FLASH_SALE-*
// @schema none（測試時鐘）
// @binds FlashSaleWorld.clock
Given('現在時間為 {string}', function (this: FlashSaleWorld, iso: string) {
  this.clock = iso;
});

// @rule R-FLASH_SALE-*
// @schema none（測試時鐘）
// @binds FlashSaleWorld.clock
When('時間來到 {string}', function (this: FlashSaleWorld, iso: string) {
  this.clock = iso;
});

// @rule R-FLASH_SALE-*
// @schema flash_sales.sale_id: varchar, flash_sales.quantity: int, flash_sales.per_customer_limit: int, flash_sales.starts_at: timestamp, flash_sales.ends_at: timestamp
// @binds FlashSale.openSale
Given('商家已開檔 {string}，限量 {string} 件、限購 {string} 件、開始 {string}、結束 {string}', async function (this: FlashSaleWorld, saleId: string, quantity: string, limit: string, startsAt: string, endsAt: string) {
  const result = await this.server().openSale({ saleId, quantity: Number(quantity), perCustomerLimit: Number(limit), startsAt, endsAt });
  assert.equal(result.ok, true, `前置開檔失敗：${result.ok ? '' : result.reason}`);
});

// @rule R-FLASH_SALE-001, R-FLASH_SALE-022, R-FLASH_SALE-023
// @schema flash_sales.sale_id: varchar, flash_sales.quantity: int, flash_sales.per_customer_limit: int, flash_sales.starts_at: timestamp, flash_sales.ends_at: timestamp
// @binds FlashSale.openSale
When('商家開檔 {string}，限量 {string} 件、限購 {string} 件、開始 {string}、結束 {string}', async function (this: FlashSaleWorld, saleId: string, quantity: string, limit: string, startsAt: string, endsAt: string) {
  this.lastResult = await this.server().openSale({ saleId, quantity: Number(quantity), perCustomerLimit: Number(limit), startsAt, endsAt });
});

// @rule R-FLASH_SALE-000, R-FLASH_SALE-005, R-FLASH_SALE-006, R-FLASH_SALE-007, R-FLASH_SALE-008, R-FLASH_SALE-017, R-FLASH_SALE-018, R-FLASH_SALE-019, R-FLASH_SALE-024, R-FLASH_SALE-025
// @schema holds.customer_id: varchar, grab_requests.request_id: varchar, holds.sale_id: varchar, holds.qty: int
// @binds FlashSale.grab
When('顧客 {string} 以請求編號 {string} 搶購檔次 {string} {string} 件', async function (this: FlashSaleWorld, customerId: string, requestId: string, saleId: string, qty: string) {
  const result = await this.server().grab({ saleId, customerId, requestId, qty: Number(qty) });
  this.lastResult = result;
  this.lastGrab = result.ok ? result.value : undefined;
});

// @rule R-FLASH_SALE-*
// @schema holds.customer_id: varchar, grab_requests.request_id: varchar, holds.sale_id: varchar, holds.qty: int, holds.hold_id: varchar
// @binds FlashSale.grab
Given('顧客 {string} 已以請求編號 {string} 搶購檔次 {string} {string} 件，搶到的保留記為 {string}', async function (this: FlashSaleWorld, customerId: string, requestId: string, saleId: string, qty: string, alias: string) {
  const result = await this.server().grab({ saleId, customerId, requestId, qty: Number(qty) });
  assert.equal(result.ok, true, `前置搶購失敗：${result.ok ? '' : result.reason}`);
  if (result.ok) {
    this.lastGrab = result.value;
    this.holds.set(alias, result.value);
  }
});

// @rule R-FLASH_SALE-*
// @schema none（Result.ok / Result.reason）
// @binds FlashSaleWorld.lastResult
Then('系統回傳結果 {string}', function (this: FlashSaleWorld, expected: string) {
  assertResult(this.lastResult, expected);
});

// @rule R-FLASH_SALE-000, R-FLASH_SALE-016
// @schema holds.expires_at: timestamp
// @binds FlashSaleWorld.lastGrab
Then('搶到的保留到期時間為 {string}', function (this: FlashSaleWorld, expected: string) {
  assert.ok(this.lastGrab, '最近一次搶購沒有搶到保留');
  assert.equal(Date.parse(this.lastGrab.expiresAt), Date.parse(expected), `到期時間 ${this.lastGrab.expiresAt} 不等於 ${expected}`);
});

// @rule R-FLASH_SALE-000, R-FLASH_SALE-018
// @schema holds.hold_id: varchar
// @binds FlashSaleWorld.holds
Then('搶到的保留記為 {string}', function (this: FlashSaleWorld, alias: string) {
  assert.ok(this.lastGrab, '最近一次搶購沒有搶到保留');
  this.holds.set(alias, this.lastGrab);
});

// @rule R-FLASH_SALE-018
// @schema holds.hold_id: varchar, holds.expires_at: timestamp
// @binds FlashSaleWorld.holds
Then('搶到的保留與 {string} 為同一張保留', function (this: FlashSaleWorld, alias: string) {
  const expected = this.holds.get(alias);
  assert.ok(expected, `找不到保留別名 ${alias}`);
  assert.ok(this.lastGrab, '最近一次搶購沒有搶到保留');
  assert.deepEqual(this.lastGrab, expected);
});

// @rule R-FLASH_SALE-*
// @schema flash_sales.remaining: int
// @binds FlashSale.getRemaining
Then('檔次 {string} 的剩餘可搶件數為 {string}', async function (this: FlashSaleWorld, saleId: string, expected: string) {
  assert.equal(await this.server().getRemaining(saleId), Number(expected));
});

// @rule R-FLASH_SALE-000, R-FLASH_SALE-002, R-FLASH_SALE-003, R-FLASH_SALE-005, R-FLASH_SALE-006, R-FLASH_SALE-011, R-FLASH_SALE-013, R-FLASH_SALE-017, R-FLASH_SALE-018, R-FLASH_SALE-021
// @schema customer_quotas.used_qty: int
// @binds FlashSaleWorld.usedQty
Then('顧客 {string} 於檔次 {string} 的累計佔用件數為 {string}', async function (this: FlashSaleWorld, customerId: string, saleId: string, expected: string) {
  assert.equal(await this.usedQty(saleId, customerId), Number(expected));
});

// @rule R-FLASH_SALE-*
// @schema holds.status: varchar
// @binds FlashSale.getHold
Then('保留 {string} 的狀態為 {string}', async function (this: FlashSaleWorld, alias: string, status: string) {
  const hold = await this.server().getHold(this.holdId(alias));
  assert.ok(hold, `找不到保留 ${alias}`);
  assert.equal(hold.status, status);
});

// @rule R-FLASH_SALE-002, R-FLASH_SALE-009, R-FLASH_SALE-010, R-FLASH_SALE-015, R-FLASH_SALE-016, R-FLASH_SALE-020, R-FLASH_SALE-021
// @schema holds.hold_id: varchar, holds.status: varchar
// @binds FlashSale.pay
When('金流送達保留 {string} 的付款成功通知', async function (this: FlashSaleWorld, alias: string) {
  this.lastResult = await this.server().pay(this.holdId(alias));
});

// @rule R-FLASH_SALE-003, R-FLASH_SALE-004, R-FLASH_SALE-009, R-FLASH_SALE-014, R-FLASH_SALE-015, R-FLASH_SALE-017, R-FLASH_SALE-020
// @schema holds.status: varchar, flash_sales.remaining: int
// @binds FlashSale.sweep
When('排程執行', async function (this: FlashSaleWorld) {
  await this.server().sweep();
});

// @rule R-FLASH_SALE-011
// @schema holds.status: varchar, flash_sales.remaining: int
// @binds FlashSale.sweep
When('排程在 {string} 台伺服器上同時執行', async function (this: FlashSaleWorld, count: string) {
  const servers = Array.from({ length: Number(count) }, (_, i) => this.server(i));
  await Promise.all(servers.map((s) => s.sweep()));
});

// @rule R-FLASH_SALE-012
// @schema flash_sales.remaining: int, holds.qty: int
// @binds FlashSale.grab
When('{string} 位顧客各以不同請求編號透過 {string} 台伺服器同時搶購檔次 {string} 各 {string} 件', async function (this: FlashSaleWorld, customers: string, servers: string, saleId: string, qty: string) {
  const n = Number(servers);
  const grabs = Array.from({ length: Number(customers) }, (_, i) =>
    this.server(i % n).grab({ saleId, customerId: `C${i + 1}`, requestId: `req-${i + 1}`, qty: Number(qty) }),
  );
  this.batchResults = await Promise.all(grabs);
});

// @rule R-FLASH_SALE-013
// @schema customer_quotas.used_qty: int, holds.qty: int
// @binds FlashSale.grab
When('顧客 {string} 以 {string} 個不同請求編號透過 {string} 台伺服器同時搶購檔次 {string} 各 {string} 件', async function (this: FlashSaleWorld, customerId: string, requests: string, servers: string, saleId: string, qty: string) {
  const n = Number(servers);
  const grabs = Array.from({ length: Number(requests) }, (_, i) =>
    this.server(i % n).grab({ saleId, customerId, requestId: `req-${i + 1}`, qty: Number(qty) }),
  );
  this.batchResults = await Promise.all(grabs);
});

// @rule R-FLASH_SALE-012, R-FLASH_SALE-013
// @schema holds.qty: int
// @binds FlashSaleWorld.batchResults
Then('成功搶到的件數總和為 {string}', async function (this: FlashSaleWorld, expected: string) {
  let total = 0;
  for (const r of this.batchResults) {
    if (!r.ok) continue;
    const hold = await this.server().getHold(r.value.holdId);
    assert.ok(hold, `成功的搶購卻查不到保留 ${r.value.holdId}`);
    total += hold.qty;
  }
  assert.equal(total, Number(expected));
});

// @rule R-FLASH_SALE-012, R-FLASH_SALE-013
// @schema none（Result.reason）
// @binds FlashSaleWorld.batchResults
Then('失敗的原因皆為 {string}', function (this: FlashSaleWorld, reason: string) {
  const failures = this.batchResults.filter((r) => !r.ok);
  assert.ok(failures.length > 0, '沒有任何失敗的搶購');
  for (const r of failures) assert.equal(r.ok ? '' : r.reason, reason);
});

// @rule R-FLASH_SALE-014
// @schema holds.hold_id: varchar
// @binds FlashSale.pay
When('某台伺服器開始處理保留 {string} 的付款成功通知並在寫入前卡住', async function (this: FlashSaleWorld, alias: string) {
  const store = new StallingStore(this.store);
  store.armStall();
  const server = this.newServer(store);
  const pending = server.pay(this.holdId(alias));
  pending.catch(() => undefined); // 錯誤留到恢復時再處理
  // 讓它跑到第一個寫入前卡住
  for (let i = 0; i < 20; i++) await new Promise<void>((resolve) => setImmediate(resolve));
  this.stalled = { store, pending };
});

// @rule R-FLASH_SALE-014
// @schema none
// @binds FlashSale.pay
When('卡住的伺服器恢復並完成處理', async function (this: FlashSaleWorld) {
  assert.ok(this.stalled, '沒有卡住中的伺服器');
  this.stalled.store.resume();
  this.lastResult = await this.stalled.pending;
  this.stalled = undefined;
});

// @rule R-FLASH_SALE-016
// @schema holds.hold_id: varchar
// @binds FlashSale.getHold
Then('查詢保留 {string} 回傳 null', async function (this: FlashSaleWorld, alias: string) {
  assert.equal(await this.server().getHold(this.holdId(alias)), null);
});

// @rule R-FLASH_SALE-016
// @schema holds.sale_id: varchar, holds.customer_id: varchar, holds.qty: int, holds.expires_at: timestamp, holds.status: varchar
// @binds FlashSale.getHold
Then('查詢保留 {string} 回傳搶購編號 {string}、顧客 {string}、件數 {string}、到期時間 {string}、狀態 {string}', async function (this: FlashSaleWorld, alias: string, saleId: string, customerId: string, qty: string, expiresAt: string, status: string) {
  const hold = await this.server().getHold(this.holdId(alias));
  assert.ok(hold, `找不到保留 ${alias}`);
  assert.equal(hold.holdId, this.holdId(alias));
  assert.equal(hold.saleId, saleId);
  assert.equal(hold.customerId, customerId);
  assert.equal(hold.qty, Number(qty));
  assert.equal(Date.parse(hold.expiresAt), Date.parse(expiresAt));
  assert.equal(hold.status, status);
});
