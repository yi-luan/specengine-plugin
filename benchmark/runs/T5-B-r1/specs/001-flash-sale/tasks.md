# Tasks: 限量搶購（Flash Sale）

**Input**: Design documents from `/specs/001-flash-sale/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本功能的測試為必要項目（constitution II、spec SC-007）：每個 User Story 先寫 Gherkin feature 與 step definitions、確認紅燈，再做實作讓它們轉綠。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project：產品碼 `src/`，測試 `tests/`（features／steps／support），依 plan.md 的結構。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立測試支援碼與骨架，讓 `npm test` 能載入 feature／steps。

- [X] T001 建立 `tests/support/memory-store.ts`：實作 `Store` 介面的記憶體版（string Map + set Map；`set` 支援 `nx`、`px`，`px` 以注入的 `now()` 判定過期並 lazy 驅逐；`incrBy` 不存在視為 0；`del`／`sRem` 回傳是否真的移除），並匯出三個包裝器：`interleaving(store)`（每次操作前 `await` 讓出事件迴圈）、`crashAfter(store, k)`（第 k 次操作丟出 `Error('CRASH')` 且之後所有操作皆丟）、`stallAt(store, k)`（第 k 次操作等待一個由測試 `release()` 放行的 Promise）
- [X] T002 建立 `tests/support/world.ts`：自訂 cucumber `World`（可調時鐘 `clock: string` 與 `now = () => clock`、共用 `MemoryStore`、`servers: Map<string, FlashSale>` 透過 `createFlashSale(store, now)` 建立、暫存 `lastResult`、`results: Map<string, Result<…>>`、`holdIds: Map<string, string>` 以別名記錄保留編號），並以 `setWorldConstructor` 註冊；加入 `Before` hook 重設狀態
- [X] T003 建立 `src/flash.ts` 骨架：逐字匯出 `Store`、`Result`、`SaleInput`、`GrabInput`、`HoldStatus`、`Hold`、`FlashSale` 型別與 `createFlashSale(store, now)`，所有方法先 `throw new Error('NOT_IMPLEMENTED')`；確認 `npm run typecheck` 通過

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 story 共用的 step definitions 詞彙與 Store 鍵空間工具。

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 建立 `tests/steps/flash.steps.ts` 的共用步驟：`Given 現在時間是 {string}`、`Given 有 {int} 台伺服器`（建立 S1..Sn）、`Given 伺服器 {string} 開了搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}`、`When 時間推進到 {string}`、`Then 結果為成功`、`Then 結果為失敗 原因 {string}`、`Then 搶購 {string} 的剩餘件數為 {int}`；以 `import { createFlashSale } from '../../src/flash.js'` 連接產品碼（NodeNext 需 `.js` 副檔名）
- [X] T005 在 `src/flash.ts` 加入鍵空間與工具：`fs:` 前綴鍵名函式（`saleKey`、`salesSetKey`、`holdKey`、`holdOkKey`、`holdFinalKey`、`saleHoldsKey`、`saleCustomersKey`、`reqKey`、`reqAttemptsKey`、`saleSlotKey(saleId,n)`、`custSlotKey(saleId,customerId,j)`、`claimKey(slot,g)`、`releaseKey(slot,g)`）、`parseMs(iso)`、`fail(reason)`／`ok(value)`、JSON 型別守衛 `readSale`／`readHold`、`slotState(slotKey)`（依 data-model：從 g=0 找第一個無釋放標記的世代，回 `{gen, owner|null}`）、`releaseSlot(slotKey, gen)`（`set nx r{g}`）、`hashStart(holdId, size)`

**Checkpoint**: `npm test` 可以執行（所有 scenarios 因 NOT_IMPLEMENTED 失敗，無 undefined steps）

---

## Phase 3: User Story 4 - 商家開一檔搶購 (Priority: P2，前置條件故先做)

**Goal**: `openSale` 驗證、去重、建立 Sale 與 `fs:sales` 集合；`getRemaining` 對新搶購回 quantity。

**Independent Test**: 開檔後 `getRemaining === quantity`；不合法參數 `INVALID_INPUT`；重複 `DUPLICATE_SALE`；兩台同時開同一編號只有一台成功。

### Tests for User Story 4

- [X] T006 [P] [US4] 撰寫 `tests/features/open-sale.feature`：成功開檔剩餘 = 限量；重複開檔 `DUPLICATE_SALE` 且剩餘不變；參數不合法各一例（quantity 0、quantity 1.5、perCustomerLimit 0、saleId 空字串、startsAt == endsAt、startsAt > endsAt、時間字串不合法）→ `INVALID_INPUT` 且搶購不存在（剩餘 0）；兩台伺服器同時開同一編號 → 恰一成功一 `DUPLICATE_SALE`
- [X] T007 [P] [US4] 在 `tests/steps/flash.steps.ts` 加入步驟：`When 伺服器 {string} 開搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}`、`When 伺服器 {string} 以原始參數開搶購 {string} 參數 {string}`（JSON 字串，供不合法輸入）、`When 伺服器 {string} 和 {string} 同時開搶購 {string} 限量 {int} 件 每人限購 {int} 件 從 {string} 到 {string}`（`Promise.all`）、`Then 同時操作的結果中成功 {int} 次 失敗原因 {string} {int} 次`

### Implementation for User Story 4

- [X] T008 [US4] 在 `src/flash.ts` 實作 `openSale`（驗證 → `sAdd fs:sales` → `set nx fs:sale:{id}` → false 則 `DUPLICATE_SALE`）與 `getRemaining` 的「搶購不存在回 0、存在則 quantity − 佔用槽位數」（掃描 `slotState` 計算佔用）

**Checkpoint**: open-sale.feature 全綠。

---

## Phase 4: User Story 1 - 顧客搶購並取得保留 (Priority: P1) 🎯 MVP

**Goal**: `grab` 完整流程：驗證、時間、重送冪等、限購槽位、搶購槽位、保留紀錄與確認；多台交錯不超賣、不超限購。

**Independent Test**: 限量 10、限購 2 的搶購，多台伺服器同時搶，成功總件數 ≤ 10、每人 ≤ 2，成功回應含 holdId 與 expiresAt = now + 10 分鐘。

### Tests for User Story 1

- [X] T009 [P] [US1] 撰寫 `tests/features/grab.feature`：成功保留（expiresAt = 當下 + 10 分鐘，剩餘 10 → 8）；剩餘 1 搶 2 → `SOLD_OUT` 剩餘不變；剛好等於剩餘可成功（剩餘 → 0）；持有 2 件再搶 1 → `LIMIT_EXCEEDED`；單筆 qty 3 > 限購 2 → `LIMIT_EXCEEDED`；開始前 `NOT_STARTED`、恰等於開始時刻成功、恰等於結束時刻 `ENDED`、結束後 `ENDED`；qty 0／負數／1.5 與空 saleId／customerId／requestId → `INVALID_INPUT`；搶購不存在 `SALE_NOT_FOUND`；同 requestId 重送（另一台伺服器）回同 holdId 與 expiresAt 且剩餘不變；結束後重送仍回同保留；第一次 `SOLD_OUT` 後釋放再以同 requestId 重送可成功；連點兩個 requestId 限購 1 → 恰一成功一 `LIMIT_EXCEEDED`；限量 1 兩台同時各搶 1 → 恰一成功一 `SOLD_OUT`（交錯 Store）；3 台 × 30 位顧客 × 各 2 筆請求同時搶限量 20 限購 2（交錯 Store）→ 成功件數總和 = 20、每位顧客成功件數 ≤ 2、剩餘 0；已釋放保留不佔限購額度（到期 sweep 後同顧客可再搶）
- [X] T010 [P] [US1] 在 `tests/steps/flash.steps.ts` 加入步驟：`When 伺服器 {string} 替顧客 {string} 搶購 {string} {int} 件 請求編號 {string}`（結果存入 `lastResult`，成功時以請求編號為別名記錄 holdId／expiresAt）、`When 伺服器 {string} 以原始參數搶購 參數 {string}`、`Then 回傳的到期時間是 {string}`、`Then 回傳的保留編號與請求編號 {string} 的相同`、`Then 回傳的到期時間與請求編號 {string} 的相同`、`When 以下搶購同時送出:`（DataTable：伺服器｜顧客｜搶購｜件數｜請求編號；使用 `interleaving` Store，`Promise.all`）、`When {int} 位顧客各以 {int} 筆請求透過 {int} 台伺服器同時搶購 {string} 每筆 {int} 件`、`Then 同時搶購中成功的件數總和為 {int}`、`Then 同時搶購中每位顧客成功件數不超過 {int}`、`Given 已使用交錯式 Store`

### Implementation for User Story 1

- [X] T011 [US1] 在 `src/flash.ts` 實作槽位宣告模組：`claimSlots(prefixKeyFn, size, holdId, need, start)`（greedy：掃描 size 個槽位，`slotState` 為自己 → 計入；空閒 → `set nx c{g}=holdId`；回傳是否足額）與 `releaseOwnedSlots(prefixKeyFn, size, holdId)`（掃描並對 owner==holdId 的世代 `releaseSlot`）
- [X] T012 [US1] 在 `src/flash.ts` 實作 `grab`：依 contracts 檢查順序（INVALID_INPUT → SALE_NOT_FOUND → 映射重送：已確認回同保留；未確認則輪詢最多 50 次讓出後接手 → NOT_STARTED／ENDED → 單筆 qty > limit 即 `LIMIT_EXCEEDED`）→ 建立嘗試（`incrBy` 嘗試序號、holdId、`set nx` 紀錄、`sAdd` holds／customers、`set nx` 映射；映射失敗則回滾紀錄並重走映射分支）→ `claimSlots` 顧客槽位（不足 → 回滾 → `LIMIT_EXCEEDED`）→ `claimSlots` 搶購槽位（不足 → 回滾 → `SOLD_OUT`）→ `set ok` → 回 `{holdId, expiresAt}`；回滾 = 釋放兩類槽位、`get` 映射等於自己才 `del`、`del` 紀錄、`sRem` holds
- [X] T013 [US1] 在 `src/flash.ts` 實作 `getHold`（紀錄＋ok 皆存在才回；status 由 final 推導，否則 `HELD`），供 US1 場景驗證保留內容

**Checkpoint**: grab.feature 全綠；open-sale.feature 仍綠。

---

## Phase 5: User Story 2 - 付款成交 (Priority: P1)

**Goal**: `pay` 的成交、冪等、到期拒付、查無、結束後仍可付。

**Independent Test**: 保留後付款 → PAID；重複付款仍成功且狀態不變；到期後付款 `HOLD_EXPIRED`。

### Tests for User Story 2

- [X] T014 [P] [US2] 撰寫 `tests/features/pay.feature`：成交後 `getHold.status == PAID` 且剩餘不變；重複通知成功且狀態不變；到期（含恰等於到期時刻）未釋放 → `HOLD_EXPIRED` 狀態仍 `HELD`、之後 sweep 釋放件數歸還；已釋放 → `HOLD_EXPIRED` 狀態 `EXPIRED`；不存在／空字串 → `HOLD_NOT_FOUND`；搶購結束後、保留未到期 → 付款成功；到期前 1 秒付款成功
- [X] T015 [P] [US2] 在 `tests/steps/flash.steps.ts` 加入步驟：`When 伺服器 {string} 收到請求編號 {string} 之保留的付款通知`、`When 伺服器 {string} 收到保留編號 {string} 的付款通知`（原始字串）、`Then 請求編號 {string} 的保留狀態為 {string}`、`Then 保留編號 {string} 不存在`、`Then 請求編號 {string} 的保留內容為 搶購 {string} 顧客 {string} 件數 {int}`

### Implementation for User Story 2

- [X] T016 [US2] 在 `src/flash.ts` 實作 `pay`（紀錄＋ok 不存在 → `HOLD_NOT_FOUND`；final PAID → ok；final EXPIRED 或 `now ≥ expiresAt` → `HOLD_EXPIRED`；`set nx final=PAID` 成功 → ok，失敗再讀 final 決定 ok／`HOLD_EXPIRED`）

**Checkpoint**: pay.feature 全綠。

---

## Phase 6: User Story 3 - 到期保留自動釋放 (Priority: P1)

**Goal**: `sweep` 釋放到期保留、多台只歸還一次、保護 PAID 與未到期。

**Independent Test**: 到期後兩台各跑一次 sweep，狀態 `EXPIRED`、剩餘恰加回一次。

### Tests for User Story 3

- [X] T017 [P] [US3] 撰寫 `tests/features/sweep.feature`：到期保留 sweep 後 `EXPIRED` 且剩餘加回；兩台同時 sweep（交錯 Store）只加回一次；重複 sweep 不再變動；未到期不動；PAID 永不釋放（即使時間遠超到期）；到期時刻恰等於當下 → 釋放；多張保留部分到期只釋放到期者；釋放後其他顧客可搶到該件數；釋放後同顧客限購額度恢復
- [X] T018 [P] [US3] 在 `tests/steps/flash.steps.ts` 加入步驟：`When 伺服器 {string} 執行排程`、`When 伺服器 {string} 和 {string} 同時執行排程`

### Implementation for User Story 3

- [X] T019 [US3] 在 `src/flash.ts` 實作 `sweep`：`sMembers fs:sales` → 每檔：`sMembers holds`，紀錄不存在則 `sRem`；無 final 且 `now ≥ expiresAt` → `set nx final=EXPIRED`，若無 ok 則清映射（值等於 holdId 才 `del`）；掃描搶購槽位與 `customers` 集合中每位顧客的槽位，owner 的 final 為 EXPIRED 或紀錄不存在 → `releaseSlot`

**Checkpoint**: sweep.feature 全綠；US1／US2／US4 feature 仍綠。

---

## Phase 7: User Story 5 - 商品頁顯示剩餘可搶件數 (Priority: P2)

**Goal**: `getRemaining` 與 `getHold` 完整語意驗證。

**Independent Test**: 限量 10、3 件保留中、2 件已成交 → 5；不存在搶購 → 0；getHold 欄位齊全。

### Tests for User Story 5

- [X] T020 [P] [US5] 撰寫 `tests/features/remaining.feature`：限量 10、3 件 HELD、2 件 PAID → 剩餘 5；不存在搶購 → 0；到期未 sweep 的 HELD 仍算佔用；getHold 回傳欄位（holdId、saleId、customerId、qty、expiresAt、status）；getHold 不存在 → null
- [X] T021 [P] [US5] 在 `tests/steps/flash.steps.ts` 加入步驟：`Then 請求編號 {string} 的保留到期時間為 {string}`、`Then 搶購 {string} 的剩餘件數在任一伺服器查詢皆為 {int}`

### Implementation for User Story 5

- [X] T022 [US5] 檢視 `src/flash.ts` 的 `getRemaining`／`getHold` 是否完全符合 contracts（已於 T008／T013 實作，此處補齊缺口）

**Checkpoint**: remaining.feature 全綠。

---

## Phase 8: 韌性（跨 story：FR-020、FR-021、SC-001、SC-002）

**Goal**: 當機、卡住恢復、同一請求同時到兩台，皆不超賣、守恆。

### Tests

- [X] T023 撰寫 `tests/features/resilience.feature`：(a) 搶購流程在第 k 次 Store 操作當機（k 以 Scenario Outline 掃 1..25）→ 其他伺服器查詢不超賣；時間推進 10 分鐘後 sweep → 剩餘恢復為限量（守恆）；同 requestId 在另一台重送 → 成功且剩餘 = 限量 − qty；(b) 付款在時間檢查後卡住，期間時間推進到期、另一台 sweep 釋放、放行後付款結果 `HOLD_EXPIRED` 且狀態 `EXPIRED`、剩餘已歸還；(c) 付款卡住但 sweep 未發生、放行後成交；(d) 同一請求同時送到兩台（交錯 Store）→ 兩者皆成功且 holdId 相同，剩餘只扣一次；(e) 排程在釋放中途當機 → 下一次排程完成釋放、剩餘正確
- [X] T024 在 `tests/steps/flash.steps.ts` 加入步驟：`Given 伺服器 {string} 的 Store 會在第 {int} 次操作當機`、`Given 伺服器 {string} 的 Store 會在第 {int} 次操作卡住`、`When 伺服器 {string} 替顧客 {string} 搶購 {string} {int} 件 請求編號 {string} 並允許失敗`（捕捉 CRASH 例外）、`When 伺服器 {string} 在背景收到請求編號 {string} 之保留的付款通知`（不 await，存 Promise）、`When 放行卡住的伺服器 {string} 並等待背景操作完成`、`When 伺服器 {string} 執行排程 並允許失敗`、`Then 搶購 {string} 的剩餘件數不小於 {int}`

### Implementation

- [X] T025 依 resilience.feature 的紅燈修正 `src/flash.ts`（預期主要在接手／回滾／排程釋放的順序細節）

**Checkpoint**: 全部 feature 全綠。

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T026 執行 `npm run typecheck` 與 `npm test`，確認 0 型別錯誤、0 undefined／pending steps、全部 scenarios passed
- [X] T027 檢查 spec.md 每條 FR-001～FR-023 與 SC-001～SC-007 至少對應一個場景；缺的補到對應 feature 檔
- [X] T028 [P] 更新 `README.md`：一段說明 `src/flash.ts` 用法與 `npm test`
- [X] T029 [P] 依 quickstart.md 走一遍手動驗證清單並在 BENCH-LOG.md 記錄 implement 摘要

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴
- **Foundational (Phase 2)**: 依賴 Phase 1；阻塞所有 story
- **US4 (Phase 3)**: 依賴 Phase 2；其餘 story 的 Given 都需要開檔，故最先做
- **US1 (Phase 4)**: 依賴 Phase 3
- **US2 (Phase 5)**、**US3 (Phase 6)**、**US5 (Phase 7)**: 依賴 Phase 4（需要保留）；三者彼此獨立
- **韌性 (Phase 8)**: 依賴 Phase 4–6
- **Polish (Phase 9)**: 依賴全部

### Within Each User Story

- feature 與 steps（[P]）先寫並確認紅燈 → 再實作 → 綠燈
- 同一檔 `src/flash.ts`／`tests/steps/flash.steps.ts` 的任務必須循序

### Parallel Opportunities

- T006＋T007、T009＋T010、T014＋T015、T017＋T018、T020＋T021：feature 與 steps 可同時寫
- T028＋T029 可並行

---

## Parallel Example: User Story 1

```bash
Task: "撰寫 tests/features/grab.feature"
Task: "在 tests/steps/flash.steps.ts 加入 US1 步驟"
# 兩者完成並確認紅燈後，循序執行 T011 → T012 → T013
```

---

## Implementation Strategy

### MVP First

1. Phase 1–2 → `npm test` 可跑（全紅）
2. Phase 3（US4）→ Phase 4（US1）→ **STOP and VALIDATE**：open-sale／grab 全綠即為 MVP（能開檔、能不超賣地搶）

### Incremental Delivery

3. Phase 5（付款）→ Phase 6（排程）→ Phase 7（查詢）各自獨立轉綠
4. Phase 8 韌性場景收斂當機／卡住細節
5. Phase 9 收尾

---

## Notes

- 每個任務只碰列出的檔案；`src/flash.ts` 是唯一產品碼檔
- feature 檔以繁體中文撰寫 step 文字，`# language: zh-TW` 標頭
- 不得為了讓測試過而放寬 contracts 的原因代碼或檢查順序

