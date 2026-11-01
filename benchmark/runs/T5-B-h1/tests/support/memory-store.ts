import type { Store } from '../../src/flash.js';

/**
 * 記憶體版 Store，僅供測試使用。
 * 每個操作同步完成（單執行緒事件迴圈中原子），px 以注入的時鐘計算。
 */
export class MemoryStore implements Store {
  private readonly kv = new Map<string, { value: string; expiresAtMs?: number }>();
  private readonly sets = new Map<string, Set<string>>();

  constructor(private readonly nowMs: () => number) {}

  // 每個公開操作內部都是同步執行（沒有 await 夾在讀與寫之間），模擬 Redis 單鍵指令的原子性。

  private readNow(key: string): string | null {
    const entry = this.kv.get(key);
    if (!entry) return null;
    if (entry.expiresAtMs !== undefined && this.nowMs() >= entry.expiresAtMs) {
      this.kv.delete(key);
      return null;
    }
    return entry.value;
  }

  async get(key: string): Promise<string | null> {
    return this.readNow(key);
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    if (opts?.nx && this.readNow(key) !== null) return false;
    const expiresAtMs = opts?.px !== undefined ? this.nowMs() + opts.px : undefined;
    this.kv.set(key, { value, expiresAtMs });
    return true;
  }

  async del(key: string): Promise<boolean> {
    const existed = this.readNow(key) !== null;
    this.kv.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    const next = Number(this.readNow(key) ?? '0') + n;
    this.kv.set(key, { value: String(next) });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    const set = this.sets.get(key) ?? new Set<string>();
    this.sets.set(key, set);
    if (set.has(member)) return false;
    set.add(member);
    return true;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    return this.sets.get(key)?.delete(member) ?? false;
  }

  async sMembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  /** 測試用：目前所有鍵值的快照，用來驗證失敗操作不改變資料。 */
  snapshot(): string {
    const kvEntries = [...this.kv.entries()].map(([k, v]) => [k, v.value]);
    const setEntries = [...this.sets.entries()].map(([k, v]) => [k, [...v].sort()]);
    return JSON.stringify({ kv: kvEntries.sort(), sets: setEntries.sort() });
  }
}
