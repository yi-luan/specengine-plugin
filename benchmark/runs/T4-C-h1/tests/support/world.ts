// Cucumber World：跨步驟狀態集中在這裡，每個 Scenario 建立一份新的 World，Scenario 之間互不共享。
// 三個服務只能透過這裡的「事件待送達佇列」互相溝通：產生的事件先排隊，再由步驟決定送達哪個服務。
// 這讓 Scenario 能精確控制亂序與重複送達（至少一次傳遞、不保證順序）。
import { setWorldConstructor, World as CucumberWorld } from '@cucumber/cucumber';
import {
  createOrderService,
  createInventoryService,
  createPaymentService,
  type CommandResult,
  type Event,
  type InventoryService,
  type OrderService,
  type PaymentService,
} from '../../src/shop.js';

export type ServiceName = '訂單服務' | '庫存服務' | '付款服務';
const ALL_SERVICES: ServiceName[] = ['訂單服務', '庫存服務', '付款服務'];

type Pending = { event: Event; delivered: Set<ServiceName> };

// 白話狀態 → OrderStatus（與 terms.md 一致）
export const STATUS_MAP: Record<string, string> = {
  處理中: 'PENDING',
  已確認: 'CONFIRMED',
  庫存不足: 'REJECTED',
  付款失敗: 'FAILED',
  已取消: 'CANCELLED',
};

export class World extends CucumberWorld {
  // 初始設定（Given 寫入，第一次需要服務時才建立服務）
  stockConfig: Record<string, number> = {};
  balanceConfig: Record<string, number> = {};

  private services?: { order: OrderService; inventory: InventoryService; payment: PaymentService };
  private pending: Pending[] = [];

  // 最近一次 placeOrder／cancelOrder 的結果
  lastCommand?: CommandResult;
  // 本次 When 步驟發出的事件
  lastStepEvents: Event[] = [];
  // 本 Scenario 內所有發出過的事件（依發出順序）
  eventLog: Event[] = [];

  get started(): boolean {
    return this.services !== undefined;
  }

  private ensure(): NonNullable<World['services']> {
    if (!this.services) {
      this.services = {
        order: createOrderService(),
        inventory: createInventoryService({ ...this.stockConfig }),
        payment: createPaymentService({ ...this.balanceConfig }),
      };
    }
    return this.services;
  }

  beginStep(): void {
    this.lastStepEvents = [];
  }

  private addEvents(events: Event[]): void {
    for (const e of events) {
      this.pending.push({ event: e, delivered: new Set() });
      this.eventLog.push(e);
      this.lastStepEvents.push(e);
    }
  }

  placeOrder(input: { orderId: string; customerId: string; sku: string; qty: number; amount: number; at: string }): void {
    const res = this.ensure().order.placeOrder(input);
    this.lastCommand = res;
    if (res.ok) this.addEvents(res.events);
  }

  cancelOrder(orderId: string, at: string): void {
    const res = this.ensure().order.cancelOrder(orderId, at);
    this.lastCommand = res;
    if (res.ok) this.addEvents(res.events);
  }

  tick(now: string): void {
    this.addEvents(this.ensure().order.tick(now));
  }

  // 把某訂單的某類事件送到指定服務（首次送達；若已送達過則找下一個同類事件）
  deliver(orderId: string, type: string, service: ServiceName): void {
    const matches = this.pending.filter((p) => p.event.orderId === orderId && p.event.type === type);
    const target = matches.find((p) => !p.delivered.has(service)) ?? matches[0];
    if (!target) throw new Error(`找不到訂單 ${orderId} 的待送達事件 ${type}`);
    target.delivered.add(service);
    this.handleAt(service, target.event);
  }

  // 重複送達：同一個事件物件再送一次
  deliverDuplicate(orderId: string, type: string, service: ServiceName): void {
    const target = this.pending.find((p) => p.event.orderId === orderId && p.event.type === type);
    if (!target) throw new Error(`找不到訂單 ${orderId} 的待送達事件 ${type}`);
    target.delivered.add(service);
    this.handleAt(service, target.event);
  }

  // 把所有待送達事件送到所有服務（FIFO，直到沒有未送達的事件）
  deliverAll(): void {
    for (let i = 0; i < this.pending.length; i++) {
      const p = this.pending[i];
      for (const s of ALL_SERVICES) {
        if (p.delivered.has(s)) continue;
        p.delivered.add(s);
        this.handleAt(s, p.event);
      }
    }
  }

  private handleAt(service: ServiceName, event: Event): void {
    const svc = this.ensure();
    const out =
      service === '訂單服務' ? svc.order.handle(event)
        : service === '庫存服務' ? svc.inventory.handle(event)
          : svc.payment.handle(event);
    this.addEvents(out);
  }

  orderStatus(orderId: string) {
    return this.ensure().order.getOrder(orderId);
  }

  available(sku: string): number {
    return this.ensure().inventory.getAvailable(sku);
  }

  balance(customerId: string): number {
    return this.ensure().payment.getBalance(customerId);
  }
}

setWorldConstructor(World);
