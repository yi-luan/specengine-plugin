// tests/support/world.ts
// cucumber-js World：跨步驟狀態一律放在這裡（spec-04 硬性約束 6：嚴禁全域變數）。
// cucumber.cjs 的 import 已涵蓋 tests/support/**/*.ts，本檔會被框架自動載入。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

export class OrderWorld extends World {
  /** 目前操作的訂單（Given 建立、成功操作後更新為回傳的新訂單） */
  order: Order | undefined;
  /** 最近一次操作「傳入」的訂單物件本體（用於驗證純函式未修改傳入值） */
  inputOrder: Order | undefined;
  /** 傳入訂單在操作前的深拷貝快照 */
  inputSnapshot: Order | undefined;
  /** 最近一次操作結果 */
  result: OrderResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(OrderWorld);
