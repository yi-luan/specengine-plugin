# Tasks: 多租戶優惠券

**Input**: `specs/001-multi-tenant-coupon/`（plan.md、spec.md、research.md、data-model.md、contracts/、quickstart.md）

**Prerequisites**: plan.md（必要）、spec.md（必要）、research.md、data-model.md、contracts/apply-coupons.md、quickstart.md

**Tests**: 本功能需要測試。依 constitution II、III，每個使用者故事都先寫 Gherkin 情境與 step definitions，確認紅燈後才實作。

**Organization**: 依使用者故事分組，每個故事可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無相依）
- **[Story]**: 對應 spec.md 的使用者故事（US1、US2、US3）

## Path Conventions

- 產品碼：`src/coupon.ts`
- Gherkin：`tests/features/coupon.feature`
- Step definitions：`tests/steps/coupon.steps.ts`
- 共用測試工具：`tests/support/coupon-builders.ts`

---

## Phase 1: Setup（共用基礎）

**Purpose**: 建立型別與函式骨架，讓型別檢查與測試執行可以開始。

- [X] T001 建立 `src/coupon.ts`：匯出 `Coupon`、`ApplyInput`、`ApplyResult`（形狀完全依 spec 技術介面，不可更名），並加入 `applyCoupons` 的骨架，內容為 `throw new Error('not implemented')`
- [X] T002 確認 `npm run typecheck` 在骨架狀態下通過，且 `npm test` 可以啟動（尚無情境時不應報錯）

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 測試建構工具，供所有故事的 step definitions 共用。

**⚠️ CRITICAL**: 所有使用者故事的測試都依賴此階段完成。

- [X] T003 [P] 在 `tests/support/coupon-builders.ts` 建立測試資料建構函式（預設租戶、預設有效期間、預設 `now`，並可覆寫任一欄位），型別取自 `src/coupon.ts`

**Checkpoint**: 測試工具就緒，可開始各故事。

---

## Phase 3: User Story 1 - 單張優惠券結帳套用 (Priority: P1) 🎯 MVP

**Goal**: 單張優惠券可依租戶、有效期間、最低消費判斷是否套用，並回傳折扣後金額、折扣總額與套用代碼；失敗時回傳原因。

**Independent Test**: 以單張券執行 spec US1 的五個 Acceptance Scenarios，結果與失敗代碼皆符合。

### Tests for User Story 1（先寫，必須先紅燈）

- [X] T004 [US1] 在 `tests/features/coupon.feature` 撰寫 US1 情境：10% 券（1000 → 900）、固定 300 元券（1000 → 700）、過期（`COUPON_EXPIRED`）、未達最低消費（`MIN_ORDER_NOT_MET`）、跨租戶（`TENANT_MISMATCH`）、起迄含頭含尾（`validFrom ≤ now ≤ validTo`）、最低消費恰等於訂單金額可用、沒有提交任何券（無折扣）
- [X] T005 [US1] 在 `tests/steps/coupon.steps.ts` 實作 US1 所需的 step definitions，執行 `npm test` 確認 T004 的情境為紅燈

### Implementation for User Story 1

- [X] T006 [US1] 在 `src/coupon.ts` 實作 `applyCoupons` 的單張券路徑：`TENANT_MISMATCH`、`COUPON_EXPIRED`（起迄含）、`MIN_ORDER_NOT_MET`、PERCENT 與 FIXED 的折扣計算（PERCENT 為 `Math.floor(orderAmount * value / 100)`，見 research.md 第 1 節），成功時回傳 `{ ok: true, finalAmount, discount, applied }`
- [X] T007 [US1] 在 `src/coupon.ts` 實作沒有提交任何券時的成功結果（`finalAmount = orderAmount`、`discount = 0`、`applied = []`）

**Checkpoint**: US1 的所有情境綠燈，單張券可獨立使用。

---

## Phase 4: User Story 2 - 多張優惠券合併計算 (Priority: P2)

**Goal**: 多張可疊加券可同時套用；不可疊加券只能單獨使用；重複提交與批次規則依 Clarifications 的答覆執行。

**Independent Test**: 執行 spec US2 的四個 Acceptance Scenarios，並加上 `NOT_STACKABLE`、`DUPLICATE_COUPON` 與 FR-013 的情境。

### Tests for User Story 2（先寫，必須先紅燈）

