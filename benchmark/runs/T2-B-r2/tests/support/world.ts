import { Before, setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { Order, OrderResult } from '../../src/order.js';

/**
 * Shared state for one scenario.
 * - `order`:    the current order (after a successful operation it becomes the returned order)
 * - `input`:    the exact object that was passed to the last operation
 * - `snapshot`: a structuredClone of `input` taken before the last operation (purity check)
 * - `result`:   the OrderResult of the last operation
 */
export class OrderWorld extends World {
  order: Order | null = null;
  input: Order | null = null;
  snapshot: Order | null = null;
  result: OrderResult | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(OrderWorld);

Before(function (this: OrderWorld) {
  this.order = null;
  this.input = null;
  this.snapshot = null;
  this.result = null;
});
