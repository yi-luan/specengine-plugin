// 記憶體版 Store，供測試使用（規格要求：不碰真正的資料庫或網路）。
// FaultyStore 可在第 N 次寫入前拋出例外，模擬伺服器在處理到一半時當機（寫入未套用）。
import type { Store } from '../../src/flash.js';

export class MemoryStore implements Store {
  private kv = new Map<string, { value: string; expiresAt?: number }>();
  private sets = new Map<string, Set<string>>();

  constructor(private now: () => string) {}

  private nowMs(): number {
    return Date.parse(this.now());
  }

  private alive(key: string): { value: string; expiresAt?: number } | undefined {
    const e = this.kv.get(key);
    if (e && e.expiresAt !== undefined && this.nowMs() >= e.expiresAt) {
      this.kv.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    return this.alive(key)?.value ?? null;
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    if (opts?.nx && this.alive(key)) return false;
    const expiresAt = opts?.px !== undefined ? this.nowMs() + opts.px : undefined;
    this.kv.set(key, { value, expiresAt });
    return true;
  }

  async del(key: string): Promise<boolean> {
    const existed = this.alive(key) !== undefined;
    this.kv.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    const cur = Number(this.alive(key)?.value ?? '0');
    const next = cur + n;
    this.kv.set(key, { value: String(next) });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    const s = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, s);
    if (s.has(member)) return false;
    s.add(member);
    return true;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    return this.sets.get(key)?.delete(member) ?? false;
  }

  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }
}

export class FaultyStore implements Store {
  private writes = 0;
  private crashAt: number | null = null;
  readonly inner: MemoryStore;

  constructor(now: () => string) {
    this.inner = new MemoryStore(now);
  }

  // 從現在起，第 n 次寫入呼叫會在套用前拋出例外（只觸發一次）
  armCrashOnWrite(n: number): void {
    this.writes = 0;
    this.crashAt = n;
  }

  disarm(): void {
    this.crashAt = null;
  }

  private beforeWrite(): void {
    if (this.crashAt === null) return;
    this.writes += 1;
    if (this.writes === this.crashAt) {
      this.crashAt = null;
      throw new Error('simulated crash: server stopped before applying write');
    }
  }

  get(key: string) { return this.inner.get(key); }
  set(key: string, value: string, opts?: { nx?: boolean; px?: number }) { this.beforeWrite(); return this.inner.set(key, value, opts); }
  del(key: string) { this.beforeWrite(); return this.inner.del(key); }
  incrBy(key: string, n: number) { this.beforeWrite(); return this.inner.incrBy(key, n); }
  sAdd(key: string, member: string) { this.beforeWrite(); return this.inner.sAdd(key, member); }
  sRem(key: string, member: string) { this.beforeWrite(); return this.inner.sRem(key, member); }
  sMembers(key: string) { return this.inner.sMembers(key); }
}
