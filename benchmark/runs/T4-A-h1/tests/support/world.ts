import { setWorldConstructor } from '@cucumber/cucumber';
import {
  createInventoryService,
  createOrderService,
  createPaymentService,
  type CommandResult,
  type InventoryService,
  type OrderService,
  type PaymentService,
} from '../../src/shop.js';
import { Bus } from './bus.js';

export class ShopWorld {
  stock: Record<string, number> = {};
  balances: Record<string, number> = {};

  order!: OrderService;
  inventory!: InventoryService;
  payment!: PaymentService;
  bus!: Bus;

  lastResult?: CommandResult;
  now = '2026-06-15T12:00:00Z';

  constructor() {
    this.reset();
  }

  // 依目前的初始庫存與餘額重建三個服務與匯流排（在任何事件發生前呼叫）。
  reset(): void {
    this.order = createOrderService();
    this.inventory = createInventoryService(this.stock);
    this.payment = createPaymentService(this.balances);
    this.bus = new Bus(this.order, this.inventory, this.payment);
  }
}

setWorldConstructor(ShopWorld);
