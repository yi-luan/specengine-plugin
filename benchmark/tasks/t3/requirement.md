# 需求：多租戶優惠券

1. 系統服務多個租戶，每個租戶有自己的優惠券，優惠券只能用在同一租戶的訂單。
2. 優惠券有兩種：百分比折扣（PERCENT）與固定金額折扣（FIXED）。
3. 每張優惠券有有效期間（起、迄），只能在期間內使用。
4. 優惠券可標記為「可疊加」；不可疊加的優惠券一張訂單只能用一張。
5. 可疊加的優惠券可以多張同時使用。
6. 固定金額折扣不得使訂單金額低於 0。
7. 優惠券可設定最低消費金額，訂單金額未達者不能使用該券。
8. 結帳時回傳折扣後金額、折扣總額與實際套用的優惠券代碼。
9. 套用失敗時回傳失敗原因。
10. 百分比折扣一律以折扣前的訂單金額計算。
11. 同一租戶內優惠券代碼唯一。
12. 所有金額以整數元計算。

## 技術介面（固定，不可更名）

在 `src/coupon.ts` 匯出：

```ts
export type Coupon = {
  tenantId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;            // PERCENT: 折扣百分比；FIXED: 折扣金額（元）
  validFrom: string;        // ISO 8601，例如 '2026-01-01T00:00:00Z'
  validTo: string;          // ISO 8601
  stackable: boolean;
  minOrderAmount?: number;  // 最低消費（元），未設定表示無限制
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };
export function applyCoupons(input: ApplyInput): ApplyResult;
```

純函式，不碰資料庫。`applied` 依傳入順序列出實際套用的優惠券代碼。
