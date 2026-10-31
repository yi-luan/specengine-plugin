# Contract: applyCoupons

**Module**: `src/coupon.ts`

## Signature

```ts
export function applyCoupons(input: ApplyInput): ApplyResult;
```

型別定義見 [data-model.md](../data-model.md)。純函式，不做 I/O。

## 行為摘要

| 輸入情境 | 結果 |
|----------|------|
| 無券（`coupons` 為空） | `{ ok: true, finalAmount: orderAmount, discount: 0, applied: [] }` |
| 所有券通過檢查 | `{ ok: true, finalAmount, discount, applied }` |
| 任一檢查失敗 | `{ ok: false, reason }`，reason 為 FR-009 固定代碼之一 |

## 判定順序

依 [research.md](../research.md) 第 2 節：先整批檢查（`DUPLICATE_COUPON`、`NOT_STACKABLE`），再依傳入順序逐張檢查（`INVALID_COUPON`、`TENANT_MISMATCH`、`COUPON_EXPIRED`、`MIN_ORDER_NOT_MET`），回傳第一個失敗。

## 不變式

- `finalAmount + discount === orderAmount`
- `0 <= finalAmount <= orderAmount`
- 成功時所有金額皆為整數
- `applied` 的順序與 `input.coupons` 中被套用券的順序一致

## 例外

`orderAmount` 非整數或為負、`now` / `validFrom` / `validTo` 無法解析時，拋出例外（程式錯誤，非業務失敗）。
