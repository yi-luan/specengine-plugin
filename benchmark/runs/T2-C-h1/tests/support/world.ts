// 單一 Scenario 內的狀態容器（每個 Scenario 一份新的 World，不使用全域變數）。
import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

export class OrderWorld extends World {
  order: Order | undefined;
  result: OrderResult | undefined;
}

setWorldConstructor(OrderWorld);
