import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FlashSale, Store } from '../src/flash.ts';

// 測試端扮演共用儲存與排程器：每次 Store 存取都先排隊，由測試決定哪一台伺服器的哪一個存取先完成。
// 每台伺服器是 src/flash.ts 的一份獨立模組實例，彼此不共用記憶體。
const T0 = Date.parse('2026-06-15T12:00:00Z');
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let worldNo = 0;
type Op = { server: number; run: () => void; seq: number };

async function world(n = 1, seed?: number) {
  const id = ++worldNo;
  const rnd = seed === undefined ? null : mulberry32(seed);
  let clock = T0;
  const data = new Map<string, { v: string | Set<string>; exp?: number }>();
  const ops: Op[] = [];
  let seq = 0;
  const frozen = new Set<number>();
  const paused = new Set<number>();
  let down = false;
  let opCount = new Map<number, number>();
  let trip: { server: number; at: number; mode: 'freeze' | 'pause' } | null = null;
  // 每次存取後可觸發的動作（例如時鐘前進）
  let onStep: (() => void) | null = null;

  const live = (k: string) => { const e = data.get(k); if (e && e.exp !== undefined && clock >= e.exp) { data.delete(k); return undefined; } return e; };
  const str = (k: string) => { const e = live(k); if (!e) return null; if (typeof e.v !== 'string') throw new Error('WRONGTYPE'); return e.v; };
  const set_ = (k: string) => { const e = live(k); if (!e) return undefined; if (!(e.v instanceof Set)) throw new Error('WRONGTYPE'); return e.v; };

  const makeStore = (server: number): Store => {
    const q = <T>(apply: () => T) => new Promise<T>((res, rej) => {
      if (down) { rej(new Error('store unavailable')); return; }
      const c = (opCount.get(server) ?? 0) + 1;
      opCount.set(server, c);
      if (trip && trip.server === server && trip.at === c) (trip.mode === 'freeze' ? frozen : paused).add(server);
      ops.push({ server, seq: seq++, run: () => { try { res(apply()); } catch (e) { rej(e); } } });
    });
    return {
      get: (k) => q(() => str(k)),
      set: (k, v, o) => q(() => {
        if (o?.nx && live(k)) return false;
        data.set(k, { v: String(v), exp: o?.px !== undefined ? clock + o.px : undefined });
        return true;
      }),
      del: (k) => q(() => { const had = !!live(k); data.delete(k); return had; }),
      incrBy: (k, n) => q(() => {
        const cur = str(k); const base = cur === null ? 0 : Number(cur);
        if (!Number.isInteger(base)) throw new Error('ERR not an integer');
        const e = live(k);
        data.set(k, { v: String(base + n), exp: e?.exp });
        return base + n;
      }),
      sAdd: (k, m) => q(() => { let s = set_(k); if (!s) { s = new Set(); data.set(k, { v: s }); } if (s.has(m)) return false; s.add(m); return true; }),
      sRem: (k, m) => q(() => { const s = set_(k); return !!s && s.delete(m); }),
      sMembers: (k) => q(() => [...(set_(k) ?? [])]),
    };
  };

  const servers: FlashSale[] = [];
  for (let i = 0; i < n; i++) {
    const mod = await import(`../src/flash.ts?w=${id}-${i}`);
    servers.push(mod.createFlashSale(makeStore(i), () => iso(clock)));
  }

  const tick = () => new Promise<void>((r) => setImmediate(r));
  // 推進所有工作直到完成；卡死或步數超過上限就丟錯
  async function drive<T>(tasks: Array<Promise<T>>, maxSteps = 20000, stopWhen?: () => boolean): Promise<T[]> {
    const done = tasks.map(() => false);
    const out: T[] = new Array(tasks.length);
    const errs: unknown[] = [];
    tasks.forEach((p, i) => p.then((v) => { out[i] = v; done[i] = true; }, (e) => { errs.push(e); done[i] = true; }));
    let idle = 0;
    for (let step = 0; ; step++) {
      await tick();
      if (errs.length) throw errs[0];
      if (done.every(Boolean) || stopWhen?.()) return out;
      if (step > maxSteps) throw new Error('請求一直沒有完成（疑似卡在鎖或無限重試）');
      const ready = ops.filter((o) => !frozen.has(o.server) && !paused.has(o.server));
      if (!ready.length) {
        // 可能在用計時器等待重試；給一點真實時間，太久就判定卡死
        if (++idle > 400) throw new Error('請求一直沒有完成（沒有任何可進行的存取）');
        await new Promise((r) => setTimeout(r, 1));
        continue;
      }
      idle = 0;
      const pick = rnd ? ready[Math.floor(rnd() * ready.length)] : ready.reduce((a, b) => (a.seq < b.seq ? a : b));
      ops.splice(ops.indexOf(pick), 1);
      pick.run();
      onStep?.();
    }
  }
  const run = async <T>(p: Promise<T>) => (await drive([p]))[0];

  return {
    s: servers, rnd,
    run, drive,
    now: () => clock,
    advance: (ms: number) => { clock += ms; },
    setDown: (v: boolean) => { down = v; },
    trip: (server: number, at: number, mode: 'freeze' | 'pause') => { opCount = new Map(); trip = { server, at, mode }; },
    resume: (server: number) => { paused.delete(server); trip = null; },
    // 推進某個請求，直到它所在的伺服器當機／卡住，或請求已完成
    until: (p: Promise<unknown>, server: number) => drive([p.catch(() => {})], 20000, () => frozen.has(server) || paused.has(server)),
    onStep: (f: (() => void) | null) => { onStep = f; },
    sale: (o: Partial<{ saleId: string; quantity: number; perCustomerLimit: number; startsAt: number; endsAt: number }> = {}) =>
      run(servers[0].openSale({
        saleId: o.saleId ?? 'S1', quantity: o.quantity ?? 10, perCustomerLimit: o.perCustomerLimit ?? 2,
        startsAt: iso(o.startsAt ?? T0), endsAt: iso(o.endsAt ?? T0 + 60 * MIN),
      })),
  };
}

