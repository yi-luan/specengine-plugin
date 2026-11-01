import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Event, InventoryService } from '../../src/events.js';

/** 模擬同事服務送來的事件：由測試自行指定 id，必須與庫存服務產生的 id 不衝突。 */
export class InventoryWorld extends World {
  service?: InventoryService;
  initialStock: Record<string, number> = {};
  /** 最近一次 handle 的回傳值。 */
  lastEmitted: Event[] = [];
  /** 本情境中庫存服務發出過的所有事件。 */
  allEmitted: Event[] = [];
  private seq = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }

  nextExternalId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  dispatch(event: Event): Event[] {
    if (!this.service) throw new Error('庫存服務尚未建立');
    this.lastEmitted = this.service.handle(event);
    this.allEmitted.push(...this.lastEmitted);
    return this.lastEmitted;
  }

  orderPlaced(orderId: string, sku: string, qty: number, extra: Partial<{ customerId: string; amount: number; at: string }> = {}): Event {
    return {
      id: this.nextExternalId('ord'),
      type: 'OrderPlaced',
      orderId,
      customerId: extra.customerId ?? 'c1',
      sku,
      qty,
      amount: extra.amount ?? 100,
      at: extra.at ?? '2026-06-15T12:00:00Z',
    };
  }
}

setWorldConstructor(InventoryWorld);
