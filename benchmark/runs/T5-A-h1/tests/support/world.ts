import { World, setWorldConstructor } from '@cucumber/cucumber';
import { createFlashSale, type FlashSale, type Result } from '../../src/flash.js';
import { FakeClock, MemoryStore, PausableStore } from './fakes.js';

export type GrabRecord = { customerId: string; qty: number; result: Result<{ holdId: string; expiresAt: string }> };

export class FlashWorld extends World {
  readonly clock = new FakeClock('2026-06-15T12:00:00Z');
  readonly store = new PausableStore(new MemoryStore(this.clock));
  readonly servers = new Map<string, FlashSale>();
  readonly grabs = new Map<string, GrabRecord>(); // requestId -> 結果（重送會覆蓋為同一結果）
  readonly pending = new Map<string, Promise<Result<unknown>>>(); // 卡住中的付款，key 為 requestId
  readonly releases = new Map<string, () => void>();             // 放行卡住中的付款
  saleId = '';
  lastResult: Result<unknown> | null = null;
  lastNumber: number | null = null;
  lastStatus: string | null = null;

  server(name: string): FlashSale {
    let s = this.servers.get(name);
    if (!s) {
      s = createFlashSale(this.store, this.clock.now);
      this.servers.set(name, s);
    }
    return s;
  }

  /** 依 requestId 找出該請求拿到的 holdId（沒有成功則回傳 'none'）。 */
  holdIdOf(requestId: string): string {
    const rec = this.grabs.get(requestId);
    if (!rec || !rec.result.ok) return 'none';
    return rec.result.value.holdId;
  }

  /** 成功取得的不重複保留（依 holdId 去重）。 */
  distinctHolds(): Map<string, GrabRecord> {
    const out = new Map<string, GrabRecord>();
    for (const rec of this.grabs.values()) {
      if (rec.result.ok) out.set(rec.result.value.holdId, rec);
    }
    return out;
  }
}

setWorldConstructor(FlashWorld);
