import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import { createPaymentService } from '../../src/payment.js';
import type { Event, PaymentService } from '../../src/events.js';

// 每個情境一個世界物件：持有付款服務實例、初始餘額、以及測試注入的事件。
// 測試只扮演其他服務（訂單、庫存）送來的事件，不依賴它們的實作。
export class PaymentWorld extends World {
  balances: Record<string, number> = {};
  service: PaymentService | undefined;
  lastEmitted: Event[] = [];
  sent = new Map<string, Event>();
  private seq = 0;

  constructor(options: IWorldOptions) {
    super(options);
  }

  svc(): PaymentService {
    if (this.service === undefined) {
      this.service = createPaymentService(this.balances);
    }
    return this.service;
  }

  send(event: Event): Event[] {
    this.sent.set(`${event.type}:${event.orderId}`, event);
    this.lastEmitted = this.svc().handle(event);
    return this.lastEmitted;
  }

  resend(type: Event['type'], orderId: string): Event[] {
    const event = this.sent.get(`${type}:${orderId}`);
    if (event === undefined) {
      throw new Error(`尚未送出過 ${type} (${orderId})，無法重送`);
    }
    return this.send(event);
  }

  balanceOf(customerId: string): number {
    return this.svc().getBalance(customerId);
  }

  private nextId(): string {
    this.seq += 1;
    return `test-${this.seq}`;
  }

  orderPlaced(orderId: string, customerId: string, amount: number): Event {
    return { id: this.nextId(), type: 'OrderPlaced', orderId, customerId, sku: 'SKU-1', qty: 1, amount, at: '2026-06-15T12:00:00Z' };
  }

  stockReserved(orderId: string): Event {
    return { id: this.nextId(), type: 'StockReserved', orderId };
  }

  stockRejected(orderId: string): Event {
    return { id: this.nextId(), type: 'StockRejected', orderId };
  }

  orderCancelled(orderId: string): Event {
    return { id: this.nextId(), type: 'OrderCancelled', orderId };
  }
}

setWorldConstructor(PaymentWorld);
