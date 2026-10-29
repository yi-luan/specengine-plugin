import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { ApplyResult, Coupon } from '../../src/coupon.js';

/** Typed cucumber World: holds the checkout request under construction and the result. */
export class CouponWorld extends World {
  tenantId = 'A';
  orderAmount = 0;
  now = '2026-06-15T12:00:00Z';
  coupons: Coupon[] = [];
  result: ApplyResult | undefined = undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CouponWorld);
