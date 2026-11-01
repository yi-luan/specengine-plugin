// 付款服務（PAYMENT）測試 World：每個 Scenario 一個實例，跨步驟狀態只放在這裡（無全域變數）。
// Binding Layer = direct（manifest 第 5 節）：Step 直接呼叫 createPaymentService 回傳的 Service，無 Driver 層。
import { setWorldConstructor, World as CucumberWorld, type IWorldOptions } from '@cucumber/cucumber';
import type { Event, PaymentService } from '../../src/events.js';
import { createPaymentService } from '../../src/payment.js';

export class PaymentWorld extends CucumberWorld {
  /** Given 步驟累積的初始餘額表；Service 於第一次需要時以此建立 */
  readonly initialBalances: Record<string, number> = {};
  /** 被測的付款服務實例（延遲建立） */
  private service: PaymentService | undefined;
  /** 最近一次 handle 的回傳值 */
  lastResult: Event[] = [];
  /** 最近一次 handle 回傳的事件 id 是否皆為此前未出現過、且彼此不重複的新值 */
  lastResultIdsFresh = true;
  /** 最近一次 getBalance 的回傳值 */
  lastBalance: number | undefined;
  /** 本 Scenario 內出現過的所有事件 id（餵入的與付款服務發出的） */
  readonly seenEventIds = new Set<string>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** 回傳（必要時先建立）付款服務 */
  getService(): PaymentService {
    if (!this.service) this.service = createPaymentService({ ...this.initialBalances });
    return this.service;
  }

  /** 把一個事件餵給付款服務，記錄回傳值與事件 id 的新鮮度 */
  feed(event: Event): Event[] {
    this.seenEventIds.add(event.id);
    const result = this.getService().handle(event);
    const ids = result.map((e) => e.id);
    this.lastResultIdsFresh = ids.every((id) => !this.seenEventIds.has(id)) && new Set(ids).size === ids.length;
    ids.forEach((id) => this.seenEventIds.add(id));
    this.lastResult = result;
    return result;
  }

  /** 依類型構造其他服務會送來的事件（OrderPlaced 另有專用句型） */
  buildEvent(type: string, orderId: string, eventId: string): Event {
    switch (type) {
      case 'StockReserved':
      case 'StockRejected':
      case 'StockReleased':
      case 'PaymentFailed':
      case 'OrderCancelled':
        return { id: eventId, type, orderId };
      case 'PaymentSucceeded':
      case 'PaymentRefunded':
        return { id: eventId, type, orderId, amount: 0 };
      default:
        throw new Error(`測試不支援以此句型構造事件類型 ${type}`);
    }
  }

  buildOrderPlaced(orderId: string, eventId: string, customerId: string, amount: number): Event {
    return { id: eventId, type: 'OrderPlaced', orderId, customerId, sku: 'sku-1', qty: 1, amount, at: '2026-06-15T12:00:00Z' };
  }
}

setWorldConstructor(PaymentWorld);
