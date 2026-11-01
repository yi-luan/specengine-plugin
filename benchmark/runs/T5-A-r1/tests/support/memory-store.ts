import type { Store } from '../../src/flash.js';

type Entry = { value: string | Set<string>; expiresAt?: number };

// 記憶體版 Store。每個操作開頭先讓出一次事件迴圈，讓多台伺服器的操作有機會交錯。
// px 以注入的時鐘計算：寫入後經過 px 毫秒（含）即失效。
export class MemoryStore implements Store {
  private readonly data = new Map<string, Entry>();

  constructor(private readonly nowMs: () => number) {}

  private async tick(): Promise<void> {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  private live(key: string): Entry | undefined {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && this.nowMs() >= entry.expiresAt) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  private str(key: string): string | null {
    const entry = this.live(key);
    if (!entry) return null;
    if (entry.value instanceof Set) throw new Error(`WRONGTYPE ${key}`);
    return entry.value;
  }

  private set_(key: string): Set<string> {
    const entry = this.live(key);
    if (!entry) return new Set();
    if (!(entry.value instanceof Set)) throw new Error(`WRONGTYPE ${key}`);
    return entry.value;
  }

  async get(key: string): Promise<string | null> {
    await this.tick();
    return this.str(key);
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    await this.tick();
    if (opts?.nx && this.live(key)) return false;
    const entry: Entry = { value };
    if (opts?.px !== undefined) entry.expiresAt = this.nowMs() + opts.px;
    this.data.set(key, entry);
    return true;
  }

  async del(key: string): Promise<boolean> {
    await this.tick();
    const existed = this.live(key) !== undefined;
    this.data.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    await this.tick();
    if (!Number.isInteger(n)) throw new Error('incrBy requires an integer');
    const current = this.str(key);
    const base = current === null ? 0 : Number(current);
    if (!Number.isInteger(base)) throw new Error(`value is not an integer: ${key}`);
    const next = base + n;
    const prev = this.live(key);
    this.data.set(key, { value: String(next), expiresAt: prev?.expiresAt });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    await this.tick();
    const set = this.set_(key);
    if (set.has(member)) return false;
    set.add(member);
    if (!this.live(key)) this.data.set(key, { value: set });
    return true;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    await this.tick();
    const set = this.set_(key);
    const removed = set.delete(member);
    if (set.size === 0) this.data.delete(key);
    return removed;
  }

  async sMembers(key: string): Promise<string[]> {
    await this.tick();
    return [...this.set_(key)];
  }

  /** 測試用：目前存活的 key 數量。 */
  size(): number {
    return [...this.data.keys()].filter((k) => this.live(k)).length;
  }
}

export type Fault =
  | { kind: 'crash'; before: { op: keyof Store; keyPrefix: string } }
  | { kind: 'stall'; before: { op: keyof Store; keyPrefix: string } };

// 包一層故障注入：模擬某台伺服器在對某個 key 的某個操作「之前」當機（之後所有操作都失敗）
// 或卡住（等到 resume() 才繼續）。只觸發一次。
export class FaultyStore implements Store {
  private fault: Fault | null = null;
  private crashed = false;
  private stall: { promise: Promise<void>; resolve: () => void } | null = null;

  constructor(private readonly inner: Store) {}

  arm(fault: Fault): void {
    this.fault = fault;
  }

  isStalled(): boolean {
    return this.stall !== null;
  }

  isCrashed(): boolean {
    return this.crashed;
  }

  resume(): void {
    this.stall?.resolve();
    this.stall = null;
  }

  private async gate(op: keyof Store, key: string): Promise<void> {
    if (this.crashed) throw new Error('server crashed');
    const fault = this.fault;
    if (fault && fault.before.op === op && key.startsWith(fault.before.keyPrefix)) {
      this.fault = null;
      if (fault.kind === 'crash') {
        this.crashed = true;
        throw new Error('server crashed');
      }
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      this.stall = { promise, resolve };
      await promise;
    }
  }

  async get(key: string) { await this.gate('get', key); return this.inner.get(key); }
  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }) { await this.gate('set', key); return this.inner.set(key, value, opts); }
  async del(key: string) { await this.gate('del', key); return this.inner.del(key); }
  async incrBy(key: string, n: number) { await this.gate('incrBy', key); return this.inner.incrBy(key, n); }
  async sAdd(key: string, member: string) { await this.gate('sAdd', key); return this.inner.sAdd(key, member); }
  async sRem(key: string, member: string) { await this.gate('sRem', key); return this.inner.sRem(key, member); }
  async sMembers(key: string) { await this.gate('sMembers', key); return this.inner.sMembers(key); }
}
