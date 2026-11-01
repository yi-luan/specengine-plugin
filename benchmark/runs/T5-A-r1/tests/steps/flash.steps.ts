import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Store } from '../../src/flash.js';
import type { FlashWorld, GrabOutcome } from '../support/world.js';

function okValue(outcome: GrabOutcome | undefined, requestId: string): { holdId: string; expiresAt: string } {
  assert.ok(outcome, `請求 ${requestId} 沒有結果`);
  assert.equal(outcome.kind, 'result', `請求 ${requestId} 的伺服器當機了`);
  const r = (outcome as Extract<GrabOutcome, { kind: 'result' }>).result;
  assert.ok(r.ok, `請求 ${requestId} 失敗：${r.ok ? '' : r.reason}`);
  return r.value;
}

async function settleOrStall(world: FlashWorld, server: string, requestId: string, p: Promise<GrabOutcome>): Promise<void> {
  let settled = false;
  const tracked = p.then((o) => {
    settled = true;
    world.grabResults.set(requestId, o);
  });
  // 等到請求完成，或該台伺服器已卡住。
  for (let i = 0; i < 1000 && !settled && !world.server(server).store.isStalled(); i++) {
    await new Promise<void>((r) => setImmediate(r));
  }
  if (!settled) world.pendingGrabs.set(requestId, tracked.then(() => undefined));
}

function startGrab(world: FlashWorld, server: string, customerId: string, requestId: string, saleId: string, qty: number): Promise<GrabOutcome> {
  return world
    .server(server)
    .api.grab({ saleId, customerId, qty, requestId })
    .then((result): GrabOutcome => ({ kind: 'result', result }))
    .catch((): GrabOutcome => ({ kind: 'crashed' }));
}

Given('現在時間是 {string}', function (this: FlashWorld, iso: string) {
  this.clockMs = Date.parse(iso);
});

Given('有 {int} 台伺服器', function (this: FlashWorld, n: number) {
  for (let i = 1; i <= n; i++) this.server(`S${i}`);
});

Given(
  '商家開一檔搶購 {string}，限量 {int} 件，每人限購 {int} 件，{string} 開始，{string} 結束',
  async function (this: FlashWorld, saleId: string, quantity: number, perCustomerLimit: number, startsAt: string, endsAt: string) {
    this.lastResult = await this.anyServer().openSale({ saleId, quantity, perCustomerLimit, startsAt, endsAt });
  },
);

Given(
  '商家開一檔搶購 {string}，限量 {float} 件，每人限購 {float} 件，{string} 開始，{string} 結束（不檢查）',
  async function (this: FlashWorld, saleId: string, quantity: number, perCustomerLimit: number, startsAt: string, endsAt: string) {
    this.lastResult = await this.anyServer().openSale({ saleId, quantity, perCustomerLimit, startsAt, endsAt });
  },
);

When(
  '顧客 {string} 在伺服器 {string} 以請求 {string} 搶購 {string} {float} 件',
  async function (this: FlashWorld, customerId: string, server: string, requestId: string, saleId: string, qty: number) {
    await settleOrStall(this, server, requestId, startGrab(this, server, customerId, requestId, saleId, qty));
  },
);

When(
  '顧客 {string} 在伺服器 {string} 以請求 {string} 搶購 {string} {float} 件，結果記為 {string}',
  async function (this: FlashWorld, customerId: string, server: string, requestId: string, saleId: string, qty: number, alias: string) {
    await settleOrStall(this, server, alias, startGrab(this, server, customerId, requestId, saleId, qty));
  },
);

When('以下搶購同時送出：', async function (this: FlashWorld, table: DataTable) {
  const rows = table.hashes();
  const promises = rows.map((row) =>
    startGrab(this, row['伺服器'], row['顧客'], row['請求'], row['搶購'], Number(row['件數'])).then((o) => {
      this.grabResults.set(row['請求'], o);
    }),
  );
  await Promise.all(promises);
});

Then('請求 {string} 搶到了', function (this: FlashWorld, requestId: string) {
  okValue(this.grabResults.get(requestId), requestId);
});