let rid = 0;
const grab = (s: FlashSale, customerId: string, qty = 1, requestId = `r${++rid}`, saleId = 'S1') => s.grab({ saleId, customerId, qty, requestId });
const reason = (r: any, code: string) => { assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`); assert.equal(r.reason, code); };
const okv = (r: any) => { assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`); return r.value; };

// 「限購大於限量」是否合法沒有標準答案，所以每一題的限購都不超過限量。
type Case = [string, string, () => Promise<void>];
const cases: Case[] = [
  ['T5-01', 'behaviour', async () => {
    const w = await world(); await w.sale();
    const v = okv(await w.run(grab(w.s[0], 'c1', 2)));
    assert.ok(typeof v.holdId === 'string' && v.holdId.length > 0);
    assert.equal(Date.parse(v.expiresAt), T0 + 10 * MIN);
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 8);
    const h = await w.run(w.s[0].getHold(v.holdId));
    assert.equal(h?.status, 'HELD'); assert.equal(h?.qty, 2); assert.equal(h?.customerId, 'c1');
  }],
  ['T5-02', 'behaviour', async () => {
    const w = await world(); await w.sale({ quantity: 3, perCustomerLimit: 3 });
    okv(await w.run(grab(w.s[0], 'c1', 3)));
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 0);
  }],
  ['T5-03', 'reason', async () => {
    const w = await world(); await w.sale({ quantity: 3, perCustomerLimit: 3 });
    okv(await w.run(grab(w.s[0], 'c1', 2)));
    reason(await w.run(grab(w.s[0], 'c2', 2)), 'SOLD_OUT');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 1);
  }],
  ['T5-04', 'reason', async () => {
    const w = await world(); await w.sale({ perCustomerLimit: 2 });
    reason(await w.run(grab(w.s[0], 'c1', 3)), 'LIMIT_EXCEEDED');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-05', 'reason', async () => {
    const w = await world(); await w.sale({ perCustomerLimit: 2 });
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    okv(await w.run(w.s[0].pay(a.holdId)));
    okv(await w.run(grab(w.s[0], 'c1', 1)));
    reason(await w.run(grab(w.s[0], 'c1', 1)), 'LIMIT_EXCEEDED');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 8);
  }],
  ['T5-06', 'behaviour', async () => {
    const w = await world(); await w.sale({ perCustomerLimit: 1 });
    okv(await w.run(grab(w.s[0], 'c1', 1)));
    w.advance(10 * MIN); await w.run(w.s[0].sweep());
    okv(await w.run(grab(w.s[0], 'c1', 1)));
  }],
  ['T5-07', 'reason', async () => {
    const w = await world(); await w.sale({ startsAt: T0 + MIN });
    reason(await w.run(grab(w.s[0], 'c1')), 'NOT_STARTED');
    w.advance(MIN);
    okv(await w.run(grab(w.s[0], 'c1')));
  }],
  ['T5-08', 'reason', async () => {
    const w = await world(); await w.sale({ endsAt: T0 + 5 * MIN });
    w.advance(5 * MIN - 1000); okv(await w.run(grab(w.s[0], 'c1')));
    w.advance(1000); reason(await w.run(grab(w.s[0], 'c2')), 'ENDED');
  }],
  ['T5-09', 'reason', async () => {
    const w = await world(); await w.sale();
    for (const q of [0, -1, 1.5]) reason(await w.run(grab(w.s[0], 'c1', q)), 'INVALID_INPUT');
    reason(await w.run(grab(w.s[0], '', 1)), 'INVALID_INPUT');
    reason(await w.run(w.s[0].grab({ saleId: 'S1', customerId: 'c1', qty: 1, requestId: '' })), 'INVALID_INPUT');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-10', 'reason', async () => {
    const w = await world(); await w.sale();
    reason(await w.run(grab(w.s[0], 'c1', 1, 'rx', 'NOPE')), 'SALE_NOT_FOUND');
  }],
  ['T5-11', 'reason', async () => {
    const w = await world();
    reason(await w.sale({ quantity: 0 }), 'INVALID_INPUT');
    reason(await w.sale({ perCustomerLimit: 0 }), 'INVALID_INPUT');
    reason(await w.sale({ startsAt: T0 + MIN, endsAt: T0 + MIN }), 'INVALID_INPUT');
    okv(await w.sale());
    reason(await w.sale({ quantity: 99 }), 'DUPLICATE_SALE');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-12', 'behaviour', async () => {
    const w = await world(); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 2)));
    okv(await w.run(w.s[0].pay(a.holdId)));
    assert.equal((await w.run(w.s[0].getHold(a.holdId)))?.status, 'PAID');
    w.advance(20 * MIN); await w.run(w.s[0].sweep());
    assert.equal((await w.run(w.s[0].getHold(a.holdId)))?.status, 'PAID');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 8);
  }],
  ['T5-13', 'behaviour', async () => {
    const w = await world(2); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    okv(await w.run(w.s[0].pay(a.holdId)));
    okv(await w.run(w.s[1].pay(a.holdId)));
    okv(await w.run(w.s[0].pay(a.holdId)));
    assert.equal((await w.run(w.s[1].getHold(a.holdId)))?.status, 'PAID');
    assert.equal(await w.run(w.s[1].getRemaining('S1')), 9);
  }],
  ['T5-14', 'reason', async () => {
    const w = await world(); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    w.advance(10 * MIN);
    reason(await w.run(w.s[0].pay(a.holdId)), 'HOLD_EXPIRED');
    await w.run(w.s[0].sweep());
    assert.equal((await w.run(w.s[0].getHold(a.holdId)))?.status, 'EXPIRED');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-15', 'reason', async () => {
    const w = await world(); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    w.advance(11 * MIN); await w.run(w.s[0].sweep());
    reason(await w.run(w.s[0].pay(a.holdId)), 'HOLD_EXPIRED');
    reason(await w.run(w.s[0].pay('no-such-hold')), 'HOLD_NOT_FOUND');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-16', 'behaviour', async () => {
    const w = await world(); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 2)));
    w.advance(10 * MIN - 1000); await w.run(w.s[0].sweep());
    assert.equal((await w.run(w.s[0].getHold(a.holdId)))?.status, 'HELD');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 8);
    w.advance(1000); await w.run(w.s[0].sweep());
    assert.equal((await w.run(w.s[0].getHold(a.holdId)))?.status, 'EXPIRED');
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 10);
  }],
  ['T5-17', 'behaviour', async () => {
    const w = await world(); await w.sale({ endsAt: T0 + 5 * MIN });
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    w.advance(7 * MIN);
    okv(await w.run(w.s[0].pay(a.holdId)));
  }],
  ['T5-18', 'behaviour', async () => {
    const w = await world(2); await w.sale({ perCustomerLimit: 1 });
    const a = okv(await w.run(grab(w.s[0], 'c1', 1, 'same')));
    const b = okv(await w.run(grab(w.s[1], 'c1', 1, 'same')));
    assert.equal(b.holdId, a.holdId); assert.equal(b.expiresAt, a.expiresAt);
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 9);
  }],
  ['T5-19', 'behaviour', async () => {
    const w = await world(); await w.sale({ quantity: 1, perCustomerLimit: 1 });
    okv(await w.run(grab(w.s[0], 'c1', 1)));
    reason(await w.run(grab(w.s[0], 'c2', 1, 'retry')), 'SOLD_OUT');
    w.advance(10 * MIN); await w.run(w.s[0].sweep());
    okv(await w.run(grab(w.s[0], 'c2', 1, 'retry')));
  }],
  ['T5-20', 'behaviour', async () => {
    const w = await world(2); await w.sale();
    assert.equal(await w.run(w.s[1].getRemaining('S1')), 10);
    const a = okv(await w.run(grab(w.s[0], 'c1', 2)));
    assert.equal(await w.run(w.s[1].getRemaining('S1')), 8);
    w.advance(10 * MIN); await w.run(w.s[0].sweep());
    assert.equal(await w.run(w.s[1].getRemaining('S1')), 10);
    assert.equal((await w.run(w.s[1].getHold(a.holdId)))?.status, 'EXPIRED');
  }],
  ['T5-21', 'reason', async () => {
    const w = await world(); await w.sale();
    const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
    w.setDown(true);
    reason(await w.run(grab(w.s[0], 'c2', 1)), 'TRY_AGAIN');
    reason(await w.run(w.s[0].pay(a.holdId)), 'TRY_AGAIN');
    w.setDown(false);
    assert.equal(await w.run(w.s[0].getRemaining('S1')), 9);
  }],

  // ── 多台伺服器同時處理 ──
  ['T5-22', 'concurrency', async () => {
    for (let seed = 1; seed <= 60; seed++) {
      const w = await world(3, seed); await w.sale({ quantity: 10, perCustomerLimit: 1 });
      const rs = await w.drive(Array.from({ length: 10 }, (_, i) => grab(w.s[i % 3], `c${i}`)));
      assert.equal(rs.filter((r) => r.ok).length, 10, `seed ${seed}: 還有名額卻沒搶到 ${JSON.stringify(rs.filter((r) => !r.ok))}`);
      assert.equal(await w.run(w.s[0].getRemaining('S1')), 0, `seed ${seed}`);
    }
  }],
  ['T5-23', 'concurrency', async () => {
    for (let seed = 1; seed <= 100; seed++) {
      const w = await world(3, seed); await w.sale({ quantity: 10, perCustomerLimit: 1 });
      const rs = await w.drive(Array.from({ length: 15 }, (_, i) => grab(w.s[i % 3], `c${i}`)));
      assert.equal(rs.filter((r) => r.ok).length, 10, `seed ${seed}: 成功 ${rs.filter((r) => r.ok).length} 筆`);
      for (const r of rs) if (!r.ok) assert.equal(r.reason, 'SOLD_OUT', `seed ${seed}`);
      assert.equal(await w.run(w.s[0].getRemaining('S1')), 0, `seed ${seed}`);
    }
  }],
  ['T5-24', 'concurrency', async () => {
    for (let seed = 1; seed <= 100; seed++) {
      const w = await world(2, seed); await w.sale({ quantity: 10, perCustomerLimit: 1 });
      const rs = await w.drive([grab(w.s[0], 'c1'), grab(w.s[1], 'c1')]);
      assert.equal(rs.filter((r) => r.ok).length, 1, `seed ${seed}: ${JSON.stringify(rs)}`);
      reason(rs.find((r) => !r.ok), 'LIMIT_EXCEEDED');
      assert.equal(await w.run(w.s[0].getRemaining('S1')), 9, `seed ${seed}`);
    }
  }],
  ['T5-25', 'concurrency', async () => {
    for (let seed = 1; seed <= 100; seed++) {
      const w = await world(3, seed); await w.sale({ quantity: 6, perCustomerLimit: 3 });
      const holds = [];
      for (const [c, q] of [['c1', 2], ['c2', 1], ['c3', 3]] as const) holds.push(okv(await w.run(grab(w.s[0], c, q))));
      w.advance(10 * MIN);
      await w.drive([w.s[0].sweep(), w.s[1].sweep(), w.s[2].sweep()]);
      assert.equal(await w.run(w.s[0].getRemaining('S1')), 6, `seed ${seed}: 同一張保留被釋放了不只一次`);
      for (const h of holds) assert.equal((await w.run(w.s[0].getHold(h.holdId)))?.status, 'EXPIRED', `seed ${seed}`);
      okv(await w.run(grab(w.s[1], 'c3', 3)));
    }
  }],
  ['T5-26', 'concurrency', async () => {
    for (let seed = 1; seed <= 200; seed++) {
      const w = await world(2, seed); await w.sale({ quantity: 1, perCustomerLimit: 1 });
      const a = okv(await w.run(grab(w.s[0], 'c1', 1)));
      w.advance(10 * MIN - 1000);
      // 付款與排程同時進行，途中某個時刻時鐘越過到期時間
      let steps = 0; const flip = Math.floor(w.rnd!() * 12);
      w.onStep(() => { if (steps++ === flip) w.advance(1000); });
      const [paid] = await w.drive([w.s[0].pay(a.holdId), w.s[1].sweep()]);
      w.onStep(null);
      await w.run(w.s[1].sweep());
      const st = (await w.run(w.s[0].getHold(a.holdId)))?.status;
      const left = await w.run(w.s[0].getRemaining('S1'));
      if (paid.ok) { assert.equal(st, 'PAID', `seed ${seed}: 付款成功但保留被釋放`); assert.equal(left, 0, `seed ${seed}: 付款成功但名額被還回去`); }
      else { reason(paid, 'HOLD_EXPIRED'); assert.equal(st, 'EXPIRED', `seed ${seed}`); assert.equal(left, 1, `seed ${seed}`); }
    }
  }],
  ['T5-27', 'fault', async () => {
    for (let k = 1; k <= 8; k++) {
      const w = await world(2, k); await w.sale({ quantity: 10, perCustomerLimit: 2 });
      w.trip(0, k, 'freeze');
      await w.until(grab(w.s[0], 'c1', 1), 0);
      w.advance(5000);
      const [r] = await w.drive([grab(w.s[1], 'c2', 1)]);
      assert.equal(r.ok, true, `k=${k}: 另一台當機 5 秒後仍搶不到 ${JSON.stringify(r)}`);
    }
  }],
  ['T5-28', 'fault', async () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (let k = 1; k <= 8; k++) {
        const w = await world(2, seed * 100 + k); await w.sale({ quantity: 3, perCustomerLimit: 3 });
        w.trip(0, k, 'pause');
        const slow = grab(w.s[0], 'c0', 1);
        await w.until(slow, 0);
        w.advance(30_000);
        const rs = await w.drive([grab(w.s[1], 'c1', 1), grab(w.s[1], 'c2', 1), grab(w.s[1], 'c3', 1)]);
        w.resume(0);
        const [sr] = await w.drive([slow]);
        let used = 0;
        for (const r of [...rs, sr]) if (r.ok) used += (await w.run(w.s[1].getHold(r.value.holdId)))!.qty;
        assert.ok(used <= 3, `seed ${seed} k=${k}: 卡住的伺服器恢復後超賣（成立 ${used} 件 > 限量 3）`);
        assert.equal(await w.run(w.s[1].getRemaining('S1')), 3 - used, `seed ${seed} k=${k}: 剩餘與保留對不上`);
      }
    }
  }],
];

