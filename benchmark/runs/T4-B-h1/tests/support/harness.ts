import { After, setWorldConstructor } from '@cucumber/cucumber';
import {
  createOrderService,
  createInventoryService,
  createPaymentService,
  type CommandResult,
  type Event,
  type InventoryService,
  type OrderService,
  type PaymentService,
  type PlaceOrderInput,
} from '../../src/shop.js';

// 測試用的事件傳遞環境：每個事件廣播給三個服務，服務回傳的新事件進入佇列。
// autoSettle = false 時，佇列不自動處理，讓情境可以指定亂序或重複送達。
export class ShopWorld {
  stockInit: Record<string, number> = {};
  balanceInit: Record<string, number> = {};
  now = '2026-06-15T12:00:00Z';
  autoSettle = true;
  order!: OrderService;
  inventory!: InventoryService;
  payment!: PaymentService;
  emitted: Event[] = [];
  lastResult: CommandResult | undefined;
  private queue: Event[] = [];
  private started = false;
  private extSeq = 0;

  ensure(): this {
    if (!this.started) {
      this.order = createOrderService();
      this.inventory = createInventoryService({ ...this.stockInit });
      this.payment = createPaymentService({ ...this.balanceInit });
      this.started = true;
    }
    return this;
  }

  private enqueue(events: Event[]): void {
    for (const e of events) {
      this.emitted.push(e);
      this.queue.push(e);
    }
  }

  private route(e: Event): void {
    this.enqueue(this.order.handle(e));
    this.enqueue(this.inventory.handle(e));
    this.enqueue(this.payment.handle(e));
  }

  private afterEnqueue(): void {
    if (this.autoSettle) this.settle();
  }

  settle(): void {
    let guard = 0;
    while (this.queue.length > 0) {
      if (++guard > 1000) throw new Error('event loop did not settle');
      const e = this.queue.shift()!;
      this.route(e);
    }
    this.assertNonNegative();
  }

  // SC-003：庫存與餘額在任何時點都不得為負數。
  assertNonNegative(): void {
    if (!this.started) return;
    for (const sku of Object.keys(this.stockInit)) {
      const v = this.inventory.getAvailable(sku);
      if (v < 0) throw new Error(`inventory went negative: ${sku}=${v}`);
    }
    for (const customerId of Object.keys(this.balanceInit)) {
      const v = this.payment.getBalance(customerId);
      if (v < 0) throw new Error(`balance went negative: ${customerId}=${v}`);
    }
  }

  placeOrder(input: PlaceOrderInput): CommandResult {
    this.ensure();
    const r = this.order.placeOrder(input);
    this.lastResult = r;
    if (r.ok) this.enqueue(r.events);
    this.afterEnqueue();
    return r;
  }

  cancel(orderId: string): CommandResult {
    this.ensure();
    const r = this.order.cancelOrder(orderId, this.now);
    this.lastResult = r;
    if (r.ok) this.enqueue(r.events);
    this.afterEnqueue();
    return r;
  }

  tick(now: string): void {
    this.ensure();
    this.now = now;
    this.enqueue(this.order.tick(now));
    this.afterEnqueue();
  }

  deliverOne(type: Event['type']): void {
    const idx = this.queue.findIndex((e) => e.type === type);
    if (idx < 0) throw new Error(`no queued event of type ${type}`);
    const [e] = this.queue.splice(idx, 1);
    this.route(e!);
    this.afterEnqueue();
  }

  redeliver(type: Event['type']): void {
    const found = [...this.emitted].reverse().find((e) => e.type === type);
    if (!found) throw new Error(`no emitted event of type ${type} to redeliver`);
    this.route(found);
    this.afterEnqueue();
  }

  inject(type: 'PaymentSucceeded' | 'PaymentFailed', orderId: string, amount: number): void {
    this.ensure();
    const id = `ext-${++this.extSeq}`;
    const e: Event = type === 'PaymentSucceeded'
      ? { id, type, orderId, amount }
      : { id, type, orderId };
    this.route(e);
    this.afterEnqueue();
  }
}

setWorldConstructor(ShopWorld);

// 每個情境結束時再檢查一次不變式（SC-003），涵蓋所有情境而非只有手動 settle 的情境。
After(function (this: ShopWorld) {
  this.assertNonNegative();
});
