import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { FlashSale, GrabInput, Result, SaleInput } from '../../src/flash.js';
import { FlashWorld, type AnyResult, type HoldRef } from '../support/world.js';
import { crashAfter, stallAt } from '../support/memory-store.js';

const toNumber = (s: string): number => Number(s);

async function allowFail<T>(p: Promise<T>): Promise<Result<T> | { crashed: true }> {
  try {
    return { ok: true, value: await p };
  } catch (e) {
    if (e instanceof Error && e.message === 'CRASH') return { crashed: true };
    throw e;
  }
}

function assertOk(r: AnyResult | undefined): void {
  assert.ok(r, '沒有結果');
  assert.equal(r.ok, true, `預期成功，實際失敗：${r.ok ? '' : r.reason}`);
}

function assertFail(r: AnyResult | undefined, reason: string): void {
  assert.ok(r, '沒有結果');
  assert.equal(r.ok, false, '預期失敗，實際成功');
  if (!r.ok) assert.equal(r.reason, reason);
}

// ---------- 共用 Given ----------

Given('現在時間是 {string}', function (this: FlashWorld, iso: string) {
  this.clock = iso;
});

Given('有 {int} 台伺服器', function (this: FlashWorld, n: number) {
  for (let i = 1; i <= n; i++) this.makeServer(`S${i}`);
});

Given('已使用交錯式 Store', function (this: FlashWorld) {
  this.interleave = true;
  for (const name of [...this.servers.keys()]) this.makeServer(name);
});

Given('伺服器 {string} 的 Store 會在第 {int} 次操作當機', function (this: FlashWorld, name: string, k: number) {
  this.makeServer(name, crashAfter(this.base, k));
});

Given('伺服器 {string} 的 Store 會在第 {int} 次操作卡住', function (this: FlashWorld, name: string, k: number) {
  const st = stallAt(this.base, k);
  this.stalls.set(name, st);
  this.makeServer(name, st.store);
});

Given(
  '伺服器 {string} 開了搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}',
  async function (this: FlashWorld, server: string, saleId: string, quantity: number, limit: number, startsAt: string, endsAt: string) {
    const r = await this.server(server).openSale({ saleId, quantity, perCustomerLimit: limit, startsAt, endsAt });
    assertOk(r);
  },
);

// ---------- 開檔 ----------

When(
  '伺服器 {string} 開搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}',
  async function (this: FlashWorld, server: string, saleId: string, quantity: number, limit: number, startsAt: string, endsAt: string) {
    this.lastResult = await this.server(server).openSale({ saleId, quantity, perCustomerLimit: limit, startsAt, endsAt });
  },
);

When(
  '伺服器 {string} 以原始參數開搶購 編號 {string} 限量 {string} 限購 {string} 從 {string} 到 {string}',
  async function (this: FlashWorld, server: string, saleId: string, quantity: string, limit: string, startsAt: string, endsAt: string) {
    const input: SaleInput = { saleId, quantity: toNumber(quantity), perCustomerLimit: toNumber(limit), startsAt, endsAt };
    this.lastResult = await this.server(server).openSale(input);
  },
);

When(
  '伺服器 {string} 和 {string} 同時開搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}',
  async function (this: FlashWorld, a: string, b: string, saleId: string, quantity: number, limit: number, startsAt: string, endsAt: string) {
    const input: SaleInput = { saleId, quantity, perCustomerLimit: limit, startsAt, endsAt };
    this.batch = await Promise.all([this.server(a).openSale(input), this.server(b).openSale(input)]);
    this.batchMeta = [];
  },
);

// ---------- 時間 ----------

When('時間推進到 {string}', function (this: FlashWorld, iso: string) {
  this.clock = iso;
});

// ---------- 搶購 ----------

When(
  '伺服器 {string} 替顧客 {string} 搶購 {string} {int} 件 請求編號 {string}',
  async function (this: FlashWorld, server: string, customerId: string, saleId: string, qty: number, requestId: string) {
    const r = await this.server(server).grab({ saleId, customerId, qty, requestId });
    this.recordGrab(requestId, r);
  },
);

