---

description: "Task list for 多租戶優惠券 implementation"
---

# Tasks: 多租戶優惠券（Multi-Tenant Coupons）

**Input**: Design documents from `/specs/001-multi-tenant-coupons/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/apply-coupons.md, quickstart.md

**Tests**: 憲章原則 II 要求 TDD（cucumber-js Gherkin），每個 story 先寫 feature 再實作。

**Organization**: 依 user story 分組。

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 確認 `cucumber.cjs` 會載入 `tests/features/**/*.feature` 與 `tests/steps/**/*.ts`，並建立 `tests/features/` 目錄

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T002 在 `src/coupon.ts` 宣告固定介面型別 `Coupon`、`ApplyInput`、`ApplyResult` 與 `applyCoupons` 簽章（照 contracts/apply-coupons.md，不可更名），先回傳暫時結果
- [X] T003 在 `src/index.ts` re-export `src/coupon.ts`
- [X] T004 在 `tests/steps/coupon.steps.ts` 建立共用 Step Definitions：租戶／訂單金額／now 的 Given、以 Data Table 定義券（欄位 tenantId, code, type, value, validFrom, validTo, stackable, minOrderAmount）、When 結帳套用、Then 成功（finalAmount、discount、applied）與 Then 失敗（reason）

**Checkpoint**: 型別與步驟就緒

---

## Phase 3: User Story 1 - 單張優惠券結帳 (Priority: P1) 🎯 MVP

**Goal**: 單張 PERCENT／FIXED 券的金額計算、空券清單。

**Independent Test**: `npm test` 跑 `tests/features/us1-single-coupon.feature` 全綠。

- [X] T005 [US1] 撰寫 `tests/features/us1-single-coupon.feature`：PERCENT 10%（1000→900）、FIXED 150（1000→850）、FIXED 100 對 100 元（final 0）、PERCENT 15% 對 333 元（discount 49，「每張 PERCENT 券的折扣額各自無條件捨去」）、空券清單（final = orderAmount、discount 0、applied []）；確認紅燈
- [X] T006 [US1] 在 `src/coupon.ts` 實作計算：PERCENT 折扣 = floor(orderAmount × value / 100)，FIXED 折扣 = value，discount = 加總，finalAmount = orderAmount − discount，applied 依傳入順序

**Checkpoint**: US1 綠燈

---

## Phase 4: User Story 2 - 使用條件檢查與失敗原因 (Priority: P1)

**Goal**: all-or-nothing 驗證與 8 種 reason、優先序。

**Independent Test**: `tests/features/us2-validation.feature` 全綠。

- [X] T007 [US2] 撰寫 `tests/features/us2-validation.feature`：
  - `INVALID_INPUT`：「orderAmount 為 0、負數或非整數」；tenantId 空字串；now 無法解析；coupons 不是陣列
  - `INVALID_COUPON`：「PERCENT 不在 1～100、FIXED ≤ 0、非整數」；type 不合法；code 空；validFrom > validTo；日期無法解析；minOrderAmount 負數；stackable 非布林
  - `TENANT_MISMATCH`（含一張合格＋一張跨租戶仍整筆拒絕）
  - `DUPLICATE_COUPON`
  - `COUPON_EXPIRED`：過期、尚未生效；邊界 now = validFrom、now = validTo 成功（「validFrom ≤ now ≤ validTo」）
  - `MIN_ORDER_NOT_MET`：499 < 500 拒絕；500 = 500 成功（「以折扣前訂單金額判定；等於可以」）
  - `DISCOUNT_EXCEEDS_AMOUNT`：FIXED 300 對 100 元
  - 優先序：INVALID_COUPON 優先於 TENANT_MISMATCH、TENANT_MISMATCH 優先於 COUPON_EXPIRED、DUPLICATE 優先於 EXPIRED、EXPIRED 優先於 MIN_ORDER、MIN_ORDER 優先於 NOT_STACKABLE、NOT_STACKABLE 優先於 DISCOUNT_EXCEEDS_AMOUNT、INVALID_INPUT 優先於全部
  - 確認紅燈
- [X] T008 [US2] 在 `src/coupon.ts` 實作 `validateInput`（INVALID_INPUT）與 `validateCoupon`（INVALID_COUPON），依 data-model.md 驗證規則
- [X] T009 [US2] 在 `src/coupon.ts` 依 FR-016 類別順序逐層檢查整個請求：TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED（Date.parse 時間戳，含頭含尾）→ MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT（加總 > orderAmount）

**Checkpoint**: US1 + US2 綠燈

---

## Phase 5: User Story 3 - 多張優惠券疊加 (Priority: P2)

**Goal**: 可疊加券多張並用、不可疊加券只能單獨用。

**Independent Test**: `tests/features/us3-stacking.feature` 全綠。

- [X] T010 [US3] 撰寫 `tests/features/us3-stacking.feature`：S10 + S50（1000→850、applied 依傳入順序）、PERCENT 10% + 20% 皆以 1000 計算（→700）、各自捨去（333 元 10%+15%：33+49=82）、兩張不可疊加 `NOT_STACKABLE`、不可疊加＋可疊加 `NOT_STACKABLE`、單張不可疊加成功、多張疊加總和剛好等於訂單金額成功、超過則 `DISCOUNT_EXCEEDS_AMOUNT`
- [X] T011 [US3] 在 `src/coupon.ts` 確認疊加規則「券數 > 1 且任一張 stackable = false → NOT_STACKABLE」，以及多券加總與 applied 順序

**Checkpoint**: 全部 story 綠燈

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T012 執行 `npm run typecheck` 並修正型別錯誤
- [X] T013 執行 `npm test` 確認 0 failed／undefined／pending，對照 quickstart.md
- [X] T014 確認 `applyCoupons` 不修改輸入物件（純函式），並在 `tests/features/us1-single-coupon.feature` 加一個情境驗證輸入未被修改

---

## Dependencies & Execution Order

- Setup（T001）→ Foundational（T002–T004）→ US1（T005–T006）→ US2（T007–T009）→ US3（T010–T011）→ Polish（T012–T014）
- 同一檔案 `src/coupon.ts` 由多個 task 修改，因此 story 之間依序執行；各 story 的 feature 檔彼此獨立。

## Parallel Example

- T005、T007、T010（三個不同的 feature 檔）在 T004 完成後可以平行撰寫。

## Implementation Strategy

- MVP = US1（單券計算）。接著 US2 補上驗證與 reason，最後 US3 疊加。每個 checkpoint 都跑 `npm test`。

## Phase 7: Convergence

- [X] T015 Add acceptance scenarios in tests/features/us2-validation.feature for request tenantId that is not a string (`INVALID_INPUT`) and coupon tenantId that is not a string (`INVALID_COUPON`) per FR-019, FR-020 (partial)
- [X] T016 Stop exporting `REASONS` / `Reason` from src/coupon.ts so the public surface matches contracts/apply-coupons.md exactly (keep them module-internal) per plan: contracts/apply-coupons.md, Constitution V (unrequested)
