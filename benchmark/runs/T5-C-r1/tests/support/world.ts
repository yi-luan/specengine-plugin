// cucumber World：每個 Scenario 一份。持有測試時鐘、共用記憶體 Store、多台伺服器與保留別名。
// Binding Layer = direct：Step 直接透過本 World 取得 createFlashSale 建立的伺服器實例。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { FlashSale, Result, Store } from '../../src/flash-types.js';
import { createFlashSale } from '../../src/flash.js';
import { MemoryStore, StallingStore } from './memory-store.js';

export type GrabValue = { holdId: string; expiresAt: string };

export class FlashSaleWorld extends World {
  /** 測試時鐘：所有伺服器與 Store 的 now() 都讀這個值 */
  clock = '2026-06-15T12:00:00Z';
  readonly now = (): string => this.clock;
  /** 所有伺服器共用的唯一儲存 */
  readonly store = new MemoryStore(this.now);
  /** 伺服器實例 */
  private readonly servers: FlashSale[] = [];
  /** 保留別名 → 實際保留編號與到期時間 */
  readonly holds = new Map<string, GrabValue>();
  /** 最近一次操作的回傳 */
  lastResult: Result<unknown> | undefined;
  lastGrab: GrabValue | undefined;
  /** 併發搶購的所有回傳 */
  batchResults: Result<GrabValue>[] = [];
  /** 卡住中的伺服器 */
  stalled: { store: StallingStore; pending: Promise<Result<null>> } | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** 以共用 Store 建立一台新伺服器（可包不同的 Store 包裝，例如卡住模擬） */
  newServer(store: Store = this.store): FlashSale {
    return createFlashSale(store, this.now);
  }

  /** 取得第 i 台伺服器（不足時建立） */
  server(i = 0): FlashSale {
    while (this.servers.length <= i) this.servers.push(this.newServer());
    return this.servers[i];
  }

  /** 把別名轉成保留編號；未登記的別名視為字面保留編號 */
  holdId(alias: string): string {
    return this.holds.get(alias)?.holdId ?? alias;
  }

  /** 顧客於檔次的累計佔用件數（直接讀共用儲存的 customer_quotas） */
  async usedQty(saleId: string, customerId: string): Promise<number> {
    return Number((await this.store.get(`customer_quotas:${saleId}:${customerId}`)) ?? '0');
  }
}

setWorldConstructor(FlashSaleWorld);