When(
  '伺服器 {string} 替顧客 {string} 搶購 {string} {int} 件 請求編號 {string} 並允許失敗',
  async function (this: FlashWorld, server: string, customerId: string, saleId: string, qty: number, requestId: string) {
    const r = await allowFail(this.server(server).grab({ saleId, customerId, qty, requestId }));
    if ('crashed' in r) {
      this.lastResult = undefined;
      return;
    }
    this.recordGrab(requestId, r.ok ? r.value : r);
  },
);

When(
  '伺服器 {string} 以原始參數搶購 編號 {string} 顧客 {string} 件數 {string} 請求編號 {string}',
  async function (this: FlashWorld, server: string, saleId: string, customerId: string, qty: string, requestId: string) {
    const input: GrabInput = { saleId, customerId, qty: toNumber(qty), requestId };
    this.lastResult = await this.server(server).grab(input);
  },
);

When('以下搶購同時送出:', async function (this: FlashWorld, table: DataTable) {
  const rows = table.hashes();
  const metas = rows.map((row) => ({ customerId: row['顧客'] ?? '', qty: Number(row['件數']) }));
  const results = await Promise.all(
    rows.map((row) =>
      this.server(row['伺服器'] ?? '').grab({
        saleId: row['搶購'] ?? '',
        customerId: row['顧客'] ?? '',
        qty: Number(row['件數']),
        requestId: row['請求編號'] ?? '',
      }),
    ),
  );
  this.batch = results;
  this.batchMeta = metas;
  rows.forEach((row, i) => {
    const r = results[i];
    if (r && r.ok) this.holds.set(row['請求編號'] ?? '', r.value);
  });
});

When(
  '{int} 位顧客各以 {int} 筆請求透過 {int} 台伺服器同時搶購 {string} 每筆 {int} 件',
  async function (this: FlashWorld, customers: number, requests: number, serverCount: number, saleId: string, qty: number) {
    const servers: FlashSale[] = [];
    for (let i = 1; i <= serverCount; i++) {
      const name = `S${i}`;
      servers.push(this.servers.get(name) ?? this.makeServer(name));
    }
    const jobs: Promise<Result<HoldRef>>[] = [];
    const metas: { customerId: string; qty: number }[] = [];
    let k = 0;
    for (let c = 1; c <= customers; c++) {
      for (let r = 1; r <= requests; r++) {
        const server = servers[k % servers.length];
        if (!server) throw new Error('沒有伺服器');
        k++;
        const customerId = `c${c}`;
        metas.push({ customerId, qty });
        jobs.push(server.grab({ saleId, customerId, qty, requestId: `c${c}-r${r}` }));
      }
    }
    this.batch = await Promise.all(jobs);
    this.batchMeta = metas;
  },
);

When(
  '伺服器 {string} 替顧客 {string} 以請求編號 {string} 重送搶購 {string} {int} 件 共 {int} 次',
  async function (this: FlashWorld, server: string, customerId: string, requestId: string, saleId: string, qty: number, times: number) {
    const results: Result<HoldRef>[] = [];
    for (let i = 0; i < times; i++) results.push(await this.server(server).grab({ saleId, customerId, qty, requestId }));
    this.batch = results;
    this.batchMeta = results.map(() => ({ customerId, qty }));
    const last = results[results.length - 1];
    if (last) this.lastResult = last;
  },
);

// ---------- 付款 ----------

When('伺服器 {string} 收到請求編號 {string} 之保留的付款通知', async function (this: FlashWorld, server: string, requestId: string) {
  this.lastResult = await this.server(server).pay(this.hold(requestId).holdId);
});

When('伺服器 {string} 收到請求編號 {string} 之保留的付款通知 共 {int} 次', async function (this: FlashWorld, server: string, requestId: string, times: number) {
  const holdId = this.hold(requestId).holdId;
  const results: AnyResult[] = [];
  for (let i = 0; i < times; i++) results.push(await this.server(server).pay(holdId));
  this.batch = results;
  this.batchMeta = [];
  const last = results[results.length - 1];
  if (last) this.lastResult = last;
});

