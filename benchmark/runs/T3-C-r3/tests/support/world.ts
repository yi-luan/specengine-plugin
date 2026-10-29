// 跨步驟狀態：每個 Scenario 一個新的 World 實例，無全域變數。
// 模組 TENANT_COUPON（多租戶優惠券），Binding Layer = direct。
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { ApplyResult, Coupon } from '../../src/coupon.js';

export class TenantCouponWorld extends World {
  /** Given 步驟定義的優惠券，以代碼為鍵 */
  coupons: Map<string, Coupon> = new Map();
  /** When 步驟呼叫套用優惠券後的回傳結果 */
  result: ApplyResult | undefined = undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(TenantCouponWorld);