// 混合操作：三台伺服器同時搶、付款、跑排程、重送請求、時鐘前進
async function chaos(seed: number) {
  const w = await world(3, seed);
  const rnd = w.rnd!;
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const quantity = int(1, 8), limit = Math.min(int(1, 3), quantity);
  await w.sale({ quantity, perCustomerLimit: limit });
  const customers = ['c1', 'c2', 'c3', 'c4'];
  const grabs: Array<{ c: string; qty: number; rid: string; r: any }> = [];
  const pays: Array<{ holdId: string; r: any }> = [];
  for (let round = 0; round < 6; round++) {
    const tasks: Array<Promise<unknown>> = [];
    const doneRids = grabs.filter((g) => g.r).map((g) => g);
    for (let j = int(1, 5); j > 0; j--) {
      const s = w.s[int(0, 2)];
      const x = rnd();
      if (x < 0.55) {
        const reuse = doneRids.length && rnd() < 0.2 ? doneRids[int(0, doneRids.length - 1)] : null;
        const g = reuse ? { c: reuse.c, qty: reuse.qty, rid: reuse.rid, r: null as any } : { c: customers[int(0, 3)], qty: int(1, 2), rid: `x${seed}-${round}-${j}`, r: null as any };
        if (!reuse && tasks.length && grabs.some((o) => o.rid === g.rid)) continue;
        grabs.push(g);
        tasks.push(s.grab({ saleId: 'S1', customerId: g.c, qty: g.qty, requestId: g.rid }).then((r) => { g.r = r; }));
      } else if (x < 0.8) {
        const ok = grabs.filter((g) => g.r?.ok);
        if (!ok.length) continue;
        const p = { holdId: ok[int(0, ok.length - 1)].r.value.holdId, r: null as any };
        pays.push(p);
        tasks.push(s.pay(p.holdId).then((r) => { p.r = r; }));
      } else tasks.push(s.sweep());
    }
    let steps = 0; const jump = int(0, 20), by = int(0, 4) * MIN;
    w.onStep(() => { if (steps++ === jump) w.advance(by); });
    await w.drive(tasks);
    w.onStep(null);
  }
  return { w, quantity, limit, grabs, pays };
}

