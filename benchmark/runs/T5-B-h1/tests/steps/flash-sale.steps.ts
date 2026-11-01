import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { Result } from '../../src/flash.js';
import { CONCURRENCY_TRIALS, FlashWorld } from '../support/world.js';

// ---------- helpers ----------

function toInt(text: string): number {
  // 非整數文字（例如 "1.5"、"abc"）原樣交給實作判斷，NaN 也會被視為非正整數
  return Number(text);
}

/**
 * 併發情境：每一次交錯都從全新儲存開始，三台伺服器輪流接收請求，
 * 儲存操作之間隨機交錯。結果累積在 world.trialResults，逐次斷言。
 */
async function runConcurrent(
  world: FlashWorld,
  saleId: string,
  count: number,
  customerOf: (i: number) => string,
  qtyOf: (i: number) => number,
  requestOf: (i: number) => string,
): Promise<void> {
  world.trialResults = [];
  for (let seed = 1; seed <= CONCURRENCY_TRIALS; seed++) {
    await world.resetForTrial(saleId, seed);
    const calls: Promise<Result<unknown>>[] = [];
    for (let i = 1; i <= count; i++) {
      calls.push(grabOn(world, (i - 1) % world.servers.length, customerOf(i), qtyOf(i), saleId, requestOf(i)));
    }
    const results = await Promise.all(calls);
    world.trialResults.push(results);
  }
  world.concurrentResults = world.trialResults[world.trialResults.length - 1] ?? [];
}

function asSuccess(result: Result<unknown>): result is { ok: true; value: unknown } {
  return result.ok;
}

function holdOf(world: FlashWorld, name: string): { holdId: string; expiresAt: string } {
  const hold = world.holdByName.get(name);
  if (!hold) throw new Error(`unknown hold name ${name}`);
  return hold;
}

async function grabOn(
  world: FlashWorld,
  server: number,
  customerId: string,
  qty: number,
  saleId: string,
  requestId: string,
): Promise<Result<unknown>> {
  world.lastGrab = { server, customerId, qty, saleId, requestId };
  const result = (await world.server(server).grab({ saleId, customerId, qty, requestId })) as Result<unknown>;
  world.lastResult = result;
  if (asSuccess(result)) {
    world.successes.push({ saleId, customerId, qty });
  }
  return result;
}

function sumQty(world: FlashWorld, saleId: string, customerId?: string): number {
  return world.successes
    .filter((s) => s.saleId === saleId && (customerId === undefined || s.customerId === customerId))
    .reduce((acc, s) => acc + s.qty, 0);
}

// ---------- Given ----------

Given('the clock is at {string}', function (this: FlashWorld, iso: string) {
  this.clock.setTime(iso);
});

Given(
  'sale {string} is open with quantity {string}, per-customer limit {string}, from {string} to {string}',
  async function (this: FlashWorld, saleId: string, quantity: string, limit: string, from: string, to: string) {
    this.currentSale = saleId;
    this.saleParams.set(saleId, { quantity: toInt(quantity), perCustomerLimit: toInt(limit), from, to });
    const result = await this.server(0).openSale({
      saleId,
      quantity: toInt(quantity),
      perCustomerLimit: toInt(limit),
      startsAt: from,
      endsAt: to,
    });
    assert.equal(result.ok, true, `setup failed: ${JSON.stringify(result)}`);
  },
);

Given(
  'customer {string} holds {int} from sale {string} as hold {string}',
  async function (this: FlashWorld, customerId: string, qty: number, saleId: string, holdName: string) {
    const result = await grabOn(this, 0, customerId, qty, saleId, `req-${holdName}`);
    if (!result.ok) throw new Error(`setup grab failed: ${JSON.stringify(result)}`);
    this.holdByName.set(holdName, result.value as { holdId: string; expiresAt: string });
  },
);

Given('server {int} will crash once on its next write to a key containing {string}', function (this: FlashWorld, server: number, substr: string) {
  this.stores[server]!.failOnce.push(substr);
});

Given('server {int} pauses before writing a key containing {string}', function (this: FlashWorld, server: number, substr: string) {
  this.stalledRelease = this.stores[server]!.pauseBefore(substr);
});

// ---------- When: sale ----------

