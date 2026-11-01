// 記憶體版 Store（測試替身）。每個操作本身原子，但操作之間會讓出事件迴圈，
// 讓多台伺服器（多個 createFlashSale 實例）在測試中真的交錯執行。
// px 以呼叫端提供的 now() 時鐘計算：寫入後經過 px 毫秒（含）即失效。
import type { Store } from '../../src/flash-types.js';

type Entry = { value: string; expiresAtMs?: number };

const yieldTick = () => new Promise<void>((resolve) => setImmediate(resolve));

export class MemoryStore implements Store {
  private readonly strings = new Map<string, Entry>();
  private readonly sets = new Map<string, Set<string>>();

  constructor(private readonly now: () => string) {}

  private nowMs(): number {
    return Date.parse(this.now());
  }

  private alive(key: string): Entry | undefined {
    const e = this.strings.get(key);
    if (!e) return undefined;
    if (e.expiresAtMs !== undefined && e.expiresAtMs <= this.nowMs()) {
      this.strings.delete(key);
      return undefined;
    }
    return e;
  }

  async get(key: string): Promise<string | null> {
    await yieldTick();
    return this.alive(key)?.value ?? null;
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    await yieldTick();
    if (opts?.nx && this.alive(key)) return false;
    const entry: Entry = { value };
    if (opts?.px !== undefined) entry.expiresAtMs = this.nowMs() + opts.px;
    this.strings.set(key, entry);
    return true;
  }

  async del(key: string): Promise<boolean> {
    await yieldTick();
    const existed = this.alive(key) !== undefined || this.sets.has(key);
    this.strings.delete(key);
    this.sets.delete(key);
    return existed;
  }

  async incrBy(key: string, n: number): Promise<number> {
    await yieldTick();
    const current = Number(this.alive(key)?.value ?? '0');
    const next = current + n;
    this.strings.set(key, { value: String(next) });
    return next;
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    await yieldTick();
    let s = this.sets.get(key);
    if (!s) {
      s = new Set();
      this.sets.set(key, s);
    }
    if (s.has(member)) return false;
    s.add(member);
    return true;
  }

  async sRem(key: string, member: string): Promise<boolean> {
    await yieldTick();
    return this.sets.get(key)?.delete(member) ?? false;
  }

  async sMembers(key: string): Promise<string[]> {
    await yieldTick();
    return [...(this.sets.get(key) ?? [])];
  }
}

/**
 * 卡住模擬：包住另一個 Store。armStall() 之後的第一個「寫入」操作（set／del／incrBy／sAdd／sRem）
 * 會停在那裡，直到 resume() 被呼叫；讀取不受影響。用來重現「伺服器處理到一半卡住、之後恢復接著做完」。
 */
export class StallingStore implements Store {
  private armed = false;
  private gate: Promise<void> = Promise.resolve();
  private release: () => void = () => {};

  constructor(private readonly inner: Store) {}

  armStall(): void {
    this.armed = true;
    this.gate = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  resume(): void {
    this.release();
  }

  private async beforeWrite(): Promise<void> {
    if (this.armed) {
      this.armed = false;
      await this.gate;
    }
  }

  get(key: string) { return this.inner.get(key); }
  sMembers(key: string) { return this.inner.sMembers(key); }
  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }) { await this.beforeWrite(); return this.inner.set(key, value, opts); }
  async del(key: string) { await this.beforeWrite(); return this.inner.del(key); }
  async incrBy(key: string, n: number) { await this.beforeWrite(); return this.inner.incrBy(key, n); }
  async sAdd(key: string, member: string) { await this.beforeWrite(); return this.inner.sAdd(key, member); }
  async sRem(key: string, member: string) { await this.beforeWrite(); return this.inner.sRem(key, member); }
}
