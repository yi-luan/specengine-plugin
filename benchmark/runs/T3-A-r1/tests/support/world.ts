import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { ApplyResult, Coupon } from '../../src/coupon.js';

export class CouponWorld extends World {
  tenantId = 't1';
  orderAmount = 0;
  now = '2026-01-01T00:00:00Z';
  coupons: Coupon[] = [];
  result: ApplyResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CouponWorld);
