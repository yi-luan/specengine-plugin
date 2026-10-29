# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 租戶 | 使用本系統的獨立商家，各自擁有優惠券 | tenants.id ／ Coupon.tenantId ／ ApplyInput.tenantId | TENANT_COUPON |
| 優惠券 | 結帳時可折抵訂單金額的券 | coupons ／ Coupon | TENANT_COUPON |
| 優惠券代碼 | 優惠券的識別代碼，同一租戶內唯一 | coupons.code ／ Coupon.code | TENANT_COUPON |
| 百分比折扣 | 依訂單金額的百分比折抵 | Coupon.type = 'PERCENT' | TENANT_COUPON |
| 固定金額折扣 | 折抵固定的整數元 | Coupon.type = 'FIXED' | TENANT_COUPON |
| 折扣值 | 百分比折扣的百分比，或固定金額折扣的金額 | coupons.value ／ Coupon.value | TENANT_COUPON |
| 有效期間 | 優惠券可使用的起迄時間 | Coupon.validFrom ／ Coupon.validTo | TENANT_COUPON |
| 可疊加 | 可與其他優惠券在同一張訂單同時使用 | Coupon.stackable | TENANT_COUPON |
| 最低消費金額 | 訂單金額需達到才能使用該券；未設定表示無限制 | Coupon.minOrderAmount | TENANT_COUPON |
| 訂單金額 | 折扣前的訂單金額（整數元） | ApplyInput.orderAmount | TENANT_COUPON |
| 結帳時間 | 判定有效期間所用的當下時間 | ApplyInput.now | TENANT_COUPON |
| 套用優惠券 | 結帳時把優惠券清單套到訂單上計算折扣 | applyCoupons() | TENANT_COUPON |
| 折扣後金額 | 訂單金額扣除折扣總額後的金額 | ApplyResult.finalAmount | TENANT_COUPON |
| 折扣總額 | 所有實際套用優惠券的折扣金額合計 | ApplyResult.discount | TENANT_COUPON |
| 實際套用的優惠券代碼 | 依傳入順序列出真正被套用的優惠券代碼 | ApplyResult.applied | TENANT_COUPON |
| 失敗原因 | 套用失敗時回傳的原因 | ApplyResult.reason（ok: false） | TENANT_COUPON |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_INPUT | R-TENANT_COUPON-012 訂單金額為 0、負數或非整數 | resolved/data/多租戶優惠券_訂單金額不合理.md |
| MSG-002 | INVALID_COUPON | R-TENANT_COUPON-011 優惠券資料不合法 | resolved/data/多租戶優惠券_優惠券資料不合理.md |
| MSG-003 | TENANT_MISMATCH | R-TENANT_COUPON-003 優惠券租戶與訂單租戶不同 | resolved/features/多租戶優惠券_失敗原因文案.md |
| MSG-004 | DUPLICATE_COUPON | R-TENANT_COUPON-010 同一次結帳重複傳入相同代碼 | resolved/features/多租戶優惠券_同一張券重複傳入.md |
| MSG-005 | COUPON_EXPIRED | R-TENANT_COUPON-004 結帳時間不在有效期間（尚未生效與已過期同一代碼） | resolved/features/多租戶優惠券_失敗原因文案.md |
| MSG-006 | MIN_ORDER_NOT_MET | R-TENANT_COUPON-005 未達最低消費金額 | resolved/features/多租戶優惠券_失敗原因文案.md |
| MSG-007 | NOT_STACKABLE | R-TENANT_COUPON-007 不可疊加券與其他券同時使用 | resolved/features/多租戶優惠券_不可疊加券與其他券同時使用.md |
| MSG-008 | DISCOUNT_EXCEEDS_AMOUNT | R-TENANT_COUPON-008 折扣總額超過訂單金額 | resolved/features/多租戶優惠券_折扣超過訂單金額時的反應.md |
