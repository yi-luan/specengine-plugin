# BENCH-LOG — T3-B-r3（GitHub Spec Kit）

## 時間

- 開始：2026-10-20 15:29:20
- 第 1 次暫停提問（speckit-specify）：2026-10-20 15:31:10
- 第 1 次被喚醒：2026-10-20 15:31:32
- 第 2 次暫停提問（speckit-clarify）：2026-10-20 15:32:41
- 第 2 次被喚醒：2026-10-20 15:33:11
- 第 3 次暫停提問（speckit-clarify C2 追問）：2026-10-20 15:33:59
- 第 3 次被喚醒：2026-10-20 15:34:34
- 結束：2026-10-20 15:40:31

## Skill 完成摘要

- speckit-constitution：建立 constitution v1.0.0（TypeScript strict、cucumber-js、`npm test` 單一入口、src/ 與 tests/ 版面、純函式/簡潔）。無 extensions.yml，無 hook。
- speckit-specify：建立 specs/001-multi-tenant-coupons/spec.md 與 checklists/requirements.md；3 個 [NEEDS CLARIFICATION] 經需求方回覆後寫回（FR-004、FR-014、FR-015、US2/US3 情境、Edge Cases），checklist 16/16 通過。
- speckit-clarify：5 題（一次列出）+ C2 追問 3 小題（skill 規定答案有歧義時追問、不另計題數）。寫入 Clarifications 段落，新增/修訂 FR-003/006/007/016–021、Edge Cases、Assumptions、US1 情境。Checklist 16/16 → 16/16。
- speckit-plan：plan.md（Constitution Check 全 PASS、無 Complexity Tracking）、research.md（R1–R7）、data-model.md（欄位驗證 + 8 個 reason 優先序表）、contracts/apply-coupons.md、quickstart.md。
- speckit-tasks：tasks.md 14 個 task（Setup 1、Foundational 3、US1 2、US2 3、US3 2、Polish 3）。
- speckit-implement（第 1 輪）：src/coupon.ts、src/index.ts re-export、tests/steps/coupon.steps.ts、tests/features/us1/us2/us3 三個 feature。US1、US2 先確認紅燈（US1 7 failed；US2 41 failed，0 undefined）再轉綠。US3 的 feature 一寫完就是綠的，因為 US2 實作已經涵蓋疊加規則，沒有經過紅燈。.gitignore 補上 dist/、build/、*.log、.env*。npm test 64/64 綠、typecheck 通過。
- speckit-converge 第 1 輪：2 個 finding，append Phase 7（T015 partial：FR-019/020 tenantId 非字串沒有情境；T016 unrequested：src/coupon.ts 多 export 了 REASONS/Reason）。
- speckit-implement（第 2 輪）：補 2 個情境、取消多餘的 export。npm test 66/66 綠、typecheck 通過。
- speckit-converge 第 2 輪：0 finding → ✅ Converged（tasks.md 沒有再修改）。

## 問答原文

### speckit-specify（3 題）

Q1 失敗語意：一張券不符合條件時，整筆結帳是全部失敗並回傳原因（all-or-nothing），還是略過該券、其餘合格券照常套用？
  A 全部失敗 / B 略過不合格券、其餘照套（全部不合格時才失敗）/ C 略過不合格券、全部不合格仍回成功（折扣 0）
Q2 不可疊加券與可疊加券能否混用？
  A 可以（最多一張不可疊加 + 任意張可疊加）/ B 不行，不可疊加券必須單獨使用 / C 混用時只套用不可疊加那張
Q3 百分比折扣出現小數時的整數化：A 無條件捨去 / B 四捨五入 / C 無條件進位

需求方回覆（原文）：
Q1: A。整筆拒絕。跨租戶 reason 固定為 `TENANT_MISMATCH`；過期或尚未生效 reason 固定為 `COUPON_EXPIRED`（未生效也用同一代碼）；未達最低消費 reason 固定為 `MIN_ORDER_NOT_MET`；違反疊加規則 reason `NOT_STACKABLE`。
Q2: B。整筆拒絕，不可疊加的券只能單獨用。reason `NOT_STACKABLE`。
Q3: A。每張 PERCENT 的折扣額各自無條件捨去取整數。

### speckit-clarify（5 題，一次列出）

