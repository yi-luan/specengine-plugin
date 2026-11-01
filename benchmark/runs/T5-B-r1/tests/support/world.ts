import { World, setWorldConstructor, setDefaultTimeout, type IWorldOptions } from '@cucumber/cucumber';
import { createFlashSale, type FlashSale, type Result, type Store } from '../../src/flash.js';
import { MemoryStore, interleaving, type Stalled } from './memory-store.js';

export type AnyResult = Result<unknown>;
export type HoldRef = { holdId: string; expiresAt: string };

export class FlashWorld extends World {
  clock = '2026-06-15T12:30:00Z';
  readonly now = (): string => this.clock;
  readonly base: Store = new MemoryStore(this.now);
  interleave = false;

  readonly servers = new Map<string, FlashSale>();
  readonly stalls = new Map<string, Stalled>();

  /** 最近一次單一操作的結果 */
  lastResult: AnyResult | undefined;
  /** 最近一次並行操作的所有結果 */
  batch: AnyResult[] = [];
  /** 並行搶購：每筆結果對應的顧客與件數 */
  batchMeta: { customerId: string; qty: number }[] = [];
  /** 以請求編號為別名記錄成功的保留 */
  readonly holds = new Map<string, HoldRef>();
  /** 背景操作 */
  background: Promise<AnyResult> | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  wrap(store: Store): Store {
    return this.interleave ? interleaving(store, store === this.base ? 7 : 11) : store;
  }

  makeServer(name: string, store: Store = this.wrap(this.base)): FlashSale {
    const s = createFlashSale(store, this.now);
    this.servers.set(name, s);
    return s;
  }

  server(name: string): FlashSale {
    const s = this.servers.get(name);
    if (!s) throw new Error(`未知的伺服器 ${name}`);
    return s;
  }

  /** 任一台「正常」伺服器（用於查詢） */
  anyServer(): FlashSale {
    const first = this.servers.values().next();
    if (first.done) throw new Error('尚未建立任何伺服器');
    return first.value;
  }

  hold(requestId: string): HoldRef {
    const h = this.holds.get(requestId);
    if (!h) throw new Error(`請求編號 ${requestId} 沒有成功的保留`);
    return h;
  }

  recordGrab(requestId: string, result: Result<HoldRef>): void {
    this.lastResult = result;
    if (result.ok) this.holds.set(requestId, result.value);
  }
}

setWorldConstructor(FlashWorld);
setDefaultTimeout(60_000);
