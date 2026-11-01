import type { Store } from '../../src/flash.js';

type Entry = { v: string; exp?: number };

/**
 * 記憶體版 Store。每個操作本身是原子的（單執行緒、無 await 在操作內部）。
 * `px` 以注入的 now() 計算：寫入後經過 px 毫秒（含）即失效。
 */
export class MemoryStore implements Store {
  private kv = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();

  constructor(private readonly now: () => string) {}

  private nowMs(): number {
    return Date.parse(this.now());
  }

  private live(key: string): Entry | null {
    const e = this.kv.get(key);
    if (!e) return null;
    if (e.exp !== undefined && this.nowMs() >= e.exp) {
      this.kv.delete(key);
      return null;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    const e = this.live(key);
    return e ? e.v : null;
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    if (opts?.nx && this.live(key) !== null) return false;
    const entry: Entry = { v: value };
    if (opts?.px !== undefined) entry.exp = this.nowMs() + opts.px;
    this.kv.set(key, entry);
    return true;
  }

  async del(key: string): Promise<boolean> {
    const existed = this.live(key) !== null;
    this.kv.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    const e = this.live(key);
    const cur = e ? Number.parseInt(e.v, 10) : 0;
    const next = cur + n;
    this.kv.set(key, { v: String(next), exp: e?.exp });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    let s = this.sets.get(key);
    if (!s) {
      s = new Set<string>();
      this.sets.set(key, s);
    }
    if (s.has(member)) return false;
    s.add(member);
    return true;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    const s = this.sets.get(key);
    if (!s) return false;
    return s.delete(member);
  }

  async sMembers(key: string): Promise<string[]> {
    const s = this.sets.get(key);
    return s ? [...s] : [];
  }
}

type Hook = () => Promise<void> | void;

/** 把每一個 Store 操作前都插入一個 hook（讓出、當機、卡住）。 */
function wrapStore(base: Store, before: Hook): Store {
  return {
    async get(key) {
      await before();
      return base.get(key);
    },
    async set(key, value, opts) {
      await before();
      return base.set(key, value, opts);
    },
    async del(key) {
      await before();
      return base.del(key);
    },
    async incrBy(key, n) {
      await before();
      return base.incrBy(key, n);
    },
    async sAdd(key, member) {
      await before();
      return base.sAdd(key, member);
    },
    async sRem(key, member) {
      await before();
      return base.sRem(key, member);
    },
    async sMembers(key) {
      await before();
      return base.sMembers(key);
    },
  };
}

const yieldTurn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** 每次操作前讓出事件迴圈 0～2 次（決定性的偽亂數），讓多台伺服器的操作充分交錯。 */
export function interleaving(base: Store, seed = 1): Store {
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  return wrapStore(base, async () => {
    const times = next() % 3;
    for (let i = 0; i < times; i++) await yieldTurn();
    await yieldTurn();
  });
}

/** 第 k 次操作（1-based）丟出 CRASH，且之後所有操作都丟出（伺服器不再回來）。 */
export function crashAfter(base: Store, k: number): Store {
  let count = 0;
  return wrapStore(base, () => {
    count++;
    if (count >= k) throw new Error('CRASH');
  });
}

export type Stalled = { store: Store; stalled: Promise<void>; release: () => void };

/** 第 k 次操作（1-based）在執行前卡住，直到測試呼叫 release()；其餘操作正常。 */
export function stallAt(base: Store, k: number): Stalled {
  let count = 0;
  let release: () => void = () => undefined;
  let markStalled: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const stalled = new Promise<void>((resolve) => {
    markStalled = resolve;
  });
  const store = wrapStore(base, async () => {
    count++;
    if (count === k) {
      markStalled();
      await gate;
    }
  });
  return { store, stalled, release };
}
