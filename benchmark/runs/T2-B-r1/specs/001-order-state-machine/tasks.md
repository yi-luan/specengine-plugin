---

description: "Task list for 訂單狀態機（Order State Machine）"
---

# Tasks: 訂單狀態機（Order State Machine）

**Input**: Design documents from `/specs/001-order-state-machine/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 本功能明確要求測試（constitution 原則 II/III/IV：Gherkin + cucumber-js，`npm test` 唯一關卡，先紅後綠），因此每個 User Story 都包含測試任務，且測試任務必須先於實作完成並觀察到失敗。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root（依 plan.md）

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 確認既有測試基礎設施可用，建立測試目錄骨架

- [X] T001 確認 `npm test`（cucumber-js）與 `npm run typecheck` 在空專案可執行（0 scenarios），記錄基線
- [X] T002 [P] 建立 `tests/support/world.ts`：自訂 World（`order?: Order`、`snapshot?: Order`、`result?: OrderResult`），以 `setWorldConstructor` 註冊
- [X] T003 [P] 建立 `tests/features/order-state-machine.feature` 檔頭（`# language: zh-TW` 或英文關鍵字）與 Feature 標題，暫無情境

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 固定介面型別與失敗代碼，所有 User Story 都依賴

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 在 `src/order.ts` 逐字宣告固定介面：`OrderStatus = 'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED'`、`Order { id: string; status: OrderStatus; amount: number; paidAmount: number; refundedAmount: number }`、`OrderResult = { ok: true; order: Order } | { ok: false; reason: string }`，以及五個函式的簽名（先回傳 `{ ok: false, reason: 'NOT_IMPLEMENTED' }` 骨架）
- [X] T005 在 `src/order.ts` 新增 `export const REASONS = { INVALID_AMOUNT, AMOUNT_MISMATCH, INVALID_TRANSITION, REFUND_EXCEEDS_PAID } as const` 與內部 helper `isValidAmount(n) = Number.isInteger(n) && n > 0`、`ok(order)`、`fail(reason)`
- [X] T006 更新 `src/index.ts` 為 `export * from './order.js'`
- [X] T007 在 `tests/steps/order.steps.ts` 建立共用步驟：`Given 一筆狀態為 {word}、金額 {int}、已付 {int}、已退 {int} 的訂單`（直接建構 Order 物件）、每個 When 前以 `structuredClone` 存 snapshot、`Then 操作成功且訂單狀態為 {word}`、`Then 操作失敗且原因為 {word}`、`Then 傳入的訂單未被修改`、`Then 訂單的 amount 為 {int}、paidAmount 為 {int}、refundedAmount 為 {int}`（斷言用 `node:assert/strict`）

**Checkpoint**: `npm run typecheck` 通過；`npm test` 可載入 steps（0 scenarios 或全部紅燈）

---

## Phase 3: User Story 1 - 建立訂單並付款 (Priority: P1) 🎯 MVP

**Goal**: `createOrder` 與 `pay` 依 FR-001～FR-004、FR-011～FR-015 運作

**Independent Test**: 金額 ≤ 0 / 非整數建單失敗（`INVALID_AMOUNT`）；付款金額 ≠ 訂單金額失敗（`AMOUNT_MISMATCH`）；正確付款後狀態 `PAID`、paidAmount = amount；非 CREATED 付款失敗（`INVALID_TRANSITION`）

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求1 建立訂單` 情境：金額 100 成功（CREATED/100/0/0）、金額 0 失敗 `INVALID_AMOUNT`、金額 -5 失敗 `INVALID_AMOUNT`、金額 10.5 失敗 `INVALID_AMOUNT`
- [X] T009 [P] [US1] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求2 付款` 情境：CREATED 付 100 成功 → PAID/paidAmount 100；付 99 失敗 `AMOUNT_MISMATCH`；付 101 失敗 `AMOUNT_MISMATCH`；付 0 失敗 `INVALID_AMOUNT`；PAID 再付 100 失敗 `INVALID_TRANSITION`；CANCELLED 付 -1 失敗 `INVALID_TRANSITION`（驗證判定順序）；每個失敗情境加 `傳入的訂單未被修改`
- [X] T010 [US1] 在 `tests/steps/order.steps.ts` 新增 `When 以 id {string}、金額 {int} 建立訂單`、`When 以 id {string}、金額 {float} 建立訂單`、`When 付款 {int}` 步驟；執行 `npm test` 確認 US1 情境全部紅燈

### Implementation for User Story 1

