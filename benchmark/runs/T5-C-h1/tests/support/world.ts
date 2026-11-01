// 每個 Scenario 一個 World：持有記憶體 Store、測試時鐘與伺服器實例，跨步驟狀態只放這裡（不用模組層級變數）。
import { setWorldConstructor, World } from '@cucumber/cucumber';
import { createFlashSale, type FlashSale, type Result } from '../../src/flash.js';
import { FaultyStore } from './memory-store.js';

export class FlashWorld extends World {
  nowIso = '2026-06-15T00:00:00Z';
  readonly store = new FaultyStore(() => this.nowIso);
  readonly svc: FlashSale;
  svc2: FlashSale | null = null;      // 第二台伺服器（同一個 Store）
  saleId = '';
  lastResult: Result<unknown> | null = null;
  lastHoldId = '';
  lastExpiresAt = '';
  lastRemaining: number | null = null;
  holds = new Map<string, { holdId: string; expiresAt: string }>(); // 測試用保留名稱 → 實際保留編號

  constructor(options: ConstructorParameters<typeof World>[0]) {
    super(options);
    this.svc = createFlashSale(this.store, () => this.nowIso);
  }

  holdIdOf(name: string): string {
    return this.holds.get(name)?.holdId ?? name;
  }

  otherServer(): FlashSale {
    if (!this.svc2) this.svc2 = createFlashSale(this.store, () => this.nowIso);
    return this.svc2;
  }
}

setWorldConstructor(FlashWorld);
