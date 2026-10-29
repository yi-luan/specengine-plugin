# BENCH-LOG（T3-A-r1：多租戶優惠券）

## 時間

- 開始時間：2026-10-20 07:43:47
- 中斷：約 07:47（session 意外結束；實作與測試已完成，尚未寫本檔與 commit）
- 恢復時間：2026-10-20 07:51:40
- 結束時間：2026-10-20 07:52:02

## 假設（需求未講清楚之處與我的決定）

1. 任一張傳入的優惠券無法套用時，整筆要失敗還是跳過該張繼續？→ 採「全有或全無」：任一張不可套用即回傳 `ok:false`，不會默默跳過；成功時 `applied` 即為全部傳入代碼（依傳入順序）。
2. 失敗原因的格式？→ `reason` 為「代碼: 說明」字串，代碼固定（`INVALID_INPUT`、`INVALID_COUPON`、`DUPLICATE_CODE`、`TENANT_MISMATCH`、`NOT_YET_VALID`、`EXPIRED`、`MIN_ORDER_NOT_MET`、`NOT_STACKABLE`），並另以 `ReasonCode` 常數匯出供程式判斷；說明為繁體中文並帶出有問題的優惠券代碼。
3. 多張券同時有問題時回傳哪個原因？→ 依檢查順序回傳第一個：輸入合法性 → 代碼重複 → 逐張（欄位合法性、租戶、有效期間、最低消費，依傳入順序）→ 疊加規則。
4. 「不可疊加」是否可與「可疊加」的券同時使用？→ 不可。不可疊加的券必須是該訂單唯一的一張；只要券數 > 1 且其中有任一張不可疊加，即回傳 `NOT_STACKABLE`（指出第一張不可疊加的券）。
5. 固定金額折扣會使訂單金額低於 0 時，是失敗還是封頂？→ 封頂：折扣總額以訂單金額為上限，折扣後金額最低為 0，不視為失敗。多張 FIXED 依傳入順序扣減，後面的券只能扣剩餘金額。
6. 百分比折扣的零頭如何處理？→ 以折扣前訂單金額 × 百分比 ÷ 100 後無條件捨去（Math.floor），保證整數元；多張百分比券各自以原始訂單金額計算後相加。
7. 有效期間邊界是否包含？→ 兩端皆包含：`validFrom <= now <= validTo`（以 `Date.parse` 比對毫秒）。
8. 最低消費以折扣前還是折扣後金額判斷？→ 以折扣前的原始 `orderAmount` 判斷，`orderAmount >= minOrderAmount` 即可用。
9. 同一代碼在同一次結帳重複傳入？→ 視為錯誤回傳 `DUPLICATE_CODE`（同租戶代碼唯一，一張券不得用兩次）。
10. 未傳入任何優惠券？→ 成功，`finalAmount = orderAmount`、`discount = 0`、`applied = []`。
11. 輸入合法性檢查範圍？→ `tenantId` 須為非空字串、`orderAmount` 須為非負整數、`now` 與 `validFrom`/`validTo` 須為可解析的 ISO 8601、`validFrom` 不得晚於 `validTo`、`value` 與 `minOrderAmount` 須為非負整數、PERCENT 的 `value` 不得超過 100、`type`/`stackable` 型別須正確；不合者回 `INVALID_INPUT`（輸入層）或 `INVALID_COUPON`（券層）。
12. `value` 為 0 的券？→ 視為合法，折扣 0 元，仍列入 `applied`。
13. 租戶比對方式？→ `coupon.tenantId === input.tenantId` 嚴格相等（區分大小寫，不做 trim）。

## 產出檔案

- `src/coupon.ts`：`Coupon`/`ApplyInput`/`ApplyResult` 型別、`ReasonCode` 常數、`applyCoupons` 純函式。
- `tests/features/coupon.feature`：25 個 scenario（基本套用、租戶隔離、有效期間含邊界、疊加規則、金額下限、最低消費、代碼唯一、失敗順序、輸入合法性）。
- `tests/steps/coupon.steps.ts`：Step Definitions。
- `tests/support/world.ts`：Cucumber World。
- `BENCH-LOG.md`：本檔。

## 測試結果

`npm test`：25 scenarios (25 passed)、147 steps (147 passed)；`npx tsc --noEmit` 無錯誤。

## 遇到的工具錯誤

- 無工具錯誤。session 曾於約 07:47 意外中斷一次，恢復後確認檔案完整、重跑測試全綠後補寫本檔並 commit。
