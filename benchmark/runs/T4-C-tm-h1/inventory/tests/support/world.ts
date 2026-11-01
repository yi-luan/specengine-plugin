// 庫存服務的 World：跨步驟狀態放在這裡，不使用全域變數。
import { setWorldConstructor } from '@cucumber/cucumber';
import type { Event, InventoryService } from '../../src/events.js';
import { createInventoryService } from '../../src/inventory.js';

export class InventoryWorld {
  stock: Record<string, number> = {};
  lastEvent?: Event;
  events: Event[] = [];
  private service?: InventoryService;
  private seq = 0;

  hasService(): boolean {
    return this.service !== undefined;
  }

  svc(): InventoryService {
    if (!this.service) this.service = createInventoryService(this.stock);
    return this.service;
  }

  nextEventId(): string {
    this.seq += 1;
    return `T-${this.seq}`;
  }

  send(event: Event): void {
    this.lastEvent = event;
    this.events = this.svc().handle(event);
  }
}

setWorldConstructor(InventoryWorld);