---

## Phase 10: Convergence

- [X] T030 在 `specs/001-flash-sale/research.md` 補記 R9：名額宣告的 wait-die 優先權規則（holdId 字串序小者優先、大者釋放部分宣告重試、「自己已有＋較大編號者持有」不足即判定失敗）與殘留宣告（擁有者紀錄不存在）由宣告者直接釋放的決策、理由與替代方案 per plan: R1／R7 名額宣告 (unrequested)
- [X] T031 在 `tests/features/grab.feature` 補場景「同一請求編號重送但件數不同，以第一次成功的保留為準」（回同 holdId、剩餘不變、保留件數為第一次的件數） per spec Edge Case「同一請求編號重送但帶不同參數」 (partial)
- [X] T032 在 `tests/features/grab.feature` 與 `tests/features/pay.feature` 補場景「同一請求編號重送 100 次全部回同一保留且只扣一次」「同一付款通知重送 100 次狀態恆為 PAID」，並在 `tests/steps/flash.steps.ts` 加入 `When 伺服器 {string} 替顧客 {string} 以請求編號 {string} 重送搶購 {string} {int} 件 共 {int} 次`、`When 伺服器 {string} 收到請求編號 {string} 之保留的付款通知 共 {int} 次` per SC-003／SC-004 (partial)