Then('請求 {string} 搶到了，到期時間是 {string}', async function (this: FlashWorld, requestId: string, expiresAt: string) {
  const value = okValue(this.grabResults.get(requestId), requestId);
  assert.equal(Date.parse(value.expiresAt), Date.parse(expiresAt));
  const hold = await this.anyServer().getHold(value.holdId);
  assert.ok(hold);
  assert.equal(hold.holdId, value.holdId);
  assert.equal(Date.parse(hold.expiresAt), Date.parse(expiresAt));
  assert.equal(hold.status, 'HELD');
});

Then('請求 {string} 失敗，原因 {string}', function (this: FlashWorld, requestId: string, reason: string) {
  const outcome = this.grabResults.get(requestId);
  assert.ok(outcome, `請求 ${requestId} 沒有結果`);
  assert.equal(outcome.kind, 'result', `請求 ${requestId} 的伺服器當機了`);
  const r = (outcome as Extract<GrabOutcome, { kind: 'result' }>).result;
  assert.equal(r.ok, false, `請求 ${requestId} 竟然成功了`);
  assert.equal((r as { reason: string }).reason, reason);
});

Then('請求 {string} 的伺服器當機了', function (this: FlashWorld, requestId: string) {
  const outcome = this.grabResults.get(requestId);
  assert.ok(outcome, `請求 ${requestId} 沒有結果`);
  assert.equal(outcome.kind, 'crashed');
});

Then('請求 {string} 與請求 {string} 拿到同一張保留', function (this: FlashWorld, a: string, b: string) {
  const va = okValue(this.grabResults.get(a), a);
  const vb = okValue(this.grabResults.get(b), b);
  assert.equal(va.holdId, vb.holdId);
  assert.equal(va.expiresAt, vb.expiresAt);
});

Then('搶購 {string} 的剩餘件數為 {int}', async function (this: FlashWorld, saleId: string, expected: number) {
  for (const api of this.liveServers()) {
    assert.equal(await api.getRemaining(saleId), expected);
  }
});

Then('搶購 {string} 成功的請求有 {int} 個', function (this: FlashWorld, saleId: string, expected: number) {
  let count = 0;
  for (const outcome of this.grabResults.values()) {
    if (outcome.kind === 'result' && outcome.result.ok && outcome.result.value.holdId.startsWith(`${saleId}:`)) count++;
  }
  assert.equal(count, expected);
});

Then('搶購 {string} 保留中與已成交的件數合計為 {int}', async function (this: FlashWorld, saleId: string, expected: number) {
  const seen = new Set<string>();
  let total = 0;
  for (const outcome of this.grabResults.values()) {
    if (outcome.kind !== 'result' || !outcome.result.ok) continue;
    const { holdId } = outcome.result.value;
    if (seen.has(holdId) || !holdId.startsWith(`${saleId}:`)) continue;
    seen.add(holdId);
    const hold = await this.anyServer().getHold(holdId);
    assert.ok(hold);
    if (hold.status !== 'EXPIRED') total += hold.qty;
  }
  assert.equal(total, expected);
});

Then('每位顧客在搶購 {string} 的保留件數都不超過 {int}', async function (this: FlashWorld, saleId: string, limit: number) {
  const perCustomer = new Map<string, number>();
  const seen = new Set<string>();
  for (const outcome of this.grabResults.values()) {
    if (outcome.kind !== 'result' || !outcome.result.ok) continue;
    const { holdId } = outcome.result.value;
    if (seen.has(holdId) || !holdId.startsWith(`${saleId}:`)) continue;
    seen.add(holdId);
    const hold = await this.anyServer().getHold(holdId);
    assert.ok(hold);
    if (hold.status === 'EXPIRED') continue;
    perCustomer.set(hold.customerId, (perCustomer.get(hold.customerId) ?? 0) + hold.qty);
  }
  for (const [customer, qty] of perCustomer) assert.ok(qty <= limit, `顧客 ${customer} 保留了 ${qty} 件`);
});

When('時間前進 {int} 分鐘', function (this: FlashWorld, minutes: number) {
  this.clockMs += minutes * 60_000;
});

