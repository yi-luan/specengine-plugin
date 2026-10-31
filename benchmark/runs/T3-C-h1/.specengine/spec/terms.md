# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 租戶 | 使用本系統的獨立客戶單位，各自擁有優惠券 | coupons.tenant_id | COUPON |
| 優惠券 | 可在結帳時套用折扣的憑證，以代碼識別 | coupons 表 | COUPON |
| 百分比折扣 | 依折扣前訂單金額乘以百分比計算的折扣，每張各自無條件捨去 | coupons.type = PERCENT | COUPON |
| 固定金額折扣 | 直接折抵固定元數的折扣 | coupons.type = FIXED | COUPON |
| 有效期間 | 優惠券可使用的起迄時刻區間，含起迄 | coupons.valid_from / valid_to | COUPON |
| 可疊加 | 優惠券可與其他可疊加優惠券同時使用 | coupons.stackable = true | COUPON |
| 不可疊加 | 優惠券只能單獨使用 | coupons.stackable = false | COUPON |
| 最低消費 | 使用該優惠券所需的訂單金額下限，達到即可 | coupons.min_order_amount | COUPON |
| 折扣前金額 | 尚未套用任何優惠券的訂單金額，百分比折扣的計算基準 | ApplyInput.orderAmount | COUPON |
| 折扣總額 | 所有已套用優惠券折抵金額的合計 | ApplyResult.discount | COUPON |
| 折扣後金額 | 折扣前金額扣除折扣總額後的應付金額 | ApplyResult.finalAmount | COUPON |
| 實際套用代碼 | 本次結帳實際生效的優惠券代碼清單，依傳入順序 | ApplyResult.applied | COUPON |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_INPUT | 訂單金額為 0、負數或非整數 | resolved/features/優惠券_失敗原因文案.md |
| MSG-002 | INVALID_COUPON | 券值不合法，或有效迄日早於起日、時間格式不合法 | resolved/features/優惠券_失敗原因文案.md |
| MSG-003 | TENANT_MISMATCH | 券的租戶與呼叫的租戶不同 | resolved/features/優惠券_失敗原因文案.md |
| MSG-004 | DUPLICATE_COUPON | 同一次呼叫中代碼重複 | resolved/features/優惠券_失敗原因文案.md |
| MSG-005 | COUPON_EXPIRED | 未生效或已過期 | resolved/features/優惠券_失敗原因文案.md |
| MSG-006 | MIN_ORDER_NOT_MET | 未達最低消費 | resolved/features/優惠券_失敗原因文案.md |
| MSG-007 | NOT_STACKABLE | 不可疊加的券與其他券併用，或多張不可疊加同時出現 | resolved/features/優惠券_失敗原因文案.md |
| MSG-008 | DISCOUNT_EXCEEDS_AMOUNT | 折扣（單張或合計）超過折扣前金額 | resolved/features/優惠券_失敗原因文案.md |
