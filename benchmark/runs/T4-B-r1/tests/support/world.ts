import { World, setWorldConstructor } from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';
import { createInventoryService, createOrderService, createPaymentService } from '../../src/shop.js';
import type { CommandResult, Event, InventoryService, OrderService, PaymentService } from '../../src/shop.js';

export type ServiceName = 'order' | 'inventory' | 'payment';

const SERVICE_NAMES: ServiceName[] = ['order', 'inventory', 'payment'];

/**
 * Per-scenario world. Services are created lazily on first use so that
 * `Given stock ... / Given customer ...` steps can seed them beforehand.
 * The world plays the role of the message broker: every event any service
 * returns is logged, and `broadcastUntilQuiet` delivers pending events to all
 * three services until nothing new is emitted.
 */
export class ShopWorld extends World {
  stock: Record<string, number> = {};
  balances: Record<string, number> = {};

  lastResult: CommandResult | undefined;
  lastEvents: Event[] = [];
  allEvents: Event[] = [];
  pending: Event[] = [];

  private orderSvc: OrderService | undefined;
  private inventorySvc: InventoryService | undefined;
  private paymentSvc: PaymentService | undefined;
  private syntheticCounter = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get order(): OrderService {
    if (!this.orderSvc) this.orderSvc = createOrderService();
    return this.orderSvc;
  }

  get inventory(): InventoryService {
    if (!this.inventorySvc) this.inventorySvc = createInventoryService({ ...this.stock });
    return this.inventorySvc;
  }

  get payment(): PaymentService {
    if (!this.paymentSvc) this.paymentSvc = createPaymentService({ ...this.balances });
    return this.paymentSvc;
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

  /** Record events returned by a call as "last emitted" and queue them for broadcast. */
  record(events: Event[]): void {
    this.lastEvents = events;
    this.allEvents.push(...events);
    this.pending.push(...events);
  }

  runCommand(result: CommandResult): void {
    this.lastResult = result;
    this.record(result.ok ? result.events : []);
  }

  deliver(name: ServiceName, event: Event): Event[] {
    const out = this.service(name).handle(event);
    this.record(out);
    return out;
  }

  /** Deliver every pending event to all three services until the queue drains. */
  broadcastUntilQuiet(): void {
    const emitted: Event[] = [];
    let guard = 0;
    while (this.pending.length > 0) {
      if (++guard > 10000) throw new Error('broadcast did not settle (possible event loop)');
      const event = this.pending.shift() as Event;
      for (const name of SERVICE_NAMES) {
        const out = this.service(name).handle(event);
        this.allEvents.push(...out);
        this.pending.push(...out);
        emitted.push(...out);
      }
    }
    this.lastEvents = emitted;
  }

  /** Most recently emitted event of the given type for the order. */
  findEvent(type: Event['type'], orderId: string): Event {
    for (let i = this.allEvents.length - 1; i >= 0; i--) {
      const e = this.allEvents[i];
      if (e.type === type && e.orderId === orderId) return e;
    }
    throw new Error(`no ${type} event for ${orderId} has been emitted`);
  }

  countEvents(type: Event['type'], orderId: string): number {
    return this.allEvents.filter((e) => e.type === type && e.orderId === orderId).length;
  }

  /** Same payload as an already emitted event, but a brand-new id. */
  freshCopy(type: Event['type'], orderId: string): Event {
    const original = this.findEvent(type, orderId);
    return { ...original, id: `fresh-${++this.syntheticCounter}` };
  }

  /** An event that no service emitted (used to probe terminal states). */
  synthetic(type: Event['type'], orderId: string, amount = 0): Event {
    const id = `synthetic-${++this.syntheticCounter}`;
    switch (type) {
      case 'OrderPlaced':
        throw new Error('synthetic OrderPlaced is not supported; place an order instead');
      case 'PaymentSucceeded':
      case 'PaymentRefunded':
        return { id, type, orderId, amount };
      default:
        return { id, type, orderId };
    }
  }
}

setWorldConstructor(ShopWorld);
