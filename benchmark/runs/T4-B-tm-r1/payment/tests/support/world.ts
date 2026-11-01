// Custom cucumber World for the payment service scenarios.
// Holds the service under test, every inbound event we fabricated (so a scenario can
// redeliver the exact same event), the events returned by the last handle() call and
// every event the service has ever returned in this scenario.
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Event, PaymentService } from '../../src/events.js';

export class PaymentWorld extends World {
  service: PaymentService | undefined;
  inbound: Event[] = [];
  lastEvents: Event[] = [];
  allEvents: Event[] = [];
  private seq = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Unique id for a fabricated inbound event (unique within the scenario). */
  nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  /** Deliver an event to the service and record what came back. */
  send(event: Event): Event[] {
    if (!this.service) throw new Error('payment service has not been created in this scenario');
    const out = this.service.handle(event);
    this.inbound.push(event);
    this.lastEvents = out;
    this.allEvents.push(...out);
    return out;
  }

  /** The most recent inbound event of the given type for the given order, if any. */
  lastInbound(type: Event['type'], orderId: string): Event | undefined {
    for (let i = this.inbound.length - 1; i >= 0; i -= 1) {
      const e = this.inbound[i];
      if (e.type === type && e.orderId === orderId) return e;
    }
    return undefined;
  }
}

setWorldConstructor(PaymentWorld);
