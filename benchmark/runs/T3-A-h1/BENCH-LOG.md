# BENCH-LOG T3-A-h1

開始時間：2026-10-31 23:24:14

## 假設

- 有效期間含起訖兩端：validFrom <= now <= validTo 才可用。
- 不可疊加的定義：只要一次傳入的優惠券中有不可疊加者且總數超過 1 張，即失敗 NON_STACKABLE_CONFLICT（與可疊加券混用也失敗）。
- 失敗策略：傳入的任一張不合格即整體失敗（不略過該張，其餘照常套用）。
- 未傳入任何優惠券（空陣列）視為成功：finalAmount = orderAmount、discount = 0、applied = []。
- 同一次傳入中代碼重複 → 失敗 DUPLICATE_CODE。代碼在租戶內唯一的全域檢查無法在純函式內做，只檢查同次輸入。
- 百分比折扣計算為 floor(折扣前金額 * 百分比 / 100)，無條件捨去到整數元。
- 依傳入順序套用；每張折扣不超過剩餘金額（折扣後金額不為負）。百分比仍以折扣前金額計算，但多張合計超過時截至 0。
- 折扣金額為 0 的優惠券（例如金額已用完後才輪到它）不列入 applied，視為未實際套用。
- 最低消費以折扣前訂單金額比較，等於門檻即可使用。
- PERCENT 的 value 必須為 0–100 的整數；FIXED 的 value 必須為非負整數；minOrderAmount 若設定須為非負整數；不合規或日期無法解析 → INVALID_COUPON。
- 訂單金額必須為非負整數，否則 INVALID_ORDER_AMOUNT；now 無法解析 → INVALID_NOW。
- 失敗原因採代碼字串（TENANT_MISMATCH、NOT_YET_VALID、EXPIRED、BELOW_MIN_ORDER、NON_STACKABLE_CONFLICT、DUPLICATE_CODE、INVALID_COUPON、INVALID_ORDER_AMOUNT、INVALID_NOW），不使用中文句子，方便呼叫端判斷。
- 租戶檢查只比對優惠券的 tenantId 與輸入的 tenantId，不做資料庫查找（純函式）。
- 檢查順序：訂單金額與 now → 同次輸入代碼重複 → 逐張（租戶、格式、有效期間、最低消費）→ 不可疊加衝突 → 計算。
- Gherkin 使用預設英文關鍵字，步驟與情境文字為繁體中文。

## 產出檔案

- src/coupon.ts（applyCoupons 與型別）
- tests/features/coupon.feature（18 個情境）
- tests/steps/coupon.steps.ts（step definitions，Before 每情境重置狀態）
- BENCH-LOG.md

## npm test 摘要

- 18 scenarios (18 passed)，93 steps (93 passed)
- npm run typecheck 通過

## 工具錯誤

無。

結束時間：2026-10-31 23:25:48
