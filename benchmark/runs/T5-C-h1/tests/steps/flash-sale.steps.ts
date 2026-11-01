// 限量搶購 Step Definitions（Binding Layer = direct：step 直接呼叫 createFlashSale 產生的服務）。
// 句型字串與 spec-04 產出時完全一致（spec-guard 凍結）；函式本體由 spec-05 實作。
import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { FlashWorld } from '../support/world.js';
import type { Result } from '../../src/flash.js';

// 檢查上一個結果：'成功' 表示 ok，其他值表示拒絕原因（reason）必須相同
function expectResult(world: FlashWorld, expected: string): void {
  const r = world.lastResult;
  assert.ok(r, '尚未有任何結果');
  if (expected === '成功') {
    assert.equal(r.ok, true, `預期成功，實際為 ${JSON.stringify(r)}`);
  } else {
    assert.equal(r.ok, false, `預期拒絕 ${expected}，實際為成功`);
    assert.equal((r as Extract<Result<unknown>, { ok: false }>).reason, expected);
  }
}

async function grabAs(world: FlashWorld, customerId: string, requestId: string, saleId: string, qty: string) {
  world.saleId = saleId;
  const r = await world.svc.grab({ saleId, customerId, qty: Number(qty), requestId });
  world.lastResult = r;
  if (r.ok) {
    world.lastHoldId = r.value.holdId;
    world.lastExpiresAt = r.value.expiresAt;
  }
}

// 已開檔搶購：商家開一檔限量搶購
// @rule R-FLASH_SALE-*
// @schema flash_sale.sale_id: varchar
// @binds FlashSale.openSale
Given('已開檔搶購 {string} 限量 {string} 每人限購 {string} 期間 {string} 到 {string}', async function (this: FlashWorld, saleId: string, quantity: string, perCustomerLimit: string, startsAt: string, endsAt: string) {
  const r = await this.svc.openSale({ saleId, quantity: Number(quantity), perCustomerLimit: Number(perCustomerLimit), startsAt, endsAt });
  assert.equal(r.ok, true, `前置開檔失敗：${JSON.stringify(r)}`);
  this.saleId = saleId;
});

// 現在時間：注入 now() 的測試時鐘
// @rule R-FLASH_SALE-*
// @schema none
// @binds TestClock.setNow
Given('現在時間為 {string}', function (this: FlashWorld, now: string) {
  this.nowIso = now;
});

// 顧客已成功搶到件數並記下保留編號（前置資料）
// @rule R-FLASH_SALE-*
// @schema hold.qty: int
// @binds FlashSale.grab
Given('顧客 {string} 已成功搶到 {string} 件，保留記為 {string}', async function (this: FlashWorld, customerId: string, qty: string, holdName: string) {
  await grabAs(this, customerId, `pre-${customerId}-${holdName}`, this.saleId, qty);
  assert.equal(this.lastResult?.ok, true, `前置搶購失敗：${JSON.stringify(this.lastResult)}`);
  this.holds.set(holdName, { holdId: this.lastHoldId, expiresAt: this.lastExpiresAt });
});

// 顧客搶購
// @rule R-FLASH_SALE-*
// @schema hold.hold_id: varchar
// @binds FlashSale.grab
When('顧客 {string} 以請求編號 {string} 搶購 {string} {string} 件', async function (this: FlashWorld, customerId: string, requestId: string, saleId: string, qty: string) {
  await grabAs(this, customerId, requestId, saleId, qty);
});

// 搶購途中伺服器當機後恢復：第二次寫入前當機（寫入未套用），之後以同一請求編號重試
// @rule R-FLASH_SALE-016
// @schema hold.hold_id: varchar
// @binds FlashSale.grab
When('顧客 {string} 以請求編號 {string} 搶購 {string} {string} 件，處理中途伺服器當機後恢復', async function (this: FlashWorld, customerId: string, requestId: string, saleId: string, qty: string) {
  this.store.armCrashOnWrite(2);
  try {
    await grabAs(this, customerId, requestId, saleId, qty);
  } catch {
    // 預期當機，忽略
  }
  this.store.disarm();
  await grabAs(this, customerId, requestId, saleId, qty);
  if (this.lastResult?.ok) {
    this.holds.set(requestId, { holdId: this.lastHoldId, expiresAt: this.lastExpiresAt });
  }
});

// 商家開檔（動作）
// @rule R-FLASH_SALE-*
// @schema flash_sale.quantity: int
// @binds FlashSale.openSale
When('商家開檔搶購 {string} 限量 {string} 每人限購 {string} 期間 {string} 到 {string}', async function (this: FlashWorld, saleId: string, quantity: string, perCustomerLimit: string, startsAt: string, endsAt: string) {
  this.saleId = saleId;
  this.lastResult = await this.svc.openSale({ saleId, quantity: Number(quantity), perCustomerLimit: Number(perCustomerLimit), startsAt, endsAt });
});

// 金流付款成功通知（付款以付款當下時間判斷）
// @rule R-FLASH_SALE-010
// @schema hold.status: varchar
// @binds FlashSale.pay
When('金流於 {string} 送達 {string} 付款成功通知', async function (this: FlashWorld, receivedAt: string, holdName: string) {
  this.nowIso = receivedAt;
  this.lastResult = await this.svc.pay(this.holdIdOf(holdName));
});

