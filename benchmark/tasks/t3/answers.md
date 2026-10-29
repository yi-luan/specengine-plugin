# 標準答案表（T3 多租戶優惠券）— 回答者只准依此表回答

| 洞 | 類型 | 問題 | 標準答案 |
| :-- | :-- | :-- | :-- |
| H1 | 必問 | 傳入的券有一張屬於別的租戶時，整筆拒絕還是略過那張？ | 整筆拒絕。reason 固定為 `TENANT_MISMATCH` |
| H2 | 必問 | 有一張券過期或尚未生效時，整筆拒絕還是略過那張？ | 整筆拒絕。reason 固定為 `COUPON_EXPIRED`（未生效也用同一代碼） |
| H3 | 必問 | 有效期間的邊界：等於 validFrom 或等於 validTo 的那一刻算不算有效？ | 都算有效（含頭含尾）。以時間戳比較：validFrom ≤ now ≤ validTo |
| H4 | 必問 | 兩張以上不可疊加的券一起用？ | 整筆拒絕。reason 固定為 `NOT_STACKABLE` |
| H5 | 必問 | 一張不可疊加 + 一張以上可疊加混用？ | 整筆拒絕，不可疊加的券只能單獨用。reason `NOT_STACKABLE` |
| H6 | 必問 | 多張可疊加券的計算順序？ | 所有 PERCENT 各自以原始訂單金額計算折扣額後加總，再加上所有 FIXED 的金額；總折扣 = 兩者之和 |
| H7 | 必問 | 百分比算出小數時？ | 每張 PERCENT 的折扣額各自無條件捨去取整數 |
| H8 | 必問 | 折扣總額超過訂單金額時，截斷到 0 還是拒絕？ | 整筆拒絕。reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。總折扣剛好等於訂單金額可以，finalAmount = 0 |
| H9 | 必問 | 最低消費以折扣前還是折扣後金額判定？等於可不可以？ | 以折扣前訂單金額判定；等於可以。未達時整筆拒絕，reason 固定為 `MIN_ORDER_NOT_MET` |
| H10 | 必問 | 沒傳任何券時？ | 成功。finalAmount = orderAmount，discount = 0，applied = [] |
| H11 | 必問 | 同一張券（同 tenantId + code）傳兩次？ | 整筆拒絕。reason 固定為 `DUPLICATE_COUPON` |
| H12 | 必問 | orderAmount 為 0、負數或非整數時？ | 拒絕，reason 固定為 `INVALID_INPUT` |
| H13 | 必問 | 券本身的值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）？ | 拒絕，reason 固定為 `INVALID_COUPON` |
| H14 | 必問 | 多個錯誤同時發生的檢查順序？ | `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的 |
| T-a | 陷阱 | （需求有寫）百分比以折扣前金額計算 | 不該問 |
| T-b | 陷阱 | （需求有寫）不可疊加的券一張訂單只能一張 | 不該問單張不可疊加能不能用：可以 |
| T-c | 陷阱 | （需求有寫）applied 依傳入順序 | 不該問 |

回答規則：
- 問到表上的洞，照標準答案回答，不加油添醋。
- 問到表上沒有的業務問題，一律回答「你決定，照你的最佳判斷」並記錄該題。技術環境問題照專案實況回答。
- 不主動提示、不糾正、不要求補測試。
