# Data Model: 多租戶優惠券套用

**Feature**: 001-multi-tenant-coupons | **Date**: 2026-10-20

純函式模組，無持久化；以下為輸入／輸出資料形狀與驗證規則。型別名稱與欄位依需求固定，不可更名。

## Coupon（優惠券）

| 欄位 | 型別 | 說明 | 驗證規則 |
|------|------|------|----------|
| tenantId | string | 所屬租戶 | 必須等於 `ApplyInput.tenantId`，否則 `TENANT_MISMATCH` |
| code | string | 優惠券代碼 | 同租戶內唯一；同一次輸入重複 → `DUPLICATE_COUPON` |
| type | `'PERCENT' \| 'FIXED'` | 折扣類型 | 其他值 → `INVALID_COUPON` |
| value | number | PERCENT：百分比；FIXED：折扣元數 | 整數；PERCENT 0～100；FIXED ≥ 0；否則 `INVALID_COUPON` |
| validFrom | string (ISO 8601) | 生效時間 | 可解析；`validFrom ≤ validTo`；否則 `INVALID_COUPON` |
| validTo | string (ISO 8601) | 失效時間 | 可解析；`now` 不在 `[validFrom, validTo]` → `COUPON_EXPIRED` |
| stackable | boolean | 是否可疊加 | 不可疊加券與任何其他券並存 → `NOT_STACKABLE` |
| minOrderAmount | number (optional) | 最低消費（元） | 若設定：整數且 ≥ 0，否則 `INVALID_COUPON`；`orderAmount < minOrderAmount` → `MIN_ORDER_NOT_MET` |

## ApplyInput（結帳請求）

| 欄位 | 型別 | 驗證規則 |
|------|------|----------|
| tenantId | string | 作為租戶比對基準 |
| orderAmount | number | 必須為整數且 > 0，否則 `INVALID_INPUT` |
| coupons | Coupon[] | 有序；可為空 |
| now | string (ISO 8601) | 可解析，否則 `INVALID_INPUT` |

## ApplyResult（結帳結果）

成功：

| 欄位 | 型別 | 說明 |
|------|------|------|
| ok | `true` | |
| finalAmount | number | `orderAmount - discount`，≥ 0 整數 |
| discount | number | `Σ floor(orderAmount × percent / 100) + Σ fixed`，整數 |
| applied | string[] | 依傳入順序列出所有券的 `code`（all-or-nothing，成功時即全部套用） |

失敗：

| 欄位 | 型別 | 說明 |
|------|------|------|
| ok | `false` | |
| reason | string | 固定代碼之一（見下） |

## Reason 代碼（固定字串，依檢查順序）

1. `INVALID_INPUT` — orderAmount 非正整數，或 now 無法解析
2. `INVALID_COUPON` — 券本身資料不合法
3. `TENANT_MISMATCH` — 任一券的 tenantId 與訂單不同
4. `DUPLICATE_COUPON` — 同租戶同代碼在輸入中出現兩次以上
5. `COUPON_EXPIRED` — 任一券 now 不在 [validFrom, validTo]（含未生效）
6. `MIN_ORDER_NOT_MET` — 任一券 orderAmount < minOrderAmount
7. `NOT_STACKABLE` — 券數 > 1 且含任一不可疊加券
8. `DISCOUNT_EXCEEDS_AMOUNT` — discount > orderAmount

## 計算流程（無狀態轉移）

```
validateInput → validateCoupons → checkTenant → checkDuplicate → checkPeriod
  → checkMinOrder → checkStackable → computeDiscount → checkExceeds → success
```

每步失敗即回傳 `{ ok: false, reason }`；全部通過回傳 `{ ok: true, finalAmount, discount, applied }`。