When('伺服器 {string} 收到保留編號 {string} 的付款通知', async function (this: FlashWorld, server: string, holdId: string) {
  this.lastResult = await this.server(server).pay(holdId);
});

When('伺服器 {string} 在背景收到請求編號 {string} 之保留的付款通知', async function (this: FlashWorld, server: string, requestId: string) {
  const st = this.stalls.get(server);
  this.background = this.server(server).pay(this.hold(requestId).holdId);
  if (st) await st.stalled;
});

When('放行卡住的伺服器 {string} 並等待背景操作完成', async function (this: FlashWorld, server: string) {
  const st = this.stalls.get(server);
  assert.ok(st, `伺服器 ${server} 沒有卡住`);
  st.release();
  assert.ok(this.background, '沒有背景操作');
  this.lastResult = await this.background;
});

// ---------- 排程 ----------

When('伺服器 {string} 執行排程', async function (this: FlashWorld, server: string) {
  await this.server(server).sweep();
});

When('伺服器 {string} 執行排程 並允許失敗', async function (this: FlashWorld, server: string) {
  await allowFail(this.server(server).sweep());
});

When('伺服器 {string} 和 {string} 同時執行排程', async function (this: FlashWorld, a: string, b: string) {
  await Promise.all([this.server(a).sweep(), this.server(b).sweep()]);
});

// ---------- Then：結果 ----------

Then('結果為成功', function (this: FlashWorld) {
  assertOk(this.lastResult);
});

Then('結果為失敗 原因 {string}', function (this: FlashWorld, reason: string) {
  assertFail(this.lastResult, reason);
});

Then('回傳的到期時間是 {string}', function (this: FlashWorld, iso: string) {
  const r = this.lastResult as Result<HoldRef> | undefined;
  assertOk(r);
  if (r && r.ok) assert.equal(r.value.expiresAt, iso);
});

Then('回傳的保留編號與請求編號 {string} 的相同', function (this: FlashWorld, requestId: string) {
  const r = this.lastResult as Result<HoldRef> | undefined;
  assertOk(r);
  if (r && r.ok) assert.equal(r.value.holdId, this.hold(requestId).holdId);
});

Then('回傳的到期時間與請求編號 {string} 的相同', function (this: FlashWorld, requestId: string) {
  const r = this.lastResult as Result<HoldRef> | undefined;
  assertOk(r);
  if (r && r.ok) assert.equal(r.value.expiresAt, this.hold(requestId).expiresAt);
});

Then('並行操作的結果中成功 {int} 次 失敗原因 {string} {int} 次', function (this: FlashWorld, okCount: number, reason: string, failCount: number) {
  const oks = this.batch.filter((r) => r.ok).length;
  const fails = this.batch.filter((r) => !r.ok && r.reason === reason).length;
  assert.equal(oks, okCount, `成功次數：${JSON.stringify(this.batch)}`);
  assert.equal(fails, failCount, `失敗次數：${JSON.stringify(this.batch)}`);
  assert.equal(this.batch.length, okCount + failCount, `其他結果：${JSON.stringify(this.batch)}`);
});

Then('並行操作全部成功且保留編號相同', function (this: FlashWorld) {
  const results = this.batch as Result<HoldRef>[];
  assert.ok(results.length > 0);
  for (const r of results) assertOk(r);
  const ids = new Set(results.map((r) => (r.ok ? r.value.holdId : '')));
  assert.equal(ids.size, 1, `保留編號不同：${[...ids].join(',')}`);
});

Then('並行搶購中成功的件數總和為 {int}', function (this: FlashWorld, total: number) {
  let sum = 0;
  this.batch.forEach((r, i) => {
    if (r.ok) sum += this.batchMeta[i]?.qty ?? 0;
  });
  assert.equal(sum, total);
});

