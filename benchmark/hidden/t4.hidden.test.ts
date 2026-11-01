import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService, createInventoryService, createPaymentService, type Event } from '../src/shop.ts';

// 測試端扮演事件匯流排：每個事件廣播給三個服務，送達順序與重送由測試控制。
const T0 = '2026-06-15T12:00:00Z';
const at = (min: number, sec = 0) => new Date(Date.parse(T0) + min * 60000 + sec * 1000).toISOString();
type To = 'order' | 'inv' | 'pay';
const TARGETS: To[] = ['order', 'inv', 'pay'];

function world(stock: Record<string, number>, balances: Record<string, number>) {
  const svc = { order: createOrderService(), inv: createInventoryService(stock), pay: createPaymentService(balances) };
  const queue: Array<{ e: Event; to: To }> = [];
  const log: Event[] = [];
  const publish = (events: Event[]) => { for (const e of events) { log.push(e); for (const to of TARGETS) queue.push({ e, to }); } };
  const deliver = (i: number) => { const [d] = queue.splice(i, 1); publish(svc[d.to].handle(d.e)); };
  const w = {
    svc, queue, log, publish,
    place(orderId: string, customerId: string, sku: string, qty: number, amount: number, when = T0) {
      const r = svc.order.placeOrder({ orderId, customerId, sku, qty, amount, at: when });
      if (r.ok) publish(r.events);
      return r;
    },
    cancel(orderId: string, when = at(1)) { const r = svc.order.cancelOrder(orderId, when); if (r.ok) publish(r.events); return r; },
    tick(now: string) { publish(svc.order.tick(now)); },
    // 把第一個符合條件的待送事件送出
    send(type: Event['type'], to: To, orderId?: string) {
      const i = queue.findIndex((d) => d.e.type === type && d.to === to && (!orderId || d.e.orderId === orderId));
      assert.ok(i >= 0, `沒有待送的 ${type} → ${to}`);
      deliver(i);
    },
    // 重送一個已經送過的事件
    resend(type: Event['type'], to: To, orderId?: string) {
      const e = log.find((x) => x.type === type && (!orderId || x.orderId === orderId));
      assert.ok(e, `沒有發出過 ${type}`);
      publish(svc[to].handle(e));
    },
    drain() { let n = 0; while (queue.length) { deliver(0); assert.ok(++n < 10000, '事件無法收斂'); } },
    status: (id: string) => svc.order.getOrder(id)?.status,
    stock: (sku: string) => svc.inv.getAvailable(sku),
    bal: (c: string) => svc.pay.getBalance(c),
    count: (type: Event['type'], orderId: string) => log.filter((e) => e.type === type && e.orderId === orderId).length,
  };
  return w;
}

const std = () => world({ A: 10, B: 2 }, { c1: 1000, c2: 50 });
const reason = (r: any, code: string) => { assert.equal(r.ok, false, `expected rejection, got ${JSON.stringify(r)}`); assert.equal(r.reason, code); };

// 亂數排程：隨機挑下一個要送的事件，並以一定機率重送
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
type Outcome = { w: ReturnType<typeof world>; orders: Array<{ id: string; c: string; sku: string; qty: number; amount: number }>; stock0: Record<string, number>; bal0: Record<string, number>; minSeen: number };
function chaos(seed: number): Outcome {
  const rnd = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const stock0 = { A: int(0, 6), B: int(0, 6) };
  const bal0 = { c1: int(0, 300), c2: int(0, 300) };
  const w = world(stock0, bal0);
  const orders = Array.from({ length: int(2, 6) }, (_, k) => ({ id: `o${k}`, c: rnd() < 0.5 ? 'c1' : 'c2', sku: rnd() < 0.5 ? 'A' : 'B', qty: int(1, 3), amount: int(1, 150) }));
  const todo: Array<() => void> = orders.map((o) => () => { w.place(o.id, o.c, o.sku, o.qty, o.amount); });
  let minSeen = Infinity;
  const watch = () => { for (const s of ['A', 'B']) minSeen = Math.min(minSeen, w.stock(s)); for (const c of ['c1', 'c2']) minSeen = Math.min(minSeen, w.bal(c)); };
  let ticked = false;
  for (let guard = 0; guard < 5000; guard++) {
    const r = rnd();
    if (todo.length && r < 0.25) todo.shift()!();
    else if (r < 0.32 && orders.length) w.cancel(orders[int(0, orders.length - 1)].id);
    else if (!ticked && !todo.length && r < 0.36) { w.tick(at(20)); ticked = true; }
    else if (w.queue.length) {
      const i = int(0, w.queue.length - 1);
      const d = w.queue[i];
      if (rnd() < 0.3) w.queue.push({ ...d }); // 重送
      w.queue.splice(i, 1);
      w.publish(w.svc[d.to].handle(d.e));
    } else if (!todo.length) break;
    watch();
  }
  w.drain(); watch();
  return { w, orders, stock0, bal0, minSeen };
}
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
function everySeed(check: (o: Outcome, seed: number) => void) {
  for (const seed of SEEDS) {
    let o: Outcome;
    try { o = chaos(seed); } catch (err) { throw new Error(`seed ${seed}: ${(err as Error).message}`); }
    check(o, seed);
  }
}

