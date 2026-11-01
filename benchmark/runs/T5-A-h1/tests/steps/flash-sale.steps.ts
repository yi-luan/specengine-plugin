import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { FlashWorld } from '../support/world.js';
import type { Result } from '../../src/flash.js';

type Req = { customerId: string; qty: number; requestId: string };

/** 多台伺服器同時處理一批搶購請求（以輪流方式分派）。 */
async function runBatch(world: FlashWorld, reqs: Req[], serverCount: number): Promise<void> {
  await Promise.all(
    reqs.map(async (r, i) => {
      const srv = world.server(`S${(i % serverCount) + 1}`);
      const result = await srv.grab({
        saleId: world.saleId,
        customerId: r.customerId,
        qty: r.qty,
        requestId: r.requestId,
      });
      world.grabs.set(r.requestId, { customerId: r.customerId, qty: r.qty, result });
      world.lastResult = result;
    }),
  );
}

function sumGranted(world: FlashWorld, customerId?: string): number {
  let total = 0;
  for (const rec of world.distinctHolds().values()) {
    if (customerId === undefined || rec.customerId === customerId) total += rec.qty;
  }
  return total;
}

Given('現在是 {string}', function (this: FlashWorld, iso: string) {
  this.clock.setIso(iso);
});

When('伺服器 {string} 開賣 {string} 限量 {int} 每人限購 {int} 開始 {string} 結束 {string}', async function (
  this: FlashWorld,
  name: string,
  saleId: string,
  quantity: number,
  perCustomerLimit: number,
  startsAt: string,
  endsAt: string,
) {
  this.saleId = saleId;
  this.lastResult = await this.server(name).openSale({ saleId, quantity, perCustomerLimit, startsAt, endsAt });
});

When('伺服器 {string} 替顧客 {string} 搶 {int} 件 請求編號 {string}', async function (
  this: FlashWorld,
  name: string,
  customerId: string,
  qty: number,
  requestId: string,
) {
  const result = await this.server(name).grab({ saleId: this.saleId, customerId, qty, requestId });
  this.grabs.set(requestId, { customerId, qty, result });
  this.lastResult = result;
});

Then('操作成功', function (this: FlashWorld) {
  assert.ok(this.lastResult, '沒有任何操作結果');
  assert.equal(this.lastResult.ok, true, `預期成功，實際原因：${!this.lastResult.ok ? this.lastResult.reason : ''}`);
});

Then('操作失敗，原因是 {string}', function (this: FlashWorld, reason: string) {
  assert.ok(this.lastResult, '沒有任何操作結果');
  assert.deepEqual(this.lastResult, { ok: false, reason } satisfies Result<unknown>);
});

Then('保留到期時間應為 {string}', function (this: FlashWorld, expiresAt: string) {
  assert.ok(this.lastResult?.ok, '搶購沒有成功');
  assert.equal((this.lastResult.value as { expiresAt: string }).expiresAt, expiresAt);
});

When('伺服器 {string} 查詢剩餘件數', async function (this: FlashWorld, name: string) {
  this.lastNumber = await this.server(name).getRemaining(this.saleId);
});

Then('剩餘件數應為 {int}', function (this: FlashWorld, n: number) {
  assert.equal(this.lastNumber, n);
});

When('顧客 {string} 同時連點 {int} 次，每次 {int} 件，由 {int} 台伺服器輪流處理', async function (
  this: FlashWorld,
  customerId: string,
  times: number,
  qty: number,
  serverCount: number,
) {
  const reqs: Req[] = Array.from({ length: times }, (_, i) => ({
    customerId,
    qty,
    requestId: `${customerId}-click-${i}`,
  }));
  await runBatch(this, reqs, serverCount);
});

When('有 {int} 位顧客各搶 {int} 件，由 {int} 台伺服器同時處理', async function (
  this: FlashWorld,
  customers: number,
  qty: number,
  serverCount: number,
) {
  const reqs: Req[] = Array.from({ length: customers }, (_, i) => ({
    customerId: `C${i + 1}`,
    qty,
    requestId: `req-C${i + 1}`,
  }));
  await runBatch(this, reqs, serverCount);
});

Then('成功的保留數應為 {int}', function (this: FlashWorld, n: number) {
  assert.equal(this.distinctHolds().size, n);
});

Then('成功保留的總件數應為 {int}', function (this: FlashWorld, n: number) {
  assert.equal(sumGranted(this), n);
});

Then('顧客 {string} 成功保留的件數應為 {int}', function (this: FlashWorld, customerId: string, n: number) {
  assert.equal(sumGranted(this, customerId), n);
});

When('伺服器 {string} 收到 {string} 的付款通知', async function (this: FlashWorld, name: string, requestId: string) {
  this.lastResult = await this.server(name).pay(this.holdIdOf(requestId));
});

When('時間過了 {int} 分鐘', function (this: FlashWorld, minutes: number) {
  this.clock.advanceMs(minutes * 60 * 1000);
});

When('伺服器 {string} 執行排程', async function (this: FlashWorld, name: string) {
  await this.server(name).sweep();
});

When('所有伺服器同時執行排程', async function (this: FlashWorld) {
  for (const name of ['A', 'B', 'C']) this.server(name); // 確保三台伺服器都存在
  await Promise.all([...this.servers.values()].map((s) => s.sweep()));
});

Then('伺服器 {string} 查詢保留 {string} 的狀態為 {string}', async function (
  this: FlashWorld,
  name: string,
  requestId: string,
  status: string,
) {
  const hold = await this.server(name).getHold(this.holdIdOf(requestId));
  assert.ok(hold, '找不到保留');
  assert.equal(hold.status, status);
});

When('伺服器 {string} 處理 {string} 的付款通知到一半卡住', async function (
  this: FlashWorld,
  name: string,
  requestId: string,
) {
  const holdId = this.holdIdOf(requestId);
  // 只卡住「寫入 PAID 認領」這一步，之前的時間檢查已經在到期前完成。
  const { hit, release } = this.store.arm((key, value) => key.includes(holdId) && key.endsWith(':claim') && value === 'PAID');
  this.releases.set(requestId, release);
  const pending = this.server(name).pay(holdId);
  this.pending.set(requestId, pending);
  await hit;
});

When('伺服器 {string} 恢復，完成 {string} 的付款通知', async function (
  this: FlashWorld,
  _name: string,
  requestId: string,
) {
  this.releases.get(requestId)?.();
  const pending = this.pending.get(requestId);
  assert.ok(pending, '沒有卡住的付款');
  this.lastResult = await pending;
});
