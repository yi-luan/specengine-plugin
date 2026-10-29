# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 租戶 | 使用本系統的一個獨立商家；每個租戶有自己的優惠券 | tenants.id／Coupon.tenantId／ApplyInput.tenantId | MULTI_TENANT_COUPON |
| 優惠券 | 可在結帳時折抵訂單金額的券 | coupons／Coupon | MULTI_TENANT_COUPON |
| 優惠券代碼 | 識別一張優惠券的代碼，同一租戶內唯一 | coupons.code／Coupon.code | MULTI_TENANT_COUPON |
| 折扣類型 | 優惠券是百分比折扣還是固定金額折扣 | coupons.type／Coupon.type（PERCENT ｜ FIXED） | MULTI_TENANT_COUPON |
| 百分比折扣 | 依訂單金額的百分比折抵 | Coupon.type = PERCENT，Coupon.value 為百分比 | MULTI_TENANT_COUPON |
| 固定金額折扣 | 折抵固定的金額（元） | Coupon.type = FIXED，Coupon.value 為金額 | MULTI_TENANT_COUPON |
| 折扣值 | PERCENT 時為百分比；FIXED 時為金額（元） | coupons.value／Coupon.value | MULTI_TENANT_COUPON |
| 有效期間 | 優惠券可使用的起迄時間 | coupons.valid_from／valid_to；Coupon.validFrom／validTo（ISO 8601） | MULTI_TENANT_COUPON |
| 結帳時間 | 結帳當下的時間，用來判斷是否在有效期間內 | ApplyInput.now（ISO 8601） | MULTI_TENANT_COUPON |
| 可疊加 | 標記該券可與其他券同時使用；不可疊加的券一張訂單只能用一張 | coupons.stackable／Coupon.stackable | MULTI_TENANT_COUPON |
| 最低消費金額 | 訂單金額需達到此值才能使用該券；未設定表示無限制 | coupons.min_order_amount／Coupon.minOrderAmount | MULTI_TENANT_COUPON |
| 訂單金額 | 折扣前的訂單總金額（整數元） | orders.amount／ApplyInput.orderAmount | MULTI_TENANT_COUPON |
| 折扣後金額 | 訂單金額扣掉折扣總額後的金額 | ApplyResult.finalAmount | MULTI_TENANT_COUPON |
| 折扣總額 | 所有實際套用的優惠券折扣額之和 | ApplyResult.discount | MULTI_TENANT_COUPON |
| 實際套用的優惠券代碼 | 這筆結帳真正用到的券的代碼清單，依傳入順序 | ApplyResult.applied | MULTI_TENANT_COUPON |
| 失敗原因 | 套用失敗時回傳的原因 | ApplyResult.reason | MULTI_TENANT_COUPON |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | TENANT_MISMATCH | R-MULTI_TENANT_COUPON-001 租戶不符的失敗原因 reason | resolved/features/多租戶優惠券_租戶不符時的回應.md |
| MSG-002 | COUPON_EXPIRED | R-MULTI_TENANT_COUPON-002 不在有效期間（尚未生效或已過期共用）的失敗原因 reason | resolved/features/多租戶優惠券_不在有效期間時的回應.md |
| MSG-004 | DISCOUNT_EXCEEDS_AMOUNT | R-MULTI_TENANT_COUPON-006 折扣總額超過訂單金額的失敗原因 reason | resolved/features/多租戶優惠券_折扣總額超過訂單金額時的反應.md |
| MSG-005 | MIN_ORDER_NOT_MET | R-MULTI_TENANT_COUPON-007 未達最低消費金額的失敗原因 reason | resolved/features/多租戶優惠券_未達最低消費時的回應.md |
| MSG-006 | DUPLICATE_COUPON | R-MULTI_TENANT_COUPON-010 同一張券傳入兩次以上的失敗原因 reason | resolved/features/多租戶優惠券_同一張券傳入兩次.md |
| MSG-007 | INVALID_INPUT | R-MULTI_TENANT_COUPON-011 訂單金額不合法或結帳時間無法解析的失敗原因 reason | resolved/data/多租戶優惠券_訂單金額為零負數或非整數.md、resolved/data/多租戶優惠券_時間字串非合法ISO8601.md |
| MSG-008 | INVALID_COUPON | R-MULTI_TENANT_COUPON-012 優惠券折扣值不合法或有效期間時間無法解析的失敗原因 reason | resolved/data/多租戶優惠券_折扣值不合法.md、resolved/data/多租戶優惠券_時間字串非合法ISO8601.md |
| MSG-003 | NOT_STACKABLE | R-MULTI_TENANT_COUPON-003 兩張以上不可疊加券、R-MULTI_TENANT_COUPON-008 不可疊加與可疊加混用的失敗原因 reason | resolved/features/多租戶優惠券_兩張以上不可疊加券同時傳入.md、resolved/features/多租戶優惠券_不可疊加與可疊加券混用.md |