async function check(seed: number) {
  const { w, quantity, limit, grabs, pays } = await chaos(seed);
  const holds = new Map<string, any>();
  for (const g of grabs) if (g.r?.ok) {
    const h = await w.run(w.s[0].getHold(g.r.value.holdId));
    assert.ok(h, `seed ${seed}: 搶到的保留查不到`);
    assert.equal(h.customerId, g.c, `seed ${seed}`); assert.equal(h.qty, g.qty, `seed ${seed}`);
    holds.set(h.holdId, h);
  }
  for (const p of pays) if (p.r?.ok) assert.equal(holds.get(p.holdId)?.status, 'PAID', `seed ${seed}: 付款成功的保留最後不是 PAID`);
  const active = [...holds.values()].filter((h) => h.status !== 'EXPIRED');
  const used = active.reduce((s, h) => s + h.qty, 0);
  assert.ok(used <= quantity, `seed ${seed}: 超賣（保留＋成交 ${used} > 限量 ${quantity}）`);
  // 到期但排程還沒釋放的保留，getHold 顯示什麼狀態需求沒有規定，所以排程前只檢查不等式
  const left = await w.run(w.s[0].getRemaining('S1'));
  assert.ok(left <= quantity - used, `seed ${seed}: 剩餘 ${left} 大於 限量 − 保留 − 成交 = ${quantity - used}`);
  for (const c of ['c1', 'c2', 'c3', 'c4']) {
    const mine = active.filter((h) => h.customerId === c).reduce((s, h) => s + h.qty, 0);
    assert.ok(mine <= limit, `seed ${seed}: ${c} 超過限購（${mine} > ${limit}）`);
  }
  w.advance(11 * MIN);
  await w.run(w.s[1].sweep());
  const paid = [...holds.keys()];
  let paidQty = 0;
  for (const id of paid) { const h = await w.run(w.s[2].getHold(id)); if (h?.status === 'PAID') paidQty += h.qty; else assert.equal(h?.status, 'EXPIRED', `seed ${seed}`); }
  assert.equal(await w.run(w.s[0].getRemaining('S1')), quantity - paidQty, `seed ${seed}: 全部到期釋放後剩餘不對`);
}

cases.push(['T5-29', 'property', async () => { for (let seed = 1; seed <= 300; seed++) await check(seed); }]);

for (const [id, tag, fn] of cases) test(`${id} [${tag}]`, { timeout: 120_000 }, fn);