Then('並行搶購中成功的件數總和加上搶購 {string} 的剩餘件數等於 {int}', async function (this: FlashWorld, saleId: string, total: number) {
  let sum = 0;
  this.batch.forEach((r, i) => {
    if (r.ok) sum += this.batchMeta[i]?.qty ?? 0;
  });
  const remaining = await this.anyServer().getRemaining(saleId);
  assert.equal(sum + remaining, total, `成功 ${sum} 件 + 剩餘 ${remaining} 件`);
});

Then('搶購 {string} 的剩餘件數不大於 {int}', async function (this: FlashWorld, saleId: string, n: number) {
  const actual = await this.anyServer().getRemaining(saleId);
  assert.ok(actual <= n, `剩餘 ${actual} > ${n}`);
});

Then('並行搶購中每位顧客成功件數不超過 {int}', function (this: FlashWorld, limit: number) {
  const perCustomer = new Map<string, number>();
  this.batch.forEach((r, i) => {
    const meta = this.batchMeta[i];
    if (r.ok && meta) perCustomer.set(meta.customerId, (perCustomer.get(meta.customerId) ?? 0) + meta.qty);
  });
  for (const [c, n] of perCustomer) assert.ok(n <= limit, `顧客 ${c} 成功 ${n} 件 > ${limit}`);
});

// ---------- Then：剩餘與保留查詢 ----------

Then('搶購 {string} 的剩餘件數為 {int}', async function (this: FlashWorld, saleId: string, n: number) {
  assert.equal(await this.anyServer().getRemaining(saleId), n);
});

Then('伺服器 {string} 查詢搶購 {string} 的剩餘件數為 {int}', async function (this: FlashWorld, server: string, saleId: string, n: number) {
  assert.equal(await this.server(server).getRemaining(saleId), n);
});

Then('伺服器 {string} 查詢搶購 {string} 的剩餘件數不小於 {int}', async function (this: FlashWorld, server: string, saleId: string, n: number) {
  const actual = await this.server(server).getRemaining(saleId);
  assert.ok(actual >= n, `剩餘 ${actual} < ${n}`);
});

Then('搶購 {string} 的剩餘件數在任一伺服器查詢皆為 {int}', async function (this: FlashWorld, saleId: string, n: number) {
  for (const [name, s] of this.servers) assert.equal(await s.getRemaining(saleId), n, `伺服器 ${name}`);
});

Then('請求編號 {string} 的保留狀態為 {string}', async function (this: FlashWorld, requestId: string, status: string) {
  const h = await this.anyServer().getHold(this.hold(requestId).holdId);
  assert.ok(h, '保留不存在');
  assert.equal(h.status, status);
});

Then('伺服器 {string} 查詢請求編號 {string} 的保留狀態為 {string}', async function (this: FlashWorld, server: string, requestId: string, status: string) {
  const h = await this.server(server).getHold(this.hold(requestId).holdId);
  assert.ok(h, '保留不存在');
  assert.equal(h.status, status);
});

Then('保留編號 {string} 不存在', async function (this: FlashWorld, holdId: string) {
  assert.equal(await this.anyServer().getHold(holdId), null);
});

Then(
  '請求編號 {string} 的保留內容為 搶購 {string} 顧客 {string} 件數 {int}',
  async function (this: FlashWorld, requestId: string, saleId: string, customerId: string, qty: number) {
    const ref = this.hold(requestId);
    const h = await this.anyServer().getHold(ref.holdId);
    assert.ok(h, '保留不存在');
    assert.equal(h.holdId, ref.holdId);
    assert.equal(h.saleId, saleId);
    assert.equal(h.customerId, customerId);
    assert.equal(h.qty, qty);
    assert.equal(h.expiresAt, ref.expiresAt);
  },
);

Then('請求編號 {string} 的保留到期時間為 {string}', async function (this: FlashWorld, requestId: string, iso: string) {
  const h = await this.anyServer().getHold(this.hold(requestId).holdId);
  assert.ok(h, '保留不存在');
  assert.equal(h.expiresAt, iso);
});