// 排程於指定時間執行釋放
// @rule R-FLASH_SALE-013
// @schema hold.status: varchar
// @binds TestClock.setNow
// @binds FlashSale.sweep
When('排程於 {string} 執行釋放', async function (this: FlashWorld, runAt: string) {
  this.nowIso = runAt;
  await this.svc.sweep();
});

// 另一台伺服器同時執行釋放
// @rule R-FLASH_SALE-013
// @schema hold.status: varchar
// @binds FlashSale.sweep
When('排程於 {string} 在另一台伺服器同時執行釋放', async function (this: FlashWorld, runAt: string) {
  this.nowIso = runAt;
  await Promise.all([this.svc.sweep(), this.otherServer().sweep()]);
});

// 查詢剩餘件數（商品頁）
// @rule R-FLASH_SALE-017
// @schema flash_sale.quantity: int
// @binds FlashSale.getRemaining
When('查詢剩餘件數', async function (this: FlashWorld) {
  this.lastRemaining = await this.svc.getRemaining(this.saleId);
});

// 搶購結果
// @rule R-FLASH_SALE-*
// @schema none
// @binds FlashSale.grab
Then('搶購結果為 {string}', function (this: FlashWorld, expected: string) {
  expectResult(this, expected);
});

// 記下本次搶購取得的保留編號
// @rule R-FLASH_SALE-007
// @schema hold.hold_id: varchar
// @binds FlashSale.grab
Then('保留記為 {string}', function (this: FlashWorld, holdName: string) {
  assert.equal(this.lastResult?.ok, true, `搶購未成功：${JSON.stringify(this.lastResult)}`);
  this.holds.set(holdName, { holdId: this.lastHoldId, expiresAt: this.lastExpiresAt });
});

// 保留到期時間
// @rule R-FLASH_SALE-007
// @schema hold.expires_at: timestamp
// @binds FlashSale.getHold
Then('保留 {string} 到期時間為 {string}', async function (this: FlashWorld, holdName: string, expiresAt: string) {
  const h = await this.svc.getHold(this.holdIdOf(holdName));
  assert.ok(h, `找不到保留 ${holdName}`);
  assert.equal(h.expiresAt, expiresAt);
});

// 保留狀態
// @rule R-FLASH_SALE-*
// @schema hold.status: varchar
// @binds FlashSale.getHold
Then('保留 {string} 狀態為 {string}', async function (this: FlashWorld, holdName: string, status: string) {
  const h = await this.svc.getHold(this.holdIdOf(holdName));
  assert.ok(h, `找不到保留 ${holdName}`);
  assert.equal(h.status, status);
});

// 付款結果
// @rule R-FLASH_SALE-*
// @schema none
// @binds FlashSale.pay
Then('付款結果為 {string}', function (this: FlashWorld, expected: string) {
  expectResult(this, expected);
});

// 剩餘可搶件數
// @rule R-FLASH_SALE-*
// @schema flash_sale.quantity: int
// @binds FlashSale.getRemaining
Then('剩餘可搶件數為 {string}', async function (this: FlashWorld, expected: string) {
  assert.equal(await this.svc.getRemaining(this.saleId), Number(expected));
});

// 開檔結果
// @rule R-FLASH_SALE-*
// @schema none
// @binds FlashSale.openSale
Then('開檔結果為 {string}', function (this: FlashWorld, expected: string) {
  expectResult(this, expected);
});

// 重送時回同一張保留
// @rule R-FLASH_SALE-008
// @schema hold.hold_id: varchar
// @binds FlashSale.grab
Then('重送結果為同一張保留 {string}', function (this: FlashWorld, holdName: string) {
  assert.equal(this.lastResult?.ok, true, `重送未成功：${JSON.stringify(this.lastResult)}`);
  const prev = this.holds.get(holdName);
  assert.ok(prev, `找不到保留 ${holdName}`);
  assert.equal(this.lastHoldId, prev.holdId);
  assert.equal(this.lastExpiresAt, prev.expiresAt);
});

// 查詢剩餘件數的結果
// @rule R-FLASH_SALE-017
// @schema flash_sale.quantity: int
// @binds FlashSale.getRemaining
Then('查詢剩餘件數為 {string}', function (this: FlashWorld, expected: string) {
  assert.equal(this.lastRemaining, Number(expected));
});

// 查詢不存在的保留回傳空值
// @rule R-FLASH_SALE-018
// @schema hold.hold_id: varchar
// @binds FlashSale.getHold
Then('查詢保留 {string} 回傳空值', async function (this: FlashWorld, holdName: string) {
  assert.equal(await this.svc.getHold(this.holdIdOf(holdName)), null);
});

// 故障恢復後件數守恆：剩餘 + 未到期保留（HELD）＝ 限量
// @rule R-FLASH_SALE-016
// @schema flash_sale.quantity: int
// @binds FlashSale.getRemaining
Then('剩餘件數加上未到期保留件數等於限量 {string}', async function (this: FlashWorld, quantity: string) {
  const remaining = await this.svc.getRemaining(this.saleId);
  const now = Date.parse(this.nowIso);
  let held = 0;
  for (const { holdId } of this.holds.values()) {
    const h = await this.svc.getHold(holdId);
    if (h && h.status === 'HELD' && now < Date.parse(h.expiresAt)) held += h.qty;
  }
  assert.equal(remaining + held, Number(quantity));
});
