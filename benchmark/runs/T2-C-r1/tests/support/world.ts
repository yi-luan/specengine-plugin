// tests/support/world.ts
// 訂單狀態機模組的 cucumber World：跨步驟狀態一律放在這裡，不用全域變數。
// 由 cucumber.cjs 的 import 'tests/support/**/*.ts' 載入。
import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

export class OrderWorld extends World {
  /** 目前作為下一次操作輸入的訂單物件（Given 建立，或上一次成功操作的回傳值） */
  current: Order | undefined = undefined;
  /** 最近一次操作實際傳入的訂單物件（用來驗證純函式） */
  input: Order | undefined = undefined;
  /** 呼叫操作前對 input 做的深拷貝，用來驗證純函式不修改傳入物件 */
  before: Order | undefined = undefined;
  /** 最近一次操作的回傳結果 */
  result: OrderResult | undefined = undefined;
}

setWorldConstructor(OrderWorld);