C1 有效期間的起訖時間點本身算不算有效？（推薦 A：兩端都含）A 兩端都含 / B 含起不含迄 / C 兩端都不含
C2 一筆請求同時違反多條規則時回傳哪個 reason？（推薦 A）A 先檢查疊加規則，再依傳入順序逐張檢查 租戶→期間→最低消費，回傳第一個違規 / B 依傳入順序逐張檢查，疊加規則最後 / C 全請求依類別優先序 TENANT_MISMATCH > COUPON_EXPIRED > MIN_ORDER_NOT_MET > NOT_STACKABLE
C3 同一請求重複傳入同一代碼怎麼處理？（推薦 A）A 整筆拒絕，reason `DUPLICATE_COUPON` / B 只套一次 / C 照疊加規則處理（可疊加就套兩次）
C4 沒有傳任何優惠券時回什麼？（推薦 A）A 成功：折扣 0、金額不變、applied 空 / B 失敗，reason `NO_COUPON`
C5 最低消費用哪個金額判斷？（推薦 A）A 折扣前訂單金額 / B 套用前面券之後的剩餘金額

需求方回覆（原文）：
C1: A。都算有效（含頭含尾）。以時間戳比較：validFrom ≤ now ≤ validTo。
C2: 自訂順序：`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。
C3: A。整筆拒絕，reason 固定為 `DUPLICATE_COUPON`。
C4: A。成功。finalAmount = orderAmount，discount = 0，applied = []。
C5: A。以折扣前訂單金額判定；等於可以。未達時整筆拒絕，reason 固定為 `MIN_ORDER_NOT_MET`。

### speckit-clarify C2 追問（skill 規定：答案有歧義時追問，仍算同一題）

C2 的答案帶進 3 個之前沒定義的代碼，追問 3 個小題：
C2-a `DISCOUNT_EXCEEDS_AMOUNT` 什麼時候觸發？（推薦 B）A 總折扣 > 訂單金額就整筆拒絕（FIXED 300 用在 100 元訂單 → 失敗）/ B FIXED 夾到剩餘金額不報錯，只有 PERCENT 合計 > 100% 時才報 / C 一律夾到 0，這個代碼只保留不用
C2-b `INVALID_INPUT` 包含哪些？（推薦 A）A orderAmount 不是 ≥0 的整數、tenantId 空、now 無法解析、coupons 不是陣列 / B 只有 orderAmount 不合法
C2-c `INVALID_COUPON` 包含哪些？（推薦 A）A type 不合法、value 不是正整數、PERCENT value > 100、validFrom/validTo 無法解析或 from > to、minOrderAmount 不是 ≥0 的整數、code 空 / B 只有 type 或 value 不合法

需求方回覆（原文）：
C2-a: A。折扣總額超過訂單金額時整筆拒絕，reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。總折扣剛好等於訂單金額可以，finalAmount = 0。
C2-b: orderAmount 為 0、負數或非整數時拒絕，reason 固定為 `INVALID_INPUT`。其他欄位（tenantId、now、coupons 型別）你決定，照你的最佳判斷。
C2-c: 券本身的值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）拒絕，reason 固定為 `INVALID_COUPON`。其他欄位（時間、minOrderAmount、code）你決定，照你的最佳判斷。

## 自行決定的假設（一行一個）

- 呼叫端提供 now，函式不讀系統時鐘。
- 優惠券資料由呼叫端隨請求傳入，函式不負責儲存或查詢。
- 「同租戶代碼唯一」由優惠券管理端保證；函式只檢查同一請求內有沒有重複（以代碼字串完全相同、區分大小寫判斷）。
- INVALID_INPUT 另外包含：tenantId 非字串或空字串、now 無法用 Date.parse 解析、coupons 不是陣列（需求方授權）。
- INVALID_COUPON 另外包含：type 不是 PERCENT/FIXED、tenantId 非字串、code 非字串或空字串、陣列元素不是物件、validFrom/validTo 無法解析或 validFrom > validTo、minOrderAmount 有設定但不是 ≥0 整數、stackable 不是布林（需求方授權）。
- 非整數的 value（例如 PERCENT 10.5）歸為 INVALID_COUPON。
- minOrderAmount = 0 視為沒有限制（合法）。
- 優先序以「類別」為單位套用到整個請求（先檢查所有券是否命中前面的類別），不是逐張券檢查。
- 時間比較用 Date.parse 轉成毫秒時間戳，所以不同時區的寫法可以正確比較。
- 純函式不修改輸入物件。
- 測試 feature 檔放 tests/features/（cucumber.cjs 已設定這個路徑），一個 user story 一個檔；steps 共用 tests/steps/coupon.steps.ts。
- clarify 的 5 題一次列出（使用者的指示允許），沒有照 skill 的「一次一題」。

## Converge 輪數

- 2 輪（第 1 輪 append 2 個 task → implement 第 2 輪 → 第 2 輪 Converged）。

## npm test 最終結果

- 66 scenarios (66 passed)、268 steps (268 passed)；`npm run typecheck` 通過。

## 工具錯誤

- 沒有工具呼叫失敗。
- IDE 的 cucumber 擴充功能把 feature 步驟標成 "Undefined step"（IDE 沒有讀 cucumber.cjs 的設定）。實際跑 `npm test` 沒有 undefined 步驟，這個警告可以忽略。
