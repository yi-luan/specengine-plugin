import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

export class OrderWorld extends World {
  /** 最後一次操作前的訂單（用來驗證純函式不修改傳入物件） */
  original: Order | undefined;
  /** 最後一次操作前訂單的拷貝快照 */
  originalSnapshot: Order | undefined;
  /** 目前持有的最新成功訂單 */
  current: Order | undefined;
  /** 最後一次操作結果 */
  result: OrderResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  reset(): void {
    this.original = undefined;
    this.originalSnapshot = undefined;
    this.current = undefined;
    this.result = undefined;
  }

  /** 套用操作：記錄原訂單快照，若成功則更新 current */
  apply(fn: (order: Order) => OrderResult): void {
    if (!this.current) {
      throw new Error('尚未有任何訂單可供操作');
    }
    this.original = this.current;
    this.originalSnapshot = { ...this.current };
    this.result = fn(this.current);
    if (this.result.ok) {
      this.current = this.result.order;
    }
  }
}

setWorldConstructor(OrderWorld);
