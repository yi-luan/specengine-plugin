# Contract: `applyCoupons`（`src/coupon.ts`，固定不可更名）

```ts
export type Coupon = {
  tenantId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  validFrom: string;
  validTo: string;
  stackable: boolean;
  minOrderAmount?: number;
};
export type ApplyInput = { tenantId: string; orderAmount: number; coupons: Coupon[]; now: string };
export type ApplyResult =
  | { ok: true; finalAmount: number; discount: number; applied: string[] }
  | { ok: false; reason: string };
export function applyCoupons(input: ApplyInput): ApplyResult;
```

## 行為保證

- 純函式：不讀時鐘、不做 I/O、不修改輸入。
- 失敗 reason 只會是 data-model.md 列出的 8 個代碼之一，依優先序回報第一個命中的。
- 成功時 `discount + finalAmount === orderAmount`，`finalAmount ≥ 0`，皆為整數；`applied` 依傳入順序。
- `coupons` 為空：`{ ok: true, finalAmount: orderAmount, discount: 0, applied: [] }`。

## 範例

| 輸入 | 輸出 |
|------|------|
| 1000 元，PERCENT 10 | ok, discount 100, final 900 |
| 333 元，PERCENT 15 | ok, discount 49, final 284 |
| 100 元，FIXED 300 | `DISCOUNT_EXCEEDS_AMOUNT` |
| 不可疊加 + 可疊加 | `NOT_STACKABLE` |
