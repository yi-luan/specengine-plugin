# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 租戶 | 使用本系統的一個獨立商家／客戶，彼此的優惠券互不相通 | tenants.id／Coupon.tenantId／ApplyInput.tenantId | MULTI_TENANT_COUPON |
| 優惠券 | 可在結帳時折抵訂單金額的券 | coupons／Coupon | MULTI_TENANT_COUPON |
| 優惠券代碼 | 識別一張優惠券的代碼，同一租戶內唯一 | coupons.code／Coupon.code | MULTI_TENANT_COUPON |
| 折扣類型 | 優惠券是「百分比折扣」還是「固定金額折扣」 | coupons.type／Coupon.type（'PERCENT' \| 'FIXED'） | MULTI_TENANT_COUPON |
| 百分比折扣 | 依訂單金額的百分比折抵，一律以折扣前的訂單金額計算 | Coupon.type = 'PERCENT'，Coupon.value 為百分比 | MULTI_TENANT_COUPON |
| 固定金額折扣 | 折抵固定的整數元金額 | Coupon.type = 'FIXED'，Coupon.value 為金額（元） | MULTI_TENANT_COUPON |
| 有效期間 | 優惠券可以使用的起迄時間，含頭含尾（validFrom ≤ 結帳時間 ≤ validTo） | coupons.valid_from／valid_to；Coupon.validFrom／validTo（ISO 8601） | MULTI_TENANT_COUPON |
| 結帳時間 | 結帳當下的時間，用來判斷券是否在有效期間內 | ApplyInput.now（ISO 8601） | MULTI_TENANT_COUPON |
| 可疊加 | 標記為可疊加的券可多張同時使用；不可疊加的一張訂單只能用一張 | coupons.stackable／Coupon.stackable | MULTI_TENANT_COUPON |
| 最低消費金額 | 訂單金額至少要達到的門檻，未達者不能使用該券；未設定表示無限制 | coupons.min_order_amount／Coupon.minOrderAmount | MULTI_TENANT_COUPON |
| 訂單金額 | 折扣前的訂單金額（整數元） | ApplyInput.orderAmount | MULTI_TENANT_COUPON |
| 折扣後金額 | 訂單金額扣掉折扣總額後的金額 | ApplyResult.finalAmount | MULTI_TENANT_COUPON |
| 折扣總額 | 所有實際套用的優惠券折抵金額之和 | ApplyResult.discount | MULTI_TENANT_COUPON |
| 實際套用的優惠券代碼 | 這次結帳真的用到的券代碼清單，依傳入順序 | ApplyResult.applied | MULTI_TENANT_COUPON |
| 失敗原因 | 套用失敗時回傳的原因，為固定的全大寫 SNAKE_CASE 代碼（見固定文案） | ApplyResult.reason（ok = false 時） | MULTI_TENANT_COUPON |
| 整筆拒絕 | 只要有任何一張券或輸入不合規，整筆結帳失敗（ok = false），不套用任何券 | ApplyResult = { ok: false, reason } | MULTI_TENANT_COUPON |
| 結帳 | 呼叫 applyCoupons 計算折扣的動作 | applyCoupons(input: ApplyInput): ApplyResult | MULTI_TENANT_COUPON |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | TENANT_MISMATCH | R-MULTI_TENANT_COUPON-002 失敗原因：傳入的券屬於別的租戶 | resolved/features/多租戶優惠券_Q01_租戶不符的處理.md |
| MSG-002 | COUPON_EXPIRED | R-MULTI_TENANT_COUPON-003 失敗原因：券已過期或尚未生效（共用） | resolved/features/多租戶優惠券_Q02_期間外的處理.md |
| MSG-003 | NOT_STACKABLE | R-MULTI_TENANT_COUPON-004／011 失敗原因：兩張以上不可疊加券同用，或不可疊加券與其他券混用 | resolved/features/多租戶優惠券_Q04_多張不可疊加券同時傳入.md、resolved/features/多租戶優惠券_Q05_不可疊加與可疊加混用.md |
| MSG-004 | DUPLICATE_COUPON | R-MULTI_TENANT_COUPON-012 失敗原因：同一張券（同租戶＋同代碼）重複傳入 | resolved/features/多租戶優惠券_Q11_同一張券重複傳入.md |
| MSG-005 | DISCOUNT_EXCEEDS_AMOUNT | R-MULTI_TENANT_COUPON-006 失敗原因：折扣總額超過訂單金額 | resolved/features/多租戶優惠券_Q08_折扣超過訂單金額.md |
| MSG-006 | INVALID_INPUT | R-MULTI_TENANT_COUPON-015 失敗原因：訂單金額為 0、負數或非整數，或結帳時間不合法 | resolved/data/多租戶優惠券_Q12_訂單金額的合法範圍.md |
| MSG-007 | MIN_ORDER_NOT_MET | R-MULTI_TENANT_COUPON-007 失敗原因：折扣前訂單金額未達最低消費金額 | resolved/features/多租戶優惠券_Q09_最低消費的判定基準.md |
| MSG-008 | INVALID_COUPON | R-MULTI_TENANT_COUPON-017 失敗原因：券設定不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數、時間不合法或期間顛倒、最低消費金額為負數或非整數） | resolved/data/多租戶優惠券_Q13_優惠券值的合法範圍.md |