const cases: Array<[string, string, string, () => void]> = [
  // 正常順序
  ['T4-01', 'base', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 3, 300); w.drain(); assert.equal(w.status('o1'), 'CONFIRMED'); assert.equal(w.stock('A'), 7); assert.equal(w.bal('c1'), 700); }],
  ['T4-02', 'base', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'B', 3, 300); w.drain(); assert.equal(w.status('o1'), 'REJECTED'); assert.equal(w.stock('B'), 2); assert.equal(w.bal('c1'), 1000); }],
  ['T4-03', 'T-a', 'behaviour', () => { const w = std(); w.place('o1', 'c2', 'A', 2, 80); w.drain(); assert.equal(w.status('o1'), 'FAILED'); assert.equal(w.stock('A'), 10); assert.equal(w.bal('c2'), 50); assert.equal(w.count('StockReleased', 'o1'), 1); }],
  ['T4-04', 'H8', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'B', 2, 100); w.drain(); assert.equal(w.status('o1'), 'CONFIRMED'); assert.equal(w.stock('B'), 0); }],
  ['T4-05', 'H8', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'B', 3, 100); w.drain(); assert.equal(w.stock('B'), 2); assert.equal(w.count('StockRejected', 'o1'), 1); }],
  ['T4-06', 'H8', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'ZZZ', 1, 100); w.drain(); assert.equal(w.status('o1'), 'REJECTED'); assert.equal(w.bal('c1'), 1000); }],
  ['T4-07', 'H9', 'behaviour', () => { const w = std(); w.place('o1', 'c2', 'A', 1, 50); w.drain(); assert.equal(w.status('o1'), 'CONFIRMED'); assert.equal(w.bal('c2'), 0); }],
  ['T4-08', 'H9', 'behaviour', () => { const w = std(); w.place('o1', 'nobody', 'A', 1, 1); w.drain(); assert.equal(w.status('o1'), 'FAILED'); assert.equal(w.stock('A'), 10); }],
  // 取消
  ['T4-09', 'H14', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); const r: any = w.cancel('o1'); assert.equal(r.ok, true); assert.deepEqual(r.events.map((e: Event) => e.type), ['OrderCancelled']); assert.deepEqual(w.svc.order.getOrder('o1'), { status: 'CANCELLED', cancelReason: 'CUSTOMER' }); }],
  ['T4-10', 'H4', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 3, 300); w.drain(); const r = w.cancel('o1'); assert.equal(r.ok, true); w.drain(); assert.equal(w.status('o1'), 'CANCELLED'); assert.equal(w.stock('A'), 10); assert.equal(w.bal('c1'), 1000); }],
  ['T4-11', 'H4', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 3, 300); w.drain(); w.cancel('o1'); w.drain(); const ref = w.log.find((e) => e.type === 'PaymentRefunded') as any; assert.equal(ref?.amount, 300); assert.equal(w.count('StockReleased', 'o1'), 1); }],
  ['T4-12', 'H6', 'reason', () => { const w = std(); w.place('o1', 'c1', 'B', 3, 100); w.drain(); reason(w.cancel('o1'), 'NOT_CANCELLABLE'); }],
  ['T4-13', 'H6', 'reason', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); w.drain(); w.cancel('o1'); w.drain(); reason(w.cancel('o1'), 'NOT_CANCELLABLE'); w.drain(); assert.equal(w.bal('c1'), 1000); assert.equal(w.count('PaymentRefunded', 'o1'), 1); }],
  ['T4-14', 'H6', 'reason', () => { const w = std(); reason(w.cancel('nope'), 'ORDER_NOT_FOUND'); }],
  ['T4-15', 'H6', 'reason', () => { const w = std(); w.place('o1', 'c2', 'A', 1, 80); w.drain(); reason(w.cancel('o1'), 'NOT_CANCELLABLE'); }],
  // 下單輸入
  ['T4-16', 'H12', 'reason', () => { const w = std(); reason(w.place('o1', 'c1', 'A', 0, 100), 'INVALID_INPUT'); reason(w.place('o2', 'c1', 'A', 1, 1.5), 'INVALID_INPUT'); assert.equal(w.log.length, 0); }],
  ['T4-17', 'H12', 'reason', () => { const w = std(); reason(w.place('o1', 'c1', '', 1, 100), 'INVALID_INPUT'); reason(w.place('o2', '', 'A', 1, 100), 'INVALID_INPUT'); assert.equal(w.svc.order.getOrder('o1'), undefined); }],
  ['T4-18', 'H12', 'reason', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); reason(w.place('o1', 'c1', 'A', 5, 500), 'DUPLICATE_ORDER'); w.drain(); assert.equal(w.stock('A'), 9); assert.equal(w.bal('c1'), 900); }],
  // 逾時
  ['T4-19', 'H11', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); w.tick(at(15)); assert.deepEqual(w.svc.order.getOrder('o1'), { status: 'CANCELLED', cancelReason: 'TIMEOUT' }); }],
  ['T4-20', 'H11', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); w.tick(at(14, 59)); assert.equal(w.status('o1'), 'PENDING'); }],
  ['T4-21', 'H11', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); w.drain(); w.tick(at(30)); assert.equal(w.status('o1'), 'CONFIRMED'); assert.equal(w.bal('c1'), 900); }],
  ['T4-22', 'H11', 'fault', () => { // 付款其實成功了，但 PaymentSucceeded 還沒到訂單服務就逾時
    const w = std(); w.place('o1', 'c1', 'A', 2, 200);
    w.send('OrderPlaced', 'inv'); w.send('OrderPlaced', 'pay'); w.send('StockReserved', 'pay');
    w.tick(at(16)); w.drain();
    assert.equal(w.status('o1'), 'CANCELLED'); assert.equal(w.bal('c1'), 1000); assert.equal(w.stock('A'), 10);
  }],
  // 重送
  ['T4-23', 'H1', 'fault', () => { const w = std(); w.place('o1', 'c1', 'A', 3, 300); w.send('OrderPlaced', 'inv'); w.resend('OrderPlaced', 'inv'); w.drain(); assert.equal(w.stock('A'), 7); assert.equal(w.count('StockReserved', 'o1'), 1); }],
  ['T4-24', 'H1', 'fault', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 300); w.drain(); w.resend('StockReserved', 'pay'); w.drain(); assert.equal(w.bal('c1'), 700); assert.equal(w.count('PaymentSucceeded', 'o1'), 1); }],
  ['T4-25', 'H1', 'fault', () => { const w = std(); w.place('o1', 'c1', 'A', 3, 300); w.drain(); w.cancel('o1'); w.drain(); w.resend('OrderCancelled', 'inv'); w.resend('OrderCancelled', 'pay'); w.drain(); assert.equal(w.stock('A'), 10); assert.equal(w.bal('c1'), 1000); }],
  ['T4-26', 'H1', 'fault', () => { const w = std(); w.place('o1', 'c2', 'A', 4, 80); w.drain(); w.resend('PaymentFailed', 'inv'); w.drain(); assert.equal(w.stock('A'), 10); assert.equal(w.count('StockReleased', 'o1'), 1); }],
  // 亂序
  ['T4-27', 'H2', 'fault', () => { const w = std(); w.place('o1', 'c1', 'A', 4, 100); w.cancel('o1'); w.send('OrderCancelled', 'inv'); w.drain(); assert.equal(w.stock('A'), 10); assert.equal(w.bal('c1'), 1000); }],
  ['T4-28', 'H3', 'fault', () => {
    const w = std(); w.place('o1', 'c1', 'A', 2, 300);
    w.send('OrderPlaced', 'inv'); w.send('OrderPlaced', 'pay'); w.cancel('o1');
    w.send('OrderCancelled', 'pay'); w.drain();
    assert.equal(w.bal('c1'), 1000); assert.equal(w.stock('A'), 10); assert.equal(w.count('PaymentSucceeded', 'o1'), 0);
  }],
  ['T4-29', 'H5', 'fault', () => { // 取消後才到的 PaymentSucceeded
    const w = std(); w.place('o1', 'c1', 'A', 1, 300);
    w.send('OrderPlaced', 'inv'); w.send('OrderPlaced', 'pay'); w.send('StockReserved', 'pay');
    w.cancel('o1'); w.drain();
    assert.equal(w.status('o1'), 'CANCELLED'); assert.equal(w.bal('c1'), 1000); assert.equal(w.stock('A'), 10);
  }],
  ['T4-30', 'H7', 'fault', () => { // 庫存不足被拒的訂單，之前已被取消
    const w = std(); w.place('o1', 'c1', 'B', 5, 100); w.cancel('o1'); w.drain();
    assert.equal(w.stock('B'), 2); assert.equal(w.count('StockReleased', 'o1'), 0);
  }],
  ['T4-31', 'H10', 'behaviour', () => { const w = std(); w.place('o1', 'c1', 'A', 1, 100); w.cancel('o1'); w.drain(); assert.equal(w.bal('c1'), 1000); assert.equal(w.count('PaymentRefunded', 'o1'), 0); }],
  ['T4-32', 'timing', 'fault', () => { // 付款服務先收到 StockReserved、後收到 OrderPlaced
    const w = std(); w.place('o1', 'c1', 'A', 1, 300);
    w.send('OrderPlaced', 'inv'); w.send('StockReserved', 'pay'); w.drain();
    assert.equal(w.status('o1'), 'CONFIRMED'); assert.equal(w.bal('c1'), 700); assert.equal(w.stock('A'), 9);
  }],
  // 隨機重送與亂序下的不變式（300 個種子）
  ['T4-33', 'property', 'property', () => everySeed(({ w, orders }, seed) => {
    for (const o of orders) assert.notEqual(w.status(o.id), 'PENDING', `seed ${seed}: ${o.id} 沒有收斂`);
  })],
  ['T4-34', 'property', 'property', () => everySeed(({ w, orders, stock0 }, seed) => {
    for (const sku of ['A', 'B']) {
      const used = orders.filter((o) => o.sku === sku && w.status(o.id) === 'CONFIRMED').reduce((s, o) => s + o.qty, 0);
      assert.equal(stock0[sku as 'A'] - w.stock(sku), used, `seed ${seed}: 庫存 ${sku} 不守恆`);
    }
  })],
  ['T4-35', 'property', 'property', () => everySeed(({ w, orders, bal0 }, seed) => {
    for (const c of ['c1', 'c2']) {
      const paid = orders.filter((o) => o.c === c && w.status(o.id) === 'CONFIRMED').reduce((s, o) => s + o.amount, 0);
      assert.equal(bal0[c as 'c1'] - w.bal(c), paid, `seed ${seed}: 顧客 ${c} 金額不守恆`);
    }
  })],
  ['T4-36', 'property', 'property', () => everySeed(({ w, orders, minSeen }, seed) => {
    assert.ok(minSeen >= 0, `seed ${seed}: 庫存或餘額曾為負`);
    for (const o of orders) for (const t of ['StockReserved', 'StockReleased', 'PaymentSucceeded', 'PaymentRefunded'] as const)
      assert.ok(w.count(t, o.id) <= 1, `seed ${seed}: ${o.id} 的 ${t} 發了 ${w.count(t, o.id)} 次`);
  })],
];

for (const [id, hole, kind, fn] of cases) test(`${id} ${hole} [${kind}]`, fn);
