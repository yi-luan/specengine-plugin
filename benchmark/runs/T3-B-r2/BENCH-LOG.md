# BENCH-LOG — T3-B-r2（Spec Kit 流程）

- 開始時間：2026-10-20 07:43:48
- 結束時間：2026-10-20 15:16:25

## 角色說明
- 【執行者】：依序執行 speckit-constitution → specify → clarify → plan → tasks → implement → converge。
- 【需求方】：只在被問到時，依 answers.md 回答；不主動提示。

## Skill 完成摘要

### 1. speckit-constitution 【執行者】
- `.specify/extensions.yml` 不存在，無 hook。
- `resolve-template.ps1 constitution-template -Json` 成功。
- 寫入 `.specify/memory/constitution.md` v1.0.0（五原則：TypeScript-only、純函式、BDD 測試必要、明確失敗語意、YAGNI；技術限制：cucumber-js、`npm test`、src/、tests/）。
- 無需求方提問。

## 中斷與恢復
- 上一個 session 約於 07:47 意外結束；恢復時間：2026-10-20 07:51:41。磁碟狀態完整（constitution、spec、checklist 已存在），從 specify 的問答整合處接續。

### 2. speckit-specify 【執行者】
- `create-new-feature.ps1 -Json -ShortName multi-tenant-coupons` → `specs/001-multi-tenant-coupons/spec.md`，`.specify/feature.json` 已寫入。
- 寫入 spec（4 個 User Story、FR-001～FR-015、Key Entities、SC-001～SC-005、Assumptions），3 個 [NEEDS CLARIFICATION] 標記。
- 建立 `checklists/requirements.md`；第一輪僅「No NEEDS CLARIFICATION」未通過；問完 3 題後全部通過。

## 問答紀錄（執行者問 → 需求方答）

### specify 階段
1. 【執行者】固定金額折扣會讓訂單低於 0 時，整筆拒絕並回原因，還是把折扣截斷到剛好 0？
   【需求方】整筆拒絕。reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。總折扣剛好等於訂單金額可以，finalAmount = 0。
2. 【執行者】百分比折扣算出小數（如 15% of 333 = 49.95）時，捨去、四捨五入還是進位？
   【需求方】每張 PERCENT 的折扣額各自無條件捨去取整數。
3. 【執行者】多張券中有一張不合格（別租戶、過期、未達門檻）時，整筆失敗還是略過那張套用其餘？
   【需求方】整筆拒絕，reason 為該券的失敗代碼（別租戶 `TENANT_MISMATCH`；過期或尚未生效 `COUPON_EXPIRED`）。

## 工具錯誤
- 嘗試用 `python` 做 spec 文字替換：此環境沒有 Python（Microsoft Store alias），改用 Write/sed 完成。

### 3. speckit-clarify 【執行者】
- `check-prerequisites.ps1 -Json -PathsOnly` 成功（FEATURE_DIR=specs/001-multi-tenant-coupons）。
- 覆蓋掃描：資料模型（輸入／券值合法性）Partial、錯誤處理（多規則同時失敗的優先序、部分 reason 字串未定）Partial，其餘 Clear 或不適用（純函式無 NFR/整合）。
- 問滿 5 題，答案寫入 `## Clarifications / ### Session 2026-10-20`，並同步更新 FR-005/007/010/012/013/014、新增 FR-016～018、User Story 5、Edge Cases、Key Entities。
- checklist 重新驗證：16/16 → 16/16，無狀態變更。

### clarify 階段（問答）
4. 【執行者】orderAmount 為 0、負數或非整數時，拒絕並回固定 reason、照算、還是截到 0？
   【需求方】拒絕，reason 固定為 `INVALID_INPUT`。
5. 【執行者】券本身的值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）時，拒絕並回固定 reason 還是信任資料不驗證？
   【需求方】拒絕，reason 固定為 `INVALID_COUPON`。
