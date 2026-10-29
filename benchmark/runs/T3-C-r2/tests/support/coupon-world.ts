// 多租戶優惠券（MULTI_TENANT_COUPON）的 Cucumber World：每個 Scenario 一個新實例，跨步驟狀態只放這裡，不用全域變數。
// Binding Layer 為 direct：Step 直接呼叫 src/ 的產品函式，無 Driver 層。
import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';

/** 測試側組裝的優惠券原始資料（Step 收到的字串轉型後的結果） */
export type CouponDraft = {
  tenantId: string;
  code: string;
  type: string;
  value: number;
  validFrom: string;
  validTo: string;
  stackable: boolean;
  minOrderAmount?: number;
};

/** 結帳結果（與 src/coupon.ts 的 ApplyResult 同形） */
export type CheckoutOutcome =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };

export class CouponWorld extends World {
  tenantId = '';
  orderAmount = Number.NaN;
  now = '';
  coupons: CouponDraft[] = [];
  outcome: CheckoutOutcome | undefined;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CouponWorld);