- [X] T011 [US1] 在 `src/order.ts` 實作 `createOrder(id, amount)`：`isValidAmount` 不通過 → `INVALID_AMOUNT`；否則回傳 `{ id, status: 'CREATED', amount, paidAmount: 0, refundedAmount: 0 }`（id 不驗證）
- [X] T012 [US1] 在 `src/order.ts` 實作 `pay(order, amount)`：status ≠ CREATED → `INVALID_TRANSITION`；`!isValidAmount(amount)` → `INVALID_AMOUNT`；`amount !== order.amount` → `AMOUNT_MISMATCH`；否則 `{ ...order, status: 'PAID', paidAmount: amount }`
- [X] T013 [US1] 執行 `npm test` 與 `npm run typecheck`，US1 情境全綠

**Checkpoint**: User Story 1 可獨立交付（可建單、可收款）

---

## Phase 4: User Story 2 - 出貨 (Priority: P2)

**Goal**: `ship` 依 FR-005 運作

**Independent Test**: PAID 出貨 → SHIPPED，金額欄位不變；CREATED / SHIPPED / CANCELLED / REFUNDED 出貨失敗 `INVALID_TRANSITION`

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求3 出貨` 情境：PAID 出貨成功 → SHIPPED 且 amount/paidAmount/refundedAmount 不變；CREATED 出貨失敗 `INVALID_TRANSITION`；SHIPPED 再出貨失敗 `INVALID_TRANSITION`
- [X] T015 [US2] 在 `tests/steps/order.steps.ts` 新增 `When 出貨` 步驟；執行 `npm test` 確認 US2 情境紅燈

### Implementation for User Story 2

- [X] T016 [US2] 在 `src/order.ts` 實作 `ship(order)`：status ≠ PAID → `INVALID_TRANSITION`；否則 `{ ...order, status: 'SHIPPED' }`
- [X] T017 [US2] 執行 `npm test`，US1+US2 全綠

**Checkpoint**: User Stories 1 AND 2 皆可獨立驗證

---

## Phase 5: User Story 3 - 取消訂單（含已付款退還） (Priority: P2)

**Goal**: `cancel` 依 FR-006、FR-007 運作

**Independent Test**: CREATED 取消 → CANCELLED/paid 0/refunded 0；PAID(paid 100) 取消 → CANCELLED/paid 100/refunded 100；SHIPPED / CANCELLED / REFUNDED 取消失敗 `INVALID_TRANSITION`

### Tests for User Story 3 ⚠️

- [X] T018 [P] [US3] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求4+5 取消` 情境：CREATED 取消成功（CANCELLED/100/0/0）；PAID 取消成功（CANCELLED/100/100/100）；SHIPPED 取消失敗 `INVALID_TRANSITION`；CANCELLED 再取消失敗；REFUNDED 取消失敗
- [X] T019 [US3] 在 `tests/steps/order.steps.ts` 新增 `When 取消訂單` 步驟；執行 `npm test` 確認 US3 情境紅燈

### Implementation for User Story 3

- [X] T020 [US3] 在 `src/order.ts` 實作 `cancel(order)`：status ∉ {CREATED, PAID} → `INVALID_TRANSITION`；否則 `{ ...order, status: 'CANCELLED', refundedAmount: order.paidAmount }`（CREATED 時 paidAmount 為 0，故 refundedAmount 仍為 0）
- [X] T021 [US3] 執行 `npm test`，US1–US3 全綠

**Checkpoint**: US1–US3 皆可獨立驗證

---

## Phase 6: User Story 4 - 已出貨訂單分次退款 (Priority: P3)

**Goal**: `refund` 依 FR-008～FR-010 運作

**Independent Test**: SHIPPED/paid 100 退 30 → SHIPPED/refunded 30；再退 70 → REFUNDED/refunded 100；一次退 100 → REFUNDED；refunded 30 再退 71 失敗 `REFUND_EXCEEDS_PAID`；退 0/-1 失敗 `INVALID_AMOUNT`；PAID/CREATED/CANCELLED/REFUNDED 退款失敗 `INVALID_TRANSITION`

### Tests for User Story 4 ⚠️

