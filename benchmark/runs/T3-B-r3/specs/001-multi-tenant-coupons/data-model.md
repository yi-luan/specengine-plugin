# Data Model: 多租戶優惠券

## Coupon

| 欄位 | 型別 | 驗證（違反 → `INVALID_COUPON`） |
|------|------|--------------------------------|
| tenantId | string | 必須是字串（與請求不一致 → `TENANT_MISMATCH`） |
| code | string | 非空字串；同一請求不得重複（→ `DUPLICATE_COUPON`） |
| type | `'PERCENT' \| 'FIXED'` | 只能是這兩個值 |
| value | number | PERCENT：1～100 的整數；FIXED：正整數 |
| validFrom | string (ISO 8601) | 可解析；≤ validTo |
| validTo | string (ISO 8601) | 可解析 |
| stackable | boolean | 必須是布林值 |
| minOrderAmount? | number | 若有設定：≥ 0 的整數 |

## ApplyInput

| 欄位 | 型別 | 驗證（違反 → `INVALID_INPUT`） |
|------|------|-------------------------------|
| tenantId | string | 非空字串 |
| orderAmount | number | 正整數（0、負數、非整數皆拒絕） |
| coupons | Coupon[] | 必須是陣列（可為空 → 成功、折扣 0） |
| now | string (ISO 8601) | 可解析 |

## ApplyResult

- 成功：`{ ok: true, finalAmount, discount, applied }`；`discount = Σ 各券折扣`，`finalAmount = orderAmount - discount ≥ 0`，`applied` = 傳入順序的全部代碼。
- 失敗：`{ ok: false, reason }`，reason ∈ 下表。

## Reason 代碼（優先序由高到低）

| # | reason | 觸發條件 |
|---|--------|----------|
| 1 | INVALID_INPUT | ApplyInput 欄位不合法 |
| 2 | INVALID_COUPON | 任一券欄位不合法（含陣列元素非物件） |
| 3 | TENANT_MISMATCH | 任一券 tenantId ≠ input.tenantId |
| 4 | DUPLICATE_COUPON | 同一請求有相同 code |
| 5 | COUPON_EXPIRED | 任一券 now < validFrom 或 now > validTo |
| 6 | MIN_ORDER_NOT_MET | 任一券 orderAmount < minOrderAmount |
| 7 | NOT_STACKABLE | 券數 > 1 且任一券 stackable = false |
| 8 | DISCOUNT_EXCEEDS_AMOUNT | 折扣加總 > orderAmount |

無狀態轉移（純計算）。
