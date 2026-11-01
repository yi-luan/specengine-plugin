// 每個 Scenario 獨立的 World（跨步驟狀態只放在這裡，不用全域變數）。
// 初始餘額在第一次需要服務時才建立服務（Given 階段只記錄餘額）。
import { setWorldConstructor } from '@cucumber/cucumber';
import type { Event, PaymentService } from '../../src/events.js';
import { createPaymentService } from '../../src/payment.js';

export class PaymentWorld {
  service?: PaymentService;
  balances: Record<string, number> = {};
  emitted: Event[] = []; // 只記錄 When 階段（動作）發出的事件，不含前置條件

  ensureService(): PaymentService {
    if (!this.service) this.service = createPaymentService({ ...this.balances });
    return this.service;
  }

  // 前置條件：送入事件但不記錄輸出
  setup(event: Event): void {
    this.ensureService().handle(event);
  }

  // 動作：送入事件並記錄輸出
  act(event: Event): void {
    this.emitted.push(...this.ensureService().handle(event));
  }

  balanceOf(customerId: string): number {
    return this.ensureService().getBalance(customerId);
  }
}

setWorldConstructor(PaymentWorld);
