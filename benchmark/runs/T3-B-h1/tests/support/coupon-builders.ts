import type { ApplyInput, Coupon } from '../../src/coupon.js';

export const DEFAULT_TENANT = 'A';
export const DEFAULT_NOW = '2026-06-01T00:00:00Z';

export function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    tenantId: DEFAULT_TENANT,
    code: 'SAVE10',
    type: 'PERCENT',
    value: 10,
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2026-12-31T00:00:00Z',
    stackable: true,
    ...overrides,
  };
}

export function makeInput(overrides: Partial<ApplyInput> = {}): ApplyInput {
  return {
    tenantId: DEFAULT_TENANT,
    orderAmount: 1000,
    coupons: [],
    now: DEFAULT_NOW,
    ...overrides,
  };
}
