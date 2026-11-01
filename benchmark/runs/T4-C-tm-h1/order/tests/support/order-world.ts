// 訂單服務 Cucumber World：每個 Scenario 一個全新的 OrderService，跨步驟狀態只放在這裡。
import { BeforeStep, setWorldConstructor, World } from '@cucumber/cucumber';
import type { CommandResult, Event, OrderService } from '../../src/events.js';
import { createOrderService } from '../../src/order.js';

// 領域中文狀態 → 系統狀態代碼（對應 terms.md）
export const STATUS_CODE: Record<string, string> = {
  處理中: 'PENDING',
  已確認: 'CONFIRMED',
  庫存不足: 'REJECTED',
  付款失敗: 'FAILED',
  已取消: 'CANCELLED',
};

export const DEFAULT_PLACED_AT = '2026-06-15T12:00:00Z';
const DEFAULT_AMOUNT = 100;

export class OrderWorld extends World {
  service: OrderService = createOrderService();
  /** 目前步驟的 Gherkin 類型：Context（Given）、Action（When）、Outcome（Then），由 BeforeStep 設定 */
  phase = '';
  lastResult?: CommandResult;
  lastCancel?: CommandResult;
  lastOrderId = '';
  lastEvents: Event[] = [];
  private readonly eventsById = new Map<string, Event>();
  private seq = 0;

  nextEventId(): string {
    this.seq += 1;
    return `EVT-AUTO-${this.seq}`;
  }

  /** 建立事件並記錄，之後可用同一 id 重送 */
  makeEvent(type: string, orderId: string, id = this.nextEventId()): Event {
    const event = (type === 'PaymentSucceeded'
      ? { id, type, orderId, amount: DEFAULT_AMOUNT }
      : { id, type, orderId }) as Event;
    this.eventsById.set(id, event);
    return event;
  }

  getEvent(id: string): Event {
    const event = this.eventsById.get(id);
    if (!event) throw new Error(`找不到事件 ${id}`);
    return event;
  }

  /** 把訂單準備成指定狀態（Given 用）。 */
  ensureOrder(orderId: string, status: string, placedAt: string = DEFAULT_PLACED_AT): void {
    const placed = this.service.placeOrder({
      orderId,
      customerId: 'C-1',
      sku: 'SKU-A',
      qty: 1,
      amount: DEFAULT_AMOUNT,
      at: placedAt,
    });
    if (!placed.ok) throw new Error(`前置條件建立訂單失敗：${placed.reason}`);
    switch (STATUS_CODE[status]) {
      case 'PENDING':
        break;
      case 'CONFIRMED':
        this.service.handle(this.makeEvent('PaymentSucceeded', orderId));
        break;
      case 'REJECTED':
        this.service.handle(this.makeEvent('StockRejected', orderId));
        break;
      case 'FAILED':
        this.service.handle(this.makeEvent('PaymentFailed', orderId));
        break;
      case 'CANCELLED':
        this.service.cancelOrder(orderId, placedAt);
        break;
      default:
        throw new Error(`未知的訂單狀態：${status}`);
    }
  }
}

setWorldConstructor(OrderWorld);

BeforeStep(function (this: OrderWorld, { pickleStep }) {
  this.phase = (pickleStep as { type?: string }).type ?? '';
});
