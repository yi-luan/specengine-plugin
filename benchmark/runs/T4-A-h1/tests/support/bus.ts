import type { Event, InventoryService, OrderService, PaymentService } from '../../src/shop.js';

// 記憶體內的事件匯流排：把事件廣播給三個服務，並把服務回傳的事件排入佇列。
// 可模擬重複送達（同一事件送兩次）與亂序送達（反轉待送達佇列）。
export class Bus {
  queue: Event[] = [];
  emitted: Event[] = [];                            // 所有被服務發出過的事件（不含重送）

  constructor(
    private readonly order: OrderService,
    private readonly inventory: InventoryService,
    private readonly payment: PaymentService,
  ) {}

  publish(events: Event[]): void {
    for (const e of events) {
      this.emitted.push(e);
      this.queue.push(e);
    }
  }

  reverseQueue(): void {
    this.queue.reverse();
  }

  private deliver(event: Event): void {
    this.publish(this.order.handle(event));
    this.publish(this.inventory.handle(event));
    this.publish(this.payment.handle(event));
  }

  drain(options: { duplicate?: boolean } = {}): void {
    let steps = 0;
    while (this.queue.length > 0) {
      if (++steps > 10_000) throw new Error('event loop did not settle');
      const event = this.queue.shift() as Event;
      this.deliver(event);
      if (options.duplicate) this.deliver(event);   // at-least-once：同一事件再送一次
    }
  }
}