When('時間前進 {int} 秒', function (this: FlashWorld, seconds: number) {
  this.clockMs += seconds * 1000;
});

When('排程在所有伺服器上執行', async function (this: FlashWorld) {
  await Promise.all(this.liveServers().map((api) => api.sweep()));
});

When('排程在伺服器 {string} 上執行', async function (this: FlashWorld, server: string) {
  // 當機的伺服器會丟出錯誤，這裡模擬的是「排程那一跑就死在那裡」。
  await this.server(server).api.sweep().catch(() => undefined);
});

When('金流通知請求 {string} 的保留已付款', async function (this: FlashWorld, requestId: string) {
  const { holdId } = okValue(this.grabResults.get(requestId), requestId);
  this.lastResult = await this.anyServer().pay(holdId);
});

When('金流在伺服器 {string} 通知請求 {string} 的保留已付款', async function (this: FlashWorld, server: string, requestId: string) {
  const { holdId } = okValue(this.grabResults.get(requestId), requestId);
  this.lastResult = await this.server(server).api.pay(holdId);
});

When('金流同時在所有伺服器通知請求 {string} 的保留已付款', async function (this: FlashWorld, requestId: string) {
  const { holdId } = okValue(this.grabResults.get(requestId), requestId);
  const results = await Promise.all([...this.servers.values()].map((s) => s.api.pay(holdId)));
  for (const r of results) assert.deepEqual(r, { ok: true, value: null });
  this.lastResult = results[0];
});

When('金流通知請求 {string} 的保留已付款，同時排程在所有伺服器上執行', async function (this: FlashWorld, requestId: string) {
  const { holdId } = okValue(this.grabResults.get(requestId), requestId);
  const [payResult] = await Promise.all([
    this.anyServer().pay(holdId),
    ...[...this.servers.values()].map((s) => s.api.sweep()),
  ]);
  this.lastResult = payResult;
});

When('金流通知保留 {string} 已付款', async function (this: FlashWorld, holdId: string) {
  this.lastResult = await this.anyServer().pay(holdId);
});

Then('操作結果成功', function (this: FlashWorld) {
  assert.ok(this.lastResult);
  assert.equal(this.lastResult.ok, true, `失敗：${JSON.stringify(this.lastResult)}`);
});

Then('操作結果失敗，原因 {string}', function (this: FlashWorld, reason: string) {
  assert.ok(this.lastResult);
  assert.equal(this.lastResult.ok, false, '竟然成功了');
  assert.equal((this.lastResult as { reason: string }).reason, reason);
});

Then('請求 {string} 的保留狀態為 {string}', async function (this: FlashWorld, requestId: string, status: string) {
  const { holdId } = okValue(this.grabResults.get(requestId), requestId);
  const hold = await this.anyServer().getHold(holdId);
  assert.ok(hold);
  assert.equal(hold.status, status);
});

Then('查詢保留 {string} 得到空值', async function (this: FlashWorld, holdId: string) {
  assert.equal(await this.anyServer().getHold(holdId), null);
});

Given(
  '伺服器 {string} 會在對 {string} 開頭的 key 執行 {word} 之前當機',
  function (this: FlashWorld, server: string, keyPrefix: string, op: string) {
    this.server(server).store.arm({ kind: 'crash', before: { op: op as keyof Store, keyPrefix } });
  },
);

Given(
  '伺服器 {string} 會在對 {string} 開頭的 key 執行 {word} 之前卡住',
  function (this: FlashWorld, server: string, keyPrefix: string, op: string) {
    this.server(server).store.arm({ kind: 'stall', before: { op: op as keyof Store, keyPrefix } });
  },
);

Then('請求 {string} 還沒有結果', function (this: FlashWorld, requestId: string) {
  assert.equal(this.grabResults.has(requestId), false);
  assert.equal(this.pendingGrabs.has(requestId), true);
});

When('伺服器 {string} 恢復並做完手上的工作', async function (this: FlashWorld, server: string) {
  this.server(server).store.resume();
  await Promise.all([...this.pendingGrabs.values()]);
  this.pendingGrabs.clear();
});
