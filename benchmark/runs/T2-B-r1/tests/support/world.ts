import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

/**
 * 測試用 World：
 * - order    目前「手上的」訂單（Given 建構；When 成功後換成回傳的新訂單）
 * - input    最近一次 When 實際傳入函式的訂單物件（用來驗證純函式）
 * - snapshot input 在呼叫前的深拷貝
 * - result   最近一次操作的 OrderResult
 */
export class OrderWorld extends World {
  order?: Order;
  input?: Order;
  snapshot?: Order;
  result?: OrderResult;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(OrderWorld);
