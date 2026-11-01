import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import { createFlashSale, type FlashSale, type Result, type Store } from '../../src/flash.js';
import { FakeClock } from './fake-clock.js';
import { MemoryStore } from './memory-store.js';

/** 以種子產生可重現的亂數序列（線性同餘）。 */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 讓出事件迴圈，使併發流程能在儲存操作之間交錯執行（模擬網路往返）。 */
const yieldOnce = (): Promise<void> => new Promise<void>((resolve) => setImmediate(resolve));

/**
 * 包住共用 Store 的測試替身，用來模擬伺服器行為：
 * - 每個儲存操作前讓出事件迴圈；若給了亂數來源，讓出 0–3 次，製造多種交錯順序（併發壓力）。
 * - failOnce：下一次寫入 key 含指定字串時丟出例外（模擬當機），只觸發一次。
 * - pauseBefore：下一次寫入 key 含指定字串時先暫停，直到 release() 被呼叫（模擬卡住）。
 */
export class ControlledStore implements Store {
  readonly failOnce: string[] = [];
  private pause: { substr: string; promise: Promise<void>; release: () => void } | null = null;

  constructor(
    private readonly inner: Store,
    private readonly rnd?: () => number,
  ) {}

  pauseBefore(substr: string): () => void {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.pause = { substr, promise, release };
    return () => release();
  }

  private async tick(): Promise<void> {
    const extra = this.rnd ? Math.floor(this.rnd() * 4) : 0;
    for (let i = 0; i <= extra; i++) await yieldOnce();
  }

  private async beforeWrite(key: string): Promise<void> {
    const idx = this.failOnce.findIndex((p) => key.includes(p));
    if (idx >= 0) {
      this.failOnce.splice(idx, 1);
      throw new Error(`injected crash before writing ${key}`);
    }
    if (this.pause && key.includes(this.pause.substr)) {
      const p = this.pause;
      this.pause = null;
      await p.promise;
    }
  }

  async get(key: string): Promise<string | null> {
    await this.tick();
    return this.inner.get(key);
  }

  async set(key: string, value: string, opts?: { nx?: boolean; px?: number }): Promise<boolean> {
    await this.tick();
    await this.beforeWrite(key);
    return this.inner.set(key, value, opts);
  }

  async del(key: string): Promise<boolean> {
    await this.tick();
    await this.beforeWrite(key);
    return this.inner.del(key);
  }

  async incrBy(key: string, n: number): Promise<number> {
    await this.tick();
    return this.inner.incrBy(key, n);
  }

  async sAdd(key: string, member: string): Promise<boolean> {
    await this.tick();
    return this.inner.sAdd(key, member);
  }

  async sRem(key: string, member: string): Promise<boolean> {
    await this.tick();
    return this.inner.sRem(key, member);
  }

  async sMembers(key: string): Promise<string[]> {
    await this.tick();
    return this.inner.sMembers(key);
  }
}

export const SERVER_COUNT = 3;
/** 併發情境重複執行的交錯次數（每次都是全新的儲存與伺服器）。 */
export const CONCURRENCY_TRIALS = 40;

export type SaleParams = { quantity: number; perCustomerLimit: number; from: string; to: string };

export class FlashWorld extends World {
  readonly clock = new FakeClock();
  base: MemoryStore;
  readonly stores: ControlledStore[] = [];
  readonly servers: FlashSale[] = [];

  lastResult: Result<unknown> | undefined;
  firstResult: Result<unknown> | undefined;
  lastGrab: { server: number; customerId: string; qty: number; saleId: string; requestId: string } | undefined;
  stalled: Promise<Result<unknown>> | undefined;
  stalledRelease: (() => void) | undefined;
  stalledResult: Result<unknown> | undefined;
  currentSale = 'S1';
  saleParams = new Map<string, SaleParams>();
  /** 併發情境：每次交錯執行的所有結果（用來斷言每一次都正確） */
  trialResults: Result<unknown>[][] = [];
  concurrentResults: Result<unknown>[] = [];
  successes: { saleId: string; customerId: string; qty: number }[] = [];
  holdByName = new Map<string, { holdId: string; expiresAt: string }>();
  snapshotText: string | undefined;
  lastError: unknown;

  constructor(options: IWorldOptions) {
    super(options);
    this.base = new MemoryStore(this.clock.nowMs);
    this.buildServers();
  }

  /** 以新的共用儲存與伺服器取代目前的（不帶亂數，供一般情境使用）。 */
  private buildServers(seed?: number): void {
    const rnd = seed === undefined ? undefined : seeded(seed);
    this.stores.length = 0;
    this.servers.length = 0;
    for (let i = 0; i < SERVER_COUNT; i++) {
      const store = new ControlledStore(this.base, rnd);
      this.stores.push(store);
      this.servers.push(createFlashSale(store, this.clock.now));
    }
  }

  /** 併發情境：每次交錯都從全新的儲存開始，並重新開檔。 */
  async resetForTrial(saleId: string, seed: number): Promise<void> {
    this.base = new MemoryStore(this.clock.nowMs);
    this.buildServers(seed);
    const p = this.saleParams.get(saleId);
    if (!p) throw new Error(`sale ${saleId} was not set up`);
    const opened = await this.servers[0]!.openSale({
      saleId,
      quantity: p.quantity,
      perCustomerLimit: p.perCustomerLimit,
      startsAt: p.from,
      endsAt: p.to,
    });
    if (!opened.ok) throw new Error(`trial setup failed: ${JSON.stringify(opened)}`);
    this.successes = [];
  }

  server(i: number): FlashSale {
    const s = this.servers[i];
    if (!s) throw new Error(`no server ${i}`);
    return s;
  }
}

setWorldConstructor(FlashWorld);
