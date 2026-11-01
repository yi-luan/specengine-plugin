// 測試 World：每個 Scenario 一個實例，承載三個記憶體內服務與事件紀錄。
// 嚴禁全域變數：所有跨步驟狀態都放在這裡。
import { setWorldConstructor, World as CucumberWorld } from '@cucumber/cucumber';
import type { IWorldOptions } from '@cucumber/cucumber';
import { randomUUID } from 'node:crypto';
import {
  createInventoryService,
  createOrderService,
  createPaymentService,
  type CommandResult,
  type Event,
  type InventoryService,
  type OrderService,
  type PaymentService,
} from '../../src/shop.js';

export type ServiceName = '訂單服務' | '庫存服務' | '付款服務';
type Handler = { handle(event: Event): Event[] };

export class OrderSagaWorld extends CucumberWorld {
  /** Given 步驟累積的初始庫存／餘額；服務在第一次被使用時才以這些初始表建立 */
  stock: Record<string, number> = {};
  balances: Record<string, number> = {};
  private orderService?: OrderService;
  private inventoryService?: InventoryService;
  private paymentService?: PaymentService;

  /** 系統內所有已發出的事件（依發出順序） */
  allEvents: Event[] = [];
  /** 尚未廣播的事件（供「所有待傳遞的事件依序廣播」使用） */
  pending: Event[] = [];
  /** 最近一次 placeOrder／cancelOrder 的結果 */
  lastResult?: CommandResult;
  /** 最近一次指令、tick 或 handle 產生的事件 */
  lastEvents: Event[] = [];

  constructor(options: IWorldOptions) {
    super(options);
  }

  get order(): OrderService {
    return (this.orderService ??= createOrderService());
  }
  get inventory(): InventoryService {
    return (this.inventoryService ??= createInventoryService(this.stock));
  }
  get payment(): PaymentService {
    return (this.paymentService ??= createPaymentService(this.balances));
  }

  serviceByName(name: string): Handler {
    switch (name as ServiceName) {
      case '訂單服務': return this.order;
      case '庫存服務': return this.inventory;
      case '付款服務': return this.payment;
      default: throw new Error(`未知的服務名稱：${name}`);
    }
  }

  /** 記錄本次產生的事件，並加入事件紀錄與待廣播佇列 */
  record(events: Event[]): void {
    this.lastEvents = events;
    this.allEvents.push(...events);
    this.pending.push(...events);
  }

  /** 找出系統內某訂單最近一次發出的指定類型事件（供「送達」步驟重送同一事件） */
  findEvent(orderId: string, type: Event['type']): Event {
    for (let i = this.allEvents.length - 1; i >= 0; i--) {
      const event = this.allEvents[i];
      if (event.orderId === orderId && event.type === type) return event;
    }
    throw new Error(`系統內找不到訂單 ${orderId} 的事件 ${type}`);
  }

  /** 建立一個不是由本系統服務發出的「外來事件」（欄位最小化，id 全新） */
  syntheticEvent(orderId: string, type: Event['type']): Event {
    const id = randomUUID();
    switch (type) {
      case 'OrderPlaced':
        return { id, type, orderId, customerId: 'EXTERNAL', sku: 'EXTERNAL', qty: 1, amount: 1, at: '2026-01-01T00:00:00Z' };
      case 'PaymentSucceeded':
      case 'PaymentRefunded':
        return { id, type, orderId, amount: 1 };
      default:
        return { id, type, orderId };
    }
  }

  /** 把待廣播的事件依序送給三個服務，服務產生的新事件接續排隊，直到佇列清空 */
  broadcastAll(): void {
    const produced: Event[] = [];
    const services: Handler[] = [this.order, this.inventory, this.payment];
    while (this.pending.length) {
      const event = this.pending.shift() as Event;
      for (const service of services) {
        const out = service.handle(event);
        produced.push(...out);
        this.allEvents.push(...out);
        this.pending.push(...out);
      }
    }
    this.lastEvents = produced;
  }
}

setWorldConstructor(OrderSagaWorld);
