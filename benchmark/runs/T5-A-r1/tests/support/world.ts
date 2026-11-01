import { setWorldConstructor, setDefaultTimeout, World } from '@cucumber/cucumber';
import { createFlashSale, type FlashSale, type Result } from '../../src/flash.js';
import { FaultyStore, MemoryStore } from './memory-store.js';

export type GrabOutcome =
  | { kind: 'result'; result: Result<{ holdId: string; expiresAt: string }> }
  | { kind: 'crashed' };

export class FlashWorld extends World {
  clockMs = Date.parse('2026-06-15T12:00:00Z');
  readonly store = new MemoryStore(() => this.clockMs);
  readonly servers = new Map<string, { api: FlashSale; store: FaultyStore }>();
  readonly grabResults = new Map<string, GrabOutcome>();
  readonly pendingGrabs = new Map<string, Promise<void>>();
  lastResult: Result<unknown> | null = null;

  now(): string {
    return new Date(this.clockMs).toISOString();
  }

  server(name: string): { api: FlashSale; store: FaultyStore } {
    let s = this.servers.get(name);
    if (!s) {
      const store = new FaultyStore(this.store);
      s = { api: createFlashSale(store, () => this.now()), store };
      this.servers.set(name, s);
    }
    return s;
  }

  /** 還活著的伺服器（當機的不算）。 */
  liveServers(): FlashSale[] {
    const live = [...this.servers.values()].filter((s) => !s.store.isCrashed()).map((s) => s.api);
    return live.length > 0 ? live : [this.server('S1').api];
  }

  anyServer(): FlashSale {
    return this.liveServers()[0];
  }
}

setDefaultTimeout(10_000);
setWorldConstructor(FlashWorld);
