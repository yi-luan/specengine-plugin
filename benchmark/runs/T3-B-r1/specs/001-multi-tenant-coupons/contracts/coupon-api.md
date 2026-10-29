# Contract: `src/coupon.ts` 公開介面

**Feature**: 001-multi-tenant-coupons | **Date**: 2026-10-20

以下簽名逐字沿用需求「技術介面（固定，不可更名）」，實作與測試皆不得更動名稱或形狀。

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

## 行為契約

- 純函式：相同輸入永遠得到相同輸出；不讀時鐘、不做 I/O、不修改輸入物件。
- All-or-nothing：任一張券驗證失敗則整筆 `ok: false`，不部分套用。
- `applied` 為成功時所有傳入券的 `code`，順序與 `input.coupons` 相同。
- `reason` 只會是下列八個固定字串之一：
  `INVALID_INPUT`、`INVALID_COUPON`、`TENANT_MISMATCH`、`DUPLICATE_COUPON`、`COUPON_EXPIRED`、`MIN_ORDER_NOT_MET`、`NOT_STACKABLE`、`DISCOUNT_EXCEEDS_AMOUNT`。
- 多重錯誤時回報上列順序中第一個命中的代碼。
- 計算：`discount = Σ floor(orderAmount × percentValue / 100) + Σ fixedValue`；`finalAmount = orderAmount − discount`；`discount > orderAmount` 為錯誤，`discount == orderAmount` 為成功且 `finalAmount = 0`。
- 期間判定：`Date.parse(validFrom) ≤ Date.parse(now) ≤ Date.parse(validTo)`。
- 最低消費以 `orderAmount`（折扣前）判定，`orderAmount ≥ minOrderAmount` 即達標。
- 空券清單：`{ ok: true, finalAmount: orderAmount, discount: 0, applied: [] }`。

## 範例

| 輸入 | 輸出 |
|------|------|
| 1000 元，PERCENT 10 (stackable) | `{ ok: true, finalAmount: 900, discount: 100, applied: ['P10'] }` |
| 333 元，PERCENT 15 | `discount: 49`（49.95 捨去） |
| 1000 元，PERCENT 10 + FIXED 50（皆 stackable） | `discount: 150, applied: ['P10','F50']` |
| 100 元，FIXED 150 | `{ ok: false, reason: 'DISCOUNT_EXCEEDS_AMOUNT' }` |
| 100 元，FIXED 100 | `{ ok: true, finalAmount: 0, discount: 100, applied: ['F100'] }` |
| 1000 元，不可疊加 + 可疊加 | `{ ok: false, reason: 'NOT_STACKABLE' }` |