6. 【執行者】多個規則同時失敗時，回報哪一個 reason？（建議順序：輸入→券值→租戶→重複→效期→最低消費→疊加→超額）
   【需求方】`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。
7. 【執行者】所有失敗 reason 是否都是固定大寫代碼？未達最低消費、不可疊加衝突、同一張券傳兩次的代碼各是什麼？
   【需求方】未達最低消費 `MIN_ORDER_NOT_MET`；兩張以上不可疊加、或不可疊加與可疊加混用 `NOT_STACKABLE`；同一張券（同 tenantId + code）傳兩次整筆拒絕 `DUPLICATE_COUPON`。
8. 【執行者】最低消費以折扣前還是折扣後金額判定？等於可不可以？
   【需求方】以折扣前訂單金額判定；等於可以。未達時整筆拒絕，reason 固定為 `MIN_ORDER_NOT_MET`。

## 執行者沒問、自行決定的假設
- 有效期間含頭含尾（validFrom ≤ now ≤ validTo），specify 階段寫入 Assumptions，未提問。
- 不可疊加券單獨一張可以使用（依需求第 4 條直接採用，未提問）。
- 百分比一律以折扣前金額計算、applied 依傳入順序（需求明寫，未提問）。
- 多張可疊加券的計算：各 PERCENT 以原始金額各自算後加總，再加所有 FIXED（由「百分比一律以折扣前金額計算」推導，未提問）。
- 傳入的 ISO 8601 時間字串視為格式正確，不處理無法解析的情況。
- specify 初稿在只拿到 `TENANT_MISMATCH`/`COUPON_EXPIRED`/`DISCOUNT_EXCEEDS_AMOUNT` 三個代碼時，先行以同樣命名風格草擬 `MIN_ORDER_NOT_MET`/`NOT_STACKABLE` 兩個代碼，後於 clarify 第 7 題向需求方確認取得正式答案。

### 4. speckit-plan 【執行者】
- `setup-plan.ps1 -Json` 成功，複製 plan 範本。
- Technical Context 無 NEEDS CLARIFICATION（技術棧由專案既定）。Constitution Check 五項全 PASS，設計後複檢仍 PASS。
- 產出：plan.md、research.md（6 項技術決策：Date.parse 比較、Number.isInteger、per-coupon floor、分階段規則評估、測試版面、barrel export）、data-model.md、contracts/applyCoupons.md、quickstart.md。
- 無需求方提問。

### 5. speckit-tasks 【執行者】
- `setup-tasks.ps1 -Json` 成功；AVAILABLE_DOCS = research.md, data-model.md, contracts/, quickstart.md。
- 產出 tasks.md：25 個任務、8 個 Phase（Setup 3、Foundational 4、US1 3、US2 3、US3 3、US4 3、US5 3、Polish 3）。測試任務依憲章第 III 條為必要，每個 story 先寫 Gherkin 再實作。
- 無需求方提問。

## 第二次中斷與恢復
- 外部 API 限額中斷，約在 08:00 前後；恢復時間：2026-10-20 15:14:55。中斷點：implement 進行中（T001–T006、各 story 的測試情境已寫好，stub 紅燈 37 failed / 4 passed 已確認），從實作 `applyCoupons` 接續。

### 6. speckit-implement（第 1 次）【執行者】
- `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` 成功；checklists/requirements.md 16/16 PASS，自動繼續。
- .gitignore 補 `dist/`、`build/`、`*.log`、`.env*`。
- 產出：`src/coupon.ts`（8 階段規則鏈）、`src/index.ts`（re-export）、`tests/support/world.ts`、`tests/steps/coupon.steps.ts`、`tests/features/coupon.feature`。
- TDD：stub 紅燈 41 scenarios（37 failed / 4 passed）→ 實作後 41 passed / 267 steps passed；各 tag：US1 5、US2 9、US3 7、US4 4、US5 16 全綠；`npm run typecheck` 0 錯誤。
- T023 追溯檢查發現 FR-010 沒有情境標記，補到 TENANT_MISMATCH 情境標題。tasks.md T001–T025 全部標 [X]。

### 7. speckit-converge 第 1 輪 【執行者】
- `check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks` 成功。
- 檢查 FR-001～018、SC-001～005、各 User Story 驗收情境、6 項 plan 決策、5 條憲章原則。
- 發現 1 項：F1 partial / LOW（T021、FR-017）— `minOrderAmount` 非整數判為 `INVALID_COUPON` 已實作但無測試情境。
- 結果 tasks_appended：新增 `## Phase 9: Convergence`，T026。

### 6'. speckit-implement（第 2 次）【執行者】
- 完成 T026：步驟改接受 `minimum order {float}`，新增 @US5 情境。`npm test` 42 scenarios / 273 steps 全部通過；typecheck 0 錯誤。T026 標 [X]。

### 7'. speckit-converge 第 2 輪 【執行者】
- 重新檢查，0 項發現 → ✅ Converged。tasks.md 未修改。

## Converge 輪數
- 共 2 輪（第 1 輪 tasks_appended 1 項 → implement → 第 2 輪 Converged）。

## 最終 npm test
- 42 scenarios (42 passed)、273 steps (273 passed)；`npm run typecheck` 通過。

## 工具錯誤（補充）
- Bash 中以 `||` 後備呼叫 `pwsh`：此環境無 `pwsh`（exit 127），改用 PowerShell 工具執行 .ps1 腳本；前面的 sed 與 log 寫入已成功。
