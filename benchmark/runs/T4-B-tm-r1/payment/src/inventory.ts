// 由負責 InventoryService 的工程師實作。
import type { InventoryService } from './events.js';

export function createInventoryService(stock: Record<string, number>): InventoryService {
  throw new Error('尚未實作');
}
