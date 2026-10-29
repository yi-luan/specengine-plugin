import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { ApplyInput, ApplyResult, Coupon } from '../../src/coupon.js';

export class CouponWorld extends World {
  tenantId = 'T1';
  orderAmount = 0;
  now = '2026-06-01T00:00:00Z';
  coupons: Coupon[] = [];
  result: ApplyResult | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }

  buildInput(): ApplyInput {
    return {
      tenantId: this.tenantId,
      orderAmount: this.orderAmount,
      coupons: this.coupons,
      now: this.now,
    };
  }
}

setWorldConstructor(CouponWorld);
