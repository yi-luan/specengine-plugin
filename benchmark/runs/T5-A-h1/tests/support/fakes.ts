import type { Store } from '../../src/flash.js';

/** 共用時鐘：所有伺服器與 Store 的 px 都以它為準。 */
export class FakeClock {
  private ms: number;

  constructor(iso: string) {
    this.ms = Date.parse(iso);
  }

  now = (): string => new Date(this.ms).toISOString().replace(/\.000Z$/, 'Z');

  nowMs(): number {
    return this.ms;
  }

  setIso(iso: string): void {
    this.ms = Date.parse(iso);
  }

  advanceMs(ms: number): void {
    this.ms += ms;
  }
}

type Entry = { value: string; expireAt: number | null };

/** 記憶體版 Store，px 過期以 FakeClock 計算（寫入後經過 px 毫秒即失效）。 */
export class MemoryStore implements Store {
  private strings = new Map<string, Entry>();
  private sets = new Map<string, Set<string>>();

  constructor(private readonly clock: FakeClock) {}

  private alive(key: string): Entry | undefined {
    const e = this.strings.get(key);
    if (!e) return undefined;
    if (e.expireAt !== null && this.clock.nowMs() >= e.expireAt) {
      this.strings.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    return this.alive(key)?.value ?? null;
  }

  async set(key: string, value: string, opts: { nx?: boolean; px?: number } = {}): Promise<boolean> {
    if (opts.nx && this.alive(key)) return false;
    this.strings.set(key, {
      value,
      expireAt: opts.px !== undefined ? this.clock.nowMs() + opts.px : null,
    });
    return true;
  }

  async del(key: string): Promise<boolean> {
    const existed = this.alive(key) !== undefined;
    this.strings.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    const e = this.alive(key);
    const next = Number(e?.value ?? 0) + n;
    this.strings.set(key, { value: String(next), expireAt: e?.expireAt ?? null });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    const set = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, set);
    const added = !set.has(member);
    set.add(member);
    return added;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    return this.sets.get(key)?.delete(member) ?? false;
  }

  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }
}

type Gate = {
  match: (key: string, value: string) => boolean;
  hit: boolean;
  onHit: () => void;
  gate: Promise<void>;
};

/**
 * 可模擬「伺服器處理到一半卡住」：對符合條件的第一次 set 先停住，
 * 等測試呼叫 release() 後才真的寫入（之後的伺服器操作照常進行）。
 */
export class PausableStore implements Store {
  private gates: Gate[] = [];

  constructor(private readonly inner: Store) {}

  arm(match: (key: string, value: string) => boolean): { hit: Promise<void>; release: () => void } {
    let onHit!: () => void;
    const hit = new Promise<void>((resolve) => (onHit = resolve));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.gates.push({ match, hit: false, onHit, gate });
    return { hit, release };
  }

  async get(key: string): Promise<string | null> {
    return this.inner.get(key);
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    const g = this.gates.find((x) => !x.hit && x.match(key, value));
    if (g) {
      g.hit = true;
      g.onHit();
      await g.gate;
    }
    return this.inner.set(key, value, opts);
  }

  async del(key: string): Promise<boolean> {
    return this.inner.del(key);
  }

  async incrBy(key: string, n: number): Promise<number> {
    return this.inner.incrBy(key, n);
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    return this.inner.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<boolean> {
    return this.inner.sRem(key, member);
  }

  async sMembers(key: string): Promise<string[]> {
    return this.inner.sMembers(key);
  }
}