When(
  'I open sale {string} with quantity {string}, per-customer limit {string}, from {string} to {string}',
  async function (this: FlashWorld, saleId: string, quantity: string, limit: string, from: string, to: string) {
    this.lastResult = (await this.server(0).openSale({
      saleId,
      quantity: toInt(quantity),
      perCustomerLimit: toInt(limit),
      startsAt: from,
      endsAt: to,
    })) as Result<unknown>;
  },
);

// ---------- When: grab ----------

When(
  'customer {string} grabs {int} from sale {string} with request {string}',
  async function (this: FlashWorld, customerId: string, qty: number, saleId: string, requestId: string) {
    await grabOn(this, 0, customerId, qty, saleId, requestId);
  },
);

When(
  'server {int} customer {string} grabs {int} from sale {string} with request {string}',
  async function (this: FlashWorld, server: number, customerId: string, qty: number, saleId: string, requestId: string) {
    await grabOn(this, server, customerId, qty, saleId, requestId);
  },
);

When('the same request is sent again', async function (this: FlashWorld) {
  const g = this.lastGrab;
  if (!g) throw new Error('no previous grab');
  const first = this.lastResult;
  const again = (await this.server(g.server).grab({
    saleId: g.saleId,
    customerId: g.customerId,
    qty: g.qty,
    requestId: g.requestId,
  })) as Result<unknown>;
  this.firstResult = first;
  this.lastResult = again;
});

When(
  'server {int} starts grabbing {int} from sale {string} as customer {string} with request {string}',
  function (this: FlashWorld, server: number, qty: number, saleId: string, customerId: string, requestId: string) {
    this.stalled = grabOn(this, server, customerId, qty, saleId, requestId);
  },
);

When('server {int} resumes', async function (this: FlashWorld, _server: number) {
  if (!this.stalledRelease || !this.stalled) throw new Error('nothing paused');
  this.stalledRelease();
  this.stalledRelease = undefined;
  this.stalledResult = await this.stalled;
  this.stalled = undefined;
});

When(
  '{int} customers each grab {int} from sale {string} at the same time',
  async function (this: FlashWorld, count: number, qty: number, saleId: string) {
    await runConcurrent(this, saleId, count, (i) => `c${i}`, () => qty, (i) => `r${i}`);
  },
);

When(
  'customer {string} sends {int} grabs of {int} from sale {string} at the same time',
  async function (this: FlashWorld, customerId: string, count: number, qty: number, saleId: string) {
    await runConcurrent(this, saleId, count, () => customerId, () => qty, (i) => `${customerId}-r${i}`);
  },
);

// ---------- When: pay ----------

When('payment notice for hold {string} arrives', async function (this: FlashWorld, holdName: string) {
  this.lastResult = (await this.server(0).pay(holdOf(this, holdName).holdId)) as Result<unknown>;
});

When('payment notice for hold {string} arrives {int} times', async function (this: FlashWorld, holdName: string, times: number) {
  const holdId = holdOf(this, holdName).holdId;
  this.concurrentResults = [];
  for (let i = 0; i < times; i++) {
    this.concurrentResults.push((await this.server(i % this.servers.length).pay(holdId)) as Result<unknown>);
  }
  this.lastResult = this.concurrentResults[this.concurrentResults.length - 1];
});

When('server {int} receives payment notice for hold {string}', async function (this: FlashWorld, server: number, holdName: string) {
  this.lastResult = (await this.server(server).pay(holdOf(this, holdName).holdId)) as Result<unknown>;
});

When('payment notice for unknown hold arrives', async function (this: FlashWorld) {
  this.lastResult = (await this.server(0).pay('no-such-hold')) as Result<unknown>;
});

// ---------- When: time, sweep, snapshot ----------

When('the clock advances {int} minutes', function (this: FlashWorld, n: number) {
  this.clock.advanceMinutes(n);
});

When('the clock advances {int} seconds', function (this: FlashWorld, n: number) {
  this.clock.advanceSeconds(n);
});

When('the sweep runs on server {int}', async function (this: FlashWorld, server: number) {
  await this.server(server).sweep();
});

