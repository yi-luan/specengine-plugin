# Tasks: 限量搶購

**Input**: Design documents from `/specs/001-flash-sale/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/flash-sale.md, quickstart.md

**Tests**: 包含測試任務。依據 constitution 原則 II（Test-First, NON-NEGOTIABLE），每個故事的 Gherkin 與 step definitions 必須先寫、先紅燈，才能寫實作。

**Organization**: 依使用者故事分組，每個故事可獨立測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可並行（不同檔案，無相依）
- **[Story]**: 對應 spec.md 的使用者故事（US1–US5）
- 每個任務都附精確檔案路徑

## Path Conventions

- 產品碼：`src/flash.ts`
- Gherkin：`tests/features/flash-sale/*.feature`
- Step definitions：`tests/steps/flash-sale.steps.ts`
- 測試替身：`tests/support/memory-store.ts`、`tests/support/fake-clock.ts`

---

## Phase 1: Setup（共用基礎）

**Purpose**: 建立測試基礎設施，不含產品邏輯

- [X] T001 建立目錄 `tests/features/flash-sale/`，確認 `cucumber.cjs` 的 paths 會收錄此目錄（`tests/features/**/*.feature`）
- [X] T002 [P] 在 `tests/support/memory-store.ts` 實作記憶體版 `Store`，支援 get、set（nx、px，px 以注入時鐘計算）、del（回傳原本是否存在）、incrBy、sAdd、sRem、sMembers；只供測試使用
- [X] T003 [P] 在 `tests/support/fake-clock.ts` 實作可手動推進的 `now()`，回傳 ISO 8601 字串（例如 `'2026-06-15T12:00:00Z'` 格式），並提供 `advanceMinutes(n)` 與 `setTime(iso)`
- [X] T004 在 `src/flash.ts` 建立空殼：匯出 `Store`、`Result`、`SaleInput`、`GrabInput`、`HoldStatus`、`Hold`、`FlashSale` 型別與 `createFlashSale` 函式（回傳未實作的物件，使 TypeScript 通過但行為全部失敗）

**Checkpoint**: `npm run typecheck` 通過；`npm test` 只因未實作而失敗

---

## Phase 2: Foundational（阻擋所有故事的前置）

**Purpose**: 所有故事共用的內部輔助，全部位於 `src/flash.ts` 內，不使用模組層級可變狀態

- [X] T005 在 `src/flash.ts` 實作內部輔助：金鑰產生函式（`flash:sale:`、`flash:slot:`、`flash:cslot:`、`flash:req:`、`flash:hold:`、`flash:end:`、`flash:sale-holds:`、`flash:sales`）與 JSON 讀寫的安全包裝
- [X] T006 在 `src/flash.ts` 實作時間比較輔助：以 `now()` 取得目前時間，並比較 ISO 8601 字串（需轉成毫秒比較，避免字串比較誤差）
- [X] T007 [P] 在 `tests/steps/flash-sale.steps.ts` 建立共用 World／context：每個 scenario 建立新的記憶體 `Store`、假時鐘，並以這兩者建立 `createFlashSale`，模擬多台伺服器時建立多個實例共用同一個 `Store`

**Checkpoint**: 基礎設施就緒，故事實作可開始

---

## Phase 3: User Story 1 - 商家開一檔限量搶購 (Priority: P1) 🎯 MVP

**Goal**: 商家可開檔，重複編號、不合法參數皆被拒絕且不寫入資料

**Independent Test**: 以有效參數開檔，確認剩餘件數等於限量；重複與不合法參數被拒絕

### Tests for User Story 1（先寫，必須先紅燈）

- [X] T008 [P] [US1] 在 `tests/features/flash-sale/open-sale.feature` 撰寫 scenarios：有效開檔、重複 saleId 回 `DUPLICATE_SALE`、quantity 非正整數回 `INVALID_INPUT`、perCustomerLimit 非正整數回 `INVALID_INPUT`、saleId 為空回 `INVALID_INPUT`、startsAt 不早於 endsAt 回 `INVALID_INPUT`，每個拒絕情境都要驗證沒有寫入資料
- [X] T009 [US1] 在 `tests/steps/flash-sale.steps.ts` 實作 T008 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 1

- [X] T010 [US1] 在 `src/flash.ts` 實作 `openSale`：驗證輸入（quantity 與 perCustomerLimit 為正整數 `Number.isInteger` 且 > 0、saleId 非空、startsAt 早於 endsAt）；不合法回 `INVALID_INPUT` 且不寫入；`set nx flash:sale:{saleId}`，失敗回 `DUPLICATE_SALE`；成功後 `sAdd flash:sales`。對應 plan.md「openSale」段落與 data-model.md「SaleRecord」
- [X] T011 [US1] 執行 `npm test`，確認 T008 的 scenarios 全部綠燈

**Checkpoint**: US1 可獨立運作

---

## Phase 4: User Story 2 - 顧客搶購並保留件數 10 分鐘 (Priority: P1)

**Goal**: 在有效時段內，以件數槽與限購槽原子搶佔件數；重送冪等；內容衝突被拒絕

**Independent Test**: 在時段內搶購成功回 holdId 與 expiresAt；件數不足、超限購、時段外、重送、內容衝突皆有正確結果

### Tests for User Story 2（先寫，必須先紅燈）

- [X] T012 [P] [US2] 在 `tests/features/flash-sale/grab.feature` 撰寫 scenarios：剛好等於剩餘可搶成功（FR-005）；不足回 `SOLD_OUT` 且剩餘件數不變（FR-005）；超過限購回 `LIMIT_EXCEEDED`（FR-006）；開始前回 `NOT_STARTED`；結束時刻回 `ENDED`；開始時刻（含）可搶；qty 非正整數、空字串欄位回 `INVALID_INPUT`；saleId 不存在回 `SALE_NOT_FOUND`；相同 requestId 重送回傳相同 holdId 且件數只扣一次（FR-011）；相同 requestId 但 qty 或 customerId 不同回 `REQUEST_CONFLICT`（FR-011）；過期釋放後的件數與限購額度可再被搶（spec Clarifications Q1）
- [X] T013 [P] [US2] 在 `tests/features/flash-sale/grab-concurrency.feature` 撰寫 scenarios：多個 `createFlashSale` 實例（模擬多台伺服器）同時搶最後一件，只有一人成功（FR-010, FR-012）；同一顧客的多個不同 requestId 同時到達，合計不超過限購（FR-006, FR-012）
- [X] T014 [US2] 在 `tests/steps/flash-sale.steps.ts` 實作 T012–T013 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 2

- [X] T015 [US2] 在 `src/flash.ts` 實作 `grab` 的輸入驗證與 sale 查詢：`INVALID_INPUT`、`SALE_NOT_FOUND`，並依 `now()` 判斷 `NOT_STARTED`／`ENDED`（plan.md「grab」步驟 1–3）
- [X] T016 [US2] 在 `src/flash.ts` 實作 grab 的冪等佔位：`set nx flash:req:{saleId}:{requestId}`，值含 customerId、qty、holdId（holdId 由 `crypto.randomUUID()` 產生）；已存在時比對 customerId 與 qty，不同回 `REQUEST_CONFLICT`，相同則進入 R2 的等待與回傳邏輯（plan.md「grab」步驟 4）
- [X] T017 [US2] 在 `src/flash.ts` 實作 hold 建立：`set nx flash:hold:{holdId}`（expiresAt = now + 10 分鐘），`sAdd flash:sale-holds:{saleId}`
- [X] T018 [US2] 在 `src/flash.ts` 實作限購槽搶佔：依序 `set nx flash:cslot:{saleId}:{customerId}:{j}`（j 從 1 到 perCustomerLimit），搶到 qty 個為止；不足回 `LIMIT_EXCEEDED` 並進入失敗路徑
- [X] T019 [US2] 在 `src/flash.ts` 實作件數槽搶佔：依序 `set nx flash:slot:{saleId}:{i}`（i 從 1 到 quantity），搶到 qty 個為止；不足回 `SOLD_OUT` 並進入失敗路徑
- [X] T020 [US2] 在 `src/flash.ts` 實作失敗路徑：只刪除值等於本 holdId 的已搶槽（先 `get` 確認再 `del`），並 `set nx flash:end:{holdId}` = `CANCELLED:{reason}`
- [X] T021 [US2] 在 `src/flash.ts` 實作成功路徑：回傳 `{ holdId, expiresAt }`
- [X] T022 [US2] 執行 `npm test`，確認 T012–T013 scenarios 全部綠燈

**Checkpoint**: US2 可獨立運作（搶購、冪等、限購、併發）

---

## Phase 5: User Story 3 - 付款成交 (Priority: P1)

**Goal**: 付款成功通知把保留轉為已成交；到期（含）後的付款一律拒絕；重複通知結果一致

**Independent Test**: 保留中付款成功；重複通知冪等；到期後付款回 `HOLD_EXPIRED`；不存在的保留回 `HOLD_NOT_FOUND`；搶購結束後仍可付款

### Tests for User Story 3（先寫，必須先紅燈）

- [X] T023 [P] [US3] 在 `tests/features/flash-sale/pay.feature` 撰寫 scenarios：保留中付款成功後狀態為 PAID 且件數維持扣除（FR-007）；重複付款通知回成功且不重複成交（FR-007）；到期時刻（含）後付款回 `HOLD_EXPIRED`，即使排程尚未釋放，且狀態不變（FR-007, Q2）；保留不存在回 `HOLD_NOT_FOUND`（FR-015）；搶購已結束後付款仍成功（Q3）；已釋放的保留付款回 `HOLD_EXPIRED`
- [X] T024 [US3] 在 `tests/steps/flash-sale.steps.ts` 實作 T023 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 3

- [X] T025 [US3] 在 `src/flash.ts` 實作 `pay`：讀取 hold（不存在 → `HOLD_NOT_FOUND`）；`now >= expiresAt` → `HOLD_EXPIRED` 且不寫入（plan.md「pay」步驟 1–2）
- [X] T026 [US3] 在 `src/flash.ts` 實作 `pay` 的終態決定：讀取 `flash:end`，`PAID` → 成功；`RELEASED` 或 `CANCELLED` → `HOLD_EXPIRED`；否則 `set nx flash:end:{holdId} = PAID`，失敗時重讀（plan.md「pay」步驟 3–4）
- [X] T027 [US3] 確認 `pay` 不讀取 sale 的 endsAt（Q3），並在 `tests/features/flash-sale/pay.feature` 的搶購結束情境中驗證
- [X] T028 [US3] 執行 `npm test`，確認 T023 scenarios 全部綠燈

**Checkpoint**: US3 可獨立運作

---

## Phase 6: User Story 4 - 到期未付款的保留釋放 (Priority: P2)

**Goal**: 排程每分鐘在每台伺服器執行；到期未付款者釋放且只歸還一次；已成交者不釋放；保留中未到期者不釋放

**Independent Test**: 推進時間超過 10 分鐘後執行 sweep，保留變為 EXPIRED 且件數歸還；多台伺服器同時 sweep 只歸還一次

### Tests for User Story 4（先寫，必須先紅燈）

- [X] T029 [P] [US4] 在 `tests/features/flash-sale/sweep.feature` 撰寫 scenarios：到期未付款釋放並歸還件數與限購額度（FR-008）；多台伺服器同時 sweep 同一保留，件數只歸還一次（FR-008）；已成交不釋放（FR-008）；未到期的保留保持保留中（FR-008）；到期後、sweep 前 getHold 仍顯示 HELD（Q2）；sweep 之後釋放的件數可被他人搶到（SC-004）
- [X] T030 [US4] 在 `tests/steps/flash-sale.steps.ts` 實作 T029 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 4

- [X] T031 [US4] 在 `src/flash.ts` 實作 `sweep`：讀取 `flash:sales`，對每個 saleId 讀取 `flash:sale-holds:{saleId}`，對每個 hold 判斷到期且無 `flash:end` 者，`set nx flash:end:{holdId} = RELEASED`（plan.md「sweep」步驟 1–2）
- [X] T032 [US4] 在 `src/flash.ts` 實作釋放槽：只有贏得 nx 的一方，依 hold 記錄的 slotIndexes 與 customerSlotIndexes 刪除槽，刪除前以 `get` 確認值為 holdId（plan.md「sweep」步驟 2）
- [X] T033 [US4] 在 `src/flash.ts` 實作恢復步驟（R1）：sweep 另外掃描 `RELEASED` 或 `CANCELLED` 但仍佔槽的保留並完成釋放，確保當機後槽不會永久鎖住；在 `tests/features/flash-sale/sweep.feature` 增加「釋放中途當機後下一次 sweep 完成釋放」情境，並以測試替身模擬中途失敗
- [X] T034 [US4] 執行 `npm test`，確認 T029 scenarios 全部綠燈

**Checkpoint**: US4 可獨立運作

---

## Phase 7: User Story 5 - 商品頁顯示剩餘可搶件數 (Priority: P2)

**Goal**: `getRemaining` 回傳目前可搶件數，與實際狀態一致

**Independent Test**: 開檔、保留、成交、釋放各階段讀取剩餘件數，數值正確

### Tests for User Story 5（先寫，必須先紅燈）

- [X] T035 [P] [US5] 在 `tests/features/flash-sale/remaining.feature` 撰寫 scenarios：開檔後回傳限量件數；保留中與已成交件數被扣除；保留釋放後件數回到剩餘可搶（User Story 5 第 3 條）；getHold 狀態 HELD／PAID／EXPIRED 的推導（data-model.md「狀態推導」）
- [X] T036 [US5] 在 `tests/steps/flash-sale.steps.ts` 實作 T035 的 step definitions，執行 `npm test` 確認紅燈

### Implementation for User Story 5

- [X] T037 [US5] 在 `src/flash.ts` 實作 `getRemaining`：讀取 quantity 的件數槽，回傳 quantity 減去非空槽數（FR-009）
- [X] T038 [US5] 在 `src/flash.ts` 實作 `getHold`：讀取 hold 與 `flash:end`，依 data-model.md「狀態推導」回傳 `HELD`／`PAID`／`EXPIRED`；hold 不存在回 `null`
- [X] T039 [US5] 執行 `npm test`，確認 T035 scenarios 全部綠燈

**Checkpoint**: US5 可獨立運作

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的收尾

- [X] T040 [P] 確認 `src/flash.ts` 沒有模組層級可變狀態（constitution 原則 III），並以 grep 檢查沒有使用 `Date.now()` 或無參數的 `new Date()`（時間一律來自 `now()`；僅允許以 `new Date(ms)` 格式化由 `now()` 推得的毫秒值）
- [X] T041 [P] 補充 `tests/features/flash-sale/grab-concurrency.feature` 的「卡住後恢復」情境：一台伺服器在 grab 中途被暫停，另一台完成搶購與排程後，恢復的伺服器不會超賣或重複扣件（FR-012）
- [X] T042 [P] 確認 `reports/` 已在 `.gitignore`（constitution 技術棧限制）
- [X] T043 執行 `npm run typecheck` 與 `npm test`，確認全部綠燈
- [X] T044 依 quickstart.md 逐項對照 spec 的 FR，確認每條 FR 至少被一個 scenario 涵蓋（constitution 原則 V）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup，阻擋所有故事
- **User Stories (Phase 3–7)**: 依賴 Foundational；US1 完成後 US2 可開始（需要開檔），US3 依賴 US2 的保留，US4 依賴 US2 與 US3 的終態，US5 依賴 US2
- **Polish (Final Phase)**: 依賴所有故事完成

### User Story Dependencies

- **US1（P1）**: 獨立，MVP
- **US2（P1）**: 依賴 US1（需要 saleId 存在）
- **US3（P1）**: 依賴 US2（需要 hold）
- **US4（P2）**: 依賴 US2 與 US3（終態）
- **US5（P2）**: 依賴 US2 與 US4（釋放後的剩餘件數）

### Within Each User Story

- Gherkin 與 step definitions 先寫並紅燈（constitution 原則 II）
- 實作依 plan.md 的演算法順序
- 故事結束時執行 `npm test` 全綠才進入下一故事

### Parallel Opportunities

- T002、T003 可並行（不同檔案）
- T008、T012、T013、T023、T029、T035 的 Gherkin 撰寫可並行（不同檔案）
- Polish 階段的 T040、T041、T042 可並行

---

## Implementation Strategy

### MVP First（只做 US1）

1. 完成 Phase 1、Phase 2
2. 完成 Phase 3（US1）
3. **停下來驗證**：只跑 `open-sale.feature`

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. US1 → 開檔可用
3. US2 → 搶購與併發保證
4. US3 → 付款成交
5. US4 → 排程釋放與恢復
6. US5 → 剩餘件數與狀態查詢
7. Polish → 全部綠燈

---

## Notes

- [P] = 不同檔案，無相依
- [Story] 標籤用於追溯到 spec.md 的使用者故事
- 每個故事都必須能獨立測試
- 先紅燈再實作；不得為了綠燈而刪除或弱化 scenario（constitution 工作流）
- 每完成一個任務群組就 commit 也可（本次只在最後統一 commit）

## Phase 8: Convergence（第 1 輪 converge 附加，依需求方回覆 Q6–Q8）

**Purpose**: 補上 converge 第 1 輪找出的缺口。Q6 決定接受釋放窗口（已寫入 spec.md Assumptions，不屬缺口）；Q7 採 REQUEST_IN_PROGRESS；Q8 要求併發請求只要名額足夠都必須處理完成。

- [X] T045 [US2] 修正 `src/flash.ts` 的件數與限購搶佔：搶佔不足時先回滾自己的槽，重新掃描剩餘；只有掃描確認剩餘件數或限購額度不足時才回 `SOLD_OUT`／`LIMIT_EXCEEDED`，不得因他人暫時佔用的槽而失敗（per FR-005, Q8）（gap: partial）
- [X] T046 [US2] 修正 `src/flash.ts` 的重送處理：第一次請求逾時仍未決定時回 `REQUEST_IN_PROGRESS`（不再誤報 `SOLD_OUT`）；並把此代碼加入 spec.md FR-015 與 `specs/001-flash-sale/contracts/flash-sale.md`（per FR-011, FR-015, Q7）（gap: partial）
- [X] T047 [US2] 在 `tests/features/flash-sale/grab-concurrency.feature` 先寫並確認紅燈：三位顧客各搶 2 件同時搶 6 件庫存，三人都成功；三位顧客各搶 2 件同時搶 4 件庫存，恰好兩人成功、第三人回 `SOLD_OUT`；並在 `tests/steps/flash-sale.steps.ts` 補對應 step（per FR-005, Q8）（gap: missing）
- [X] T048 [US2] 同步文件與程式：`plan.md` 與 `data-model.md` 改為「釋放時掃描槽的持有者」（移除未使用的 slotIndexes／customerSlotIndexes 描述），並在 plan.md 風險 R1 記錄 Q6 的接受決定（per plan decision）（gap: partial）

## Phase 9: Convergence（第 2 輪 converge 附加）

**Purpose**: 第 2 輪評估 spec、plan、tasks 與程式碼後，只剩一項文件與實作不一致。

- [X] T049 [US4] 修正 `specs/001-flash-sale/data-model.md` 的 HoldRecord：移除實作不儲存的 `createdAt` 欄位（實作的 HoldRecord 只有 holdId、saleId、customerId、qty、expiresAt），並確認 plan.md 與 data-model.md 的 HoldRecord 描述一致（per plan decision: data model）（gap: partial）



