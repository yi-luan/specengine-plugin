// 庫存保留（INVENTORY_RESERVATION）測試用 World：跨步驟狀態放這裡，不用全域變數。
// cucumber.cjs 的 import 已涵蓋 tests/support/**/*.ts，無需另行載入。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Event, InventoryService } from '../../src/events.js';

export class InventoryWorld extends World {
  /** 被測的庫存服務實例（Given 初始庫存時建立） */
  service: InventoryService | undefined;
  /** 最近一次 handle() 的回傳值 */
  lastResult: Event[] = [];
  /** 本 Scenario 內所有曾回傳過的事件 id（驗證唯一性用） */
  seenEventIds: string[] = [];
  /** 最近一次 getAvailable() 的回傳值 */
  queryResult: number | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(InventoryWorld);