When('the sweep runs on server {int} and may crash', async function (this: FlashWorld, server: number) {
  try {
    await this.server(server).sweep();
    this.lastError = undefined;
  } catch (err) {
    this.lastError = err;
  }
});

When('the sweep runs on all servers', async function (this: FlashWorld) {
  await Promise.all(this.servers.map((s) => s.sweep()));
});

When('I take a snapshot of the store', function (this: FlashWorld) {
  this.snapshotText = this.base.snapshot();
});

// ---------- Then ----------

Then('the result is ok', function (this: FlashWorld) {
  assert.ok(this.lastResult, 'no result');
  assert.equal(this.lastResult.ok, true, `expected ok, got ${JSON.stringify(this.lastResult)}`);
});

Then('the result fails with reason {string}', function (this: FlashWorld, reason: string) {
  assert.ok(this.lastResult, 'no result');
  assert.deepEqual(this.lastResult, { ok: false, reason });
});

Then('the grab result is ok', function (this: FlashWorld) {
  assert.ok(this.lastResult, 'no result');
  assert.equal(this.lastResult.ok, true, `expected ok, got ${JSON.stringify(this.lastResult)}`);
});

Then('the hold expires at {string}', function (this: FlashWorld, iso: string) {
  assert.ok(this.lastResult && this.lastResult.ok, 'expected a successful result');
  assert.equal((this.lastResult.value as { expiresAt: string }).expiresAt, iso);
});

Then('the replayed result equals the first result', function (this: FlashWorld) {
  assert.deepEqual(this.lastResult, this.firstResult);
});

Then('all payment notices succeed', function (this: FlashWorld) {
  for (const r of this.concurrentResults) assert.deepEqual(r, { ok: true, value: null });
});

Then('exactly {int} grabs succeeded', function (this: FlashWorld, n: number) {
  const trials = this.trialResults.length > 0 ? this.trialResults : [this.concurrentResults];
  trials.forEach((results, idx) => {
    const ok = results.filter((r) => r.ok).length;
    assert.equal(ok, n, `trial ${idx + 1}: successes ${ok}, expected ${n}; results ${JSON.stringify(results)}`);
  });
});

Then('the successful grabs in sale {string} total at most {int} units', function (this: FlashWorld, saleId: string, max: number) {
  assert.ok(sumQty(this, saleId) <= max, `sold ${sumQty(this, saleId)} > ${max}`);
});

Then(
  'customer {string} holds at most {int} units in sale {string}',
  function (this: FlashWorld, customerId: string, max: number, saleId: string) {
    assert.ok(sumQty(this, saleId, customerId) <= max, `customer holds ${sumQty(this, saleId, customerId)} > ${max}`);
  },
);

Then('the stalled grab result is ok', function (this: FlashWorld) {
  assert.ok(this.stalledResult, 'no stalled result');
  assert.equal(this.stalledResult.ok, true, JSON.stringify(this.stalledResult));
});

Then('the stalled grab fails with reason {string}', function (this: FlashWorld, reason: string) {
  assert.deepEqual(this.stalledResult, { ok: false, reason });
});

Then('the remaining count is {int}', async function (this: FlashWorld, n: number) {
  const saleId = this.currentSale;
  assert.equal(await this.server(0).getRemaining(saleId), n);
});

Then('the remaining count on server {int} is {int}', async function (this: FlashWorld, server: number, n: number) {
  const saleId = this.currentSale;
  assert.equal(await this.server(server).getRemaining(saleId), n);
});

Then('the remaining count of sale {string} is {int}', async function (this: FlashWorld, saleId: string, n: number) {
  assert.equal(await this.server(0).getRemaining(saleId), n);
});

Then('hold {string} status is {string}', async function (this: FlashWorld, holdName: string, status: string) {
  const hold = await this.server(0).getHold(holdOf(this, holdName).holdId);
  assert.ok(hold, 'hold not found');
  assert.equal(hold.status, status);
});

Then('the store is unchanged since the snapshot', function (this: FlashWorld) {
  assert.ok(this.snapshotText !== undefined, 'no snapshot taken');
  assert.equal(this.base.snapshot(), this.snapshotText);
});

Then('the sweep on server {int} reported a crash', function (this: FlashWorld, _server: number) {
  assert.ok(this.lastError, 'expected an injected crash');
});