- [X] T022 [P] [US4] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求6+7 分次退款` 情境：退 30 停留 SHIPPED；30 後再退 70 → REFUNDED（兩步串接）；一次退 100 → REFUNDED；30 後退 71 失敗 `REFUND_EXCEEDS_PAID`；退 0 失敗 `INVALID_AMOUNT`；退 -1 失敗 `INVALID_AMOUNT`；PAID 退 50 失敗 `INVALID_TRANSITION`；REFUNDED 退 1 失敗 `INVALID_TRANSITION`；CANCELLED 退 -1 失敗 `INVALID_TRANSITION`（判定順序）
- [X] T023 [US4] 在 `tests/steps/order.steps.ts` 新增 `When 退款 {int}` 步驟（連續 When 時以上一次成功結果的 order 為輸入）；執行 `npm test` 確認 US4 情境紅燈

### Implementation for User Story 4

- [X] T024 [US4] 在 `src/order.ts` 實作 `refund(order, amount)`：status ≠ SHIPPED → `INVALID_TRANSITION`；`!isValidAmount(amount)` → `INVALID_AMOUNT`；`order.refundedAmount + amount > order.paidAmount` → `REFUND_EXCEEDS_PAID`；否則 `refunded = order.refundedAmount + amount`，`status = refunded === order.paidAmount ? 'REFUNDED' : 'SHIPPED'`
- [X] T025 [US4] 執行 `npm test`，全部情境綠燈

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 覆蓋非法轉移矩陣、純函式驗證與最終驗收

- [X] T026 [P] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 需求8 非法轉移矩陣` 的 `Scenario Outline`，以 Examples 表列 data-model.md 轉移表中全部 13 個 ✗ 格（CREATED×ship/refund、PAID×pay/refund、SHIPPED×pay/ship/cancel、CANCELLED×4、REFUNDED×4），期望 `INVALID_TRANSITION`
- [X] T027 [P] 在 `tests/features/order-state-machine.feature` 新增 `Rule: 純函式` 情境：每個成功操作後「傳入的訂單未被修改」且回傳物件與傳入物件不是同一個參考（新增步驟 `Then 回傳的訂單是新的物件`）
- [X] T028 清理 `src/order.ts`：移除 `NOT_IMPLEMENTED` 骨架、確認無 `any`、無副作用、無多餘匯出
- [X] T029 依 `specs/001-order-state-machine/quickstart.md` 執行 `npm test` 與 `npm run typecheck`，記錄最終摘要（scenarios/steps 全 passed）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴
- **Foundational (Phase 2)**: 依賴 Phase 1；阻擋所有 User Story
- **User Stories (Phase 3–6)**: 皆依賴 Phase 2；US2 的測試資料需 PAID 訂單（以 Given 直接建構，不依賴 US1 實作）；US3、US4 同理
- **Polish (Phase 7)**: 依賴 Phase 3–6

### User Story Dependencies

- **US1 (P1)**: Foundational 後即可開始
- **US2 (P2)**: Foundational 後即可開始（測試用 Given 建構 PAID 訂單）
- **US3 (P2)**: Foundational 後即可開始
- **US4 (P3)**: Foundational 後即可開始；連續退款情境在測試內串接

### Within Each User Story

- 測試先寫並觀察失敗 → 實作 → `npm test` 綠燈
- 同一個 feature 檔與 steps 檔被多個 story 共用：feature 內以 `Rule:` 區塊分隔；steps 檔的 When 步驟各 story 各自新增，不重疊

### Parallel Opportunities

- T002、T003 可平行
- 各 story 的 feature 情境撰寫任務（T008、T009、T014、T018、T022）可平行（同檔不同 Rule 區塊，合併即可）
- T026、T027 可平行

---

## Parallel Example: User Story 1

```bash
# 同時撰寫 US1 的兩個 Rule 區塊：
Task: "Rule: 需求1 建立訂單 情境 in tests/features/order-state-machine.feature"
Task: "Rule: 需求2 付款 情境 in tests/features/order-state-machine.feature"
# 然後：
Task: "When 步驟 in tests/steps/order.steps.ts" → npm test（紅）→ 實作 createOrder/pay → npm test（綠）
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1：測試紅 → 實作 → 綠
3. **STOP and VALIDATE**：`npm test` 僅 US1 情境，全綠

### Incremental Delivery

1. US1（建單、付款）→ US2（出貨）→ US3（取消）→ US4（分次退款）→ Polish（矩陣、純函式）
2. 每一步 `npm test` 全綠，前一步不退化

---

## Notes

- [P] tasks = different files or disjoint regions, no dependencies
- [Story] label maps task to specific user story for traceability
- 所有 reason 字串只能是 `INVALID_AMOUNT` / `AMOUNT_MISMATCH` / `INVALID_TRANSITION` / `REFUND_EXCEEDS_PAID`
- 判定順序固定：狀態 → 金額合法性 → 金額比對（FR-015）

---

## Phase 8: Convergence

- [X] T030 在 tests/features/order-state-machine.feature 的「需求1」Rule 新增情境：以空字串 id、金額 100 建立訂單成功，狀態 CREATED 且回傳訂單的 id 為空字串；於 tests/steps/order.steps.ts 新增步驟 `Then 訂單的 id 為 {string}` per spec Edge Cases「訂單識別碼不做驗證」/ Constitution II (partial)
