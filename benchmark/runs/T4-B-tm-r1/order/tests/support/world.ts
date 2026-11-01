import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { CommandResult, Event, OrderService } from '../../src/events.js';
import { createOrderService } from '../../src/order.js';

/** 訂單服務測試用 World：持有被測服務與最近一次操作的結果。 */
export class OrderWorld extends World {
  service: OrderService;
  /** 最近一次 placeOrder / cancelOrder 的結果。 */
  lastResult: CommandResult | undefined;
  /** 最近一次操作（命令、handle、tick）回傳的事件。 */
  lastEvents: Event[] = [];
  /** 最近一次餵給 handle 的事件（用於「同一事件再送一次」）。 */
  lastReceived: Event | undefined;
  /** 本情境中訂單服務發出的所有事件。 */
  allEmitted: Event[] = [];
  private testEventSeq = 0;

  constructor(options: IWorldOptions) {
    super(options);
    this.service = createOrderService();
  }

  /** 構造其他服務「會送來」的事件；id 用 test- 前綴以免與被測服務混淆。 */
  makeEvent(type: Event['type'], orderId: string, extra: Record<string, unknown> = {}): Event {
    const id = `test-${++this.testEventSeq}`;
    switch (type) {
      case 'OrderPlaced':
        return { id, type, orderId, customerId: 'C1', sku: 'A', qty: 1, amount: 1, at: '2026-06-15T12:00:00Z', ...extra } as Event;
      case 'PaymentSucceeded':
      case 'PaymentRefunded':
        return { id, type, orderId, amount: 100, ...extra } as Event;
      default:
        return { id, type, orderId, ...extra } as Event;
    }
  }

  record(events: Event[]): void {
    this.lastEvents = events;
    this.allEmitted.push(...events);
  }
}

setWorldConstructor(OrderWorld);
