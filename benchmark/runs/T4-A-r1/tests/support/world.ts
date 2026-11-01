import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import {
  createInventoryService,
  createOrderService,
  createPaymentService,
  type CommandResult,
  type Event,
  type InventoryService,
  type OrderService,
  type PaymentService,
} from '../../src/shop.js';

export type ServiceName = 'order' | 'inventory' | 'payment';

/**
 * 測試用的記憶體事件匯流排：
 * - `pending` 是尚未廣播的事件（FIFO）
 * - `emitted` 是系統內曾經發出的所有事件（含已廣播）
 * 三個服務只透過這裡交換事件，符合「不共用資料、只靠事件溝通」。
 */
export class ShopWorld extends World {
  order: OrderService = createOrderService();
  inventory: InventoryService = createInventoryService({});
  payment: PaymentService = createPaymentService({});

  pending: Event[] = [];
  emitted: Event[] = [];
  lastResult: CommandResult | undefined;
  lastHandleOutput: Event[] = [];

  constructor(options: IWorldOptions) {
    super(options);
  }

  publish(events: Event[]): void {
    this.pending.push(...events);
    this.emitted.push(...events);
  }

  service(name: ServiceName): { handle(event: Event): Event[] } {
    switch (name) {
      case 'order':
        return this.order;
      case 'inventory':
        return this.inventory;
      case 'payment':
        return this.payment;
    }
  }

  /** 把一個事件送給單一服務，產生的事件進入匯流排。 */
  deliverTo(name: ServiceName, event: Event): Event[] {
    const out = this.service(name).handle(event);
    this.publish(out);
    return out;
  }

  /** 把一個事件廣播給三個服務各一次（或 `times` 次，用來模擬重複送達）。 */
  broadcast(event: Event, times = 1): void {
    for (let i = 0; i < times; i += 1) {
      this.deliverTo('order', event);
      this.deliverTo('inventory', event);
      this.deliverTo('payment', event);
    }
  }

  /** 依 FIFO 把匯流排清空；每個事件廣播 `times` 次。 */
  drain(times = 1): void {
    let guard = 0;
    while (this.pending.length > 0) {
      guard += 1;
      if (guard > 10_000) throw new Error('event bus did not settle');
      const event = this.pending.shift() as Event;
      this.broadcast(event, times);
    }
  }

  /** 依 LIFO（每一輪先把目前佇列反轉）把匯流排清空，用來模擬亂序送達。 */
  drainReversed(): void {
    let guard = 0;
    while (this.pending.length > 0) {
      guard += 1;
      if (guard > 10_000) throw new Error('event bus did not settle');
      const batch = this.pending.splice(0).reverse();
      for (const event of batch) this.broadcast(event);
    }
  }

  findEvent(type: Event['type'], orderId: string): Event {
    const found = this.emitted.find((e) => e.type === type && e.orderId === orderId);
    if (!found) throw new Error(`no ${type} event for order ${orderId} in emitted log`);
    return found;
  }

  countEvents(type: Event['type'], orderId: string): number {
    return this.emitted.filter((e) => e.type === type && e.orderId === orderId).length;
  }
}

setWorldConstructor(ShopWorld);