- [X] T008 [US2] 在 `tests/features/coupon.feature` 撰寫 US2 情境：10% + 固定 100 元（1000 → 800，折扣 200）、兩張不可疊加券（`NOT_STACKABLE`）、不可疊加券與可疊加券混用（`NOT_STACKABLE`）、同一券重複提交（`DUPLICATE_COUPON`）、多券任一失敗整筆拒絕且回傳第一張失敗券的原因、`applied` 依傳入順序、800 + 500 固定券（1000 → 0，折扣 1000）
- [X] T009 [US2] 在 `tests/steps/coupon.steps.ts` 實作 US2 所需的 step definitions，執行 `npm test` 確認 T008 的情境為紅燈

### Implementation for User Story 2

- [X] T010 [US2] 在 `src/coupon.ts` 實作批次檢查：`DUPLICATE_COUPON`（同 tenantId + code 出現兩次）與 `NOT_STACKABLE`（含不可疊加券且張數大於 1）；判定順序見 research.md 第 2 節
- [X] T011 [US2] 在 `src/coupon.ts` 實作多券合併：每張券以折扣前金額計算（FR-010）、折扣總額 = min(加總, orderAmount)、`applied` 依傳入順序、失敗時回傳第一張失敗券的原因（FR-013）

**Checkpoint**: US1 與 US2 皆綠燈。

---

## Phase 5: User Story 3 - 固定金額與金額規則 (Priority: P3)

**Goal**: 固定金額折扣不使訂單金額低於 0；所有金額為整數；券值不合法時回傳 `INVALID_COUPON`。

**Independent Test**: 執行 spec US3 的兩個 Acceptance Scenarios，以及券值不合法的情境。

### Tests for User Story 3（先寫，必須先紅燈）

- [X] T012 [US3] 在 `tests/features/coupon.feature` 撰寫 US3 情境：固定 1500 元券對 1000 元訂單（折扣後 0、折扣 1000）、PERCENT 為 0、101、非整數時 `INVALID_COUPON`、FIXED 為 0 或負數時 `INVALID_COUPON`、非整數 value 時 `INVALID_COUPON`
- [X] T013 [US3] 在 `tests/steps/coupon.steps.ts` 實作 US3 所需的 step definitions，執行 `npm test` 確認 T012 的情境為紅燈

### Implementation for User Story 3

- [X] T014 [US3] 在 `src/coupon.ts` 實作券值驗證 `INVALID_COUPON`（PERCENT 不在 1–100、FIXED ≤ 0、非整數），並將其放在個別券檢查的第一順位（research.md 第 2 節）
- [X] T015 [US3] 在 `src/coupon.ts` 確認 FIXED 折扣與總額上限不使 `finalAmount` 低於 0，且所有金額皆為整數；`orderAmount` 非整數或為負時拋出例外（research.md 第 6 節）

**Checkpoint**: 三個故事皆綠燈。

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 整體驗證。

- [X] T016 [P] 執行 `npm run typecheck`，修正所有型別錯誤
- [X] T017 執行 `npm test`，確認所有情境全綠、無失敗情境
- [X] T018 依 `specs/001-multi-tenant-coupon/quickstart.md` 第 3 節抽查三個範例結果

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始
- **Foundational (Phase 2)**: 依賴 Phase 1，阻塞所有使用者故事
- **User Stories (Phase 3–5)**: 皆依賴 Phase 2；建議依優先序 P1 → P2 → P3 執行，因為 US2、US3 的實作會擴充 US1 的 `applyCoupons`
- **Polish (Phase N)**: 依賴所有故事完成

### Within Each User Story

- 情境與 step definitions 先寫，`npm test` 必須先紅燈
- 實作後 `npm test` 必須綠燈，才可進入下一故事

### Parallel Opportunities

- T016 與其他 Polish 任務可在完成所有故事後平行執行（實際為單一檔案 `src/coupon.ts` 為主，平行性有限）
- 同一故事內的實作任務共用 `src/coupon.ts`，不可平行執行

---

## Implementation Strategy

### MVP First（US1 only）

1. 完成 Phase 1 與 Phase 2
2. 完成 Phase 3（US1）
3. 停下來驗證 US1 獨立可用

### Incremental Delivery

1. Setup + Foundational
2. US1（MVP）→ 驗證
3. US2 → 驗證
4. US3 → 驗證
5. Polish → 全綠

---

## Notes

- 每個故事的情境必須先紅燈再實作（constitution III）
- 所有金額為整數元（constitution V、FR-012）
- 失敗以 `{ ok: false, reason }` 回傳，不拋出例外（constitution V；例外僅限程式錯誤，見 research.md 第 6 節）
- `COUPON_NOT_FOUND` 不由本函式產生，不需要對應的任務（見 research.md 第 3 節）
