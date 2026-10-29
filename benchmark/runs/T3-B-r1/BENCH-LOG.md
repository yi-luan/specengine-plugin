# BENCH-LOG — T3-B-r1（Spec Kit 流程）

- 開始時間：2026-10-20 07:43:49
- 中斷：約 07:47（session 意外結束，於 specify 寫回 Q1 答案後）
- 恢復時間：2026-10-20 07:51:42（從中斷處續跑，未重頭開始）
- 中斷 2：約 08:00 前後（外部 API 限額中斷，於 implement 紅燈驗證後：44 scenarios 全紅、typecheck 通過）
- 恢復時間 2：2026-10-20 15:14:53（從中斷處續跑，未重頭開始）
- 結束時間：2026-10-20 15:15:37

## 角色切換紀錄

- [執行者] 07:43 開始。讀取 requirement.md、專案基底（package.json / cucumber.cjs / tsconfig.json）。
- [執行者] speckit-constitution：無 `.specify/extensions.yml`（無 hook）。`resolve-template.ps1 constitution-template -Json` 成功。寫入 `.specify/memory/constitution.md` v1.0.0。

## 問答紀錄（執行者問 → 需求方答）

### speckit-specify（[NEEDS CLARIFICATION] 三題）

1. [執行者] Q1 不可疊加券與可疊加券混用：「不可疊加」是指整單只能有這一張券（不能與任何其他券並用），還是只限制同單最多一張不可疊加券、仍可與可疊加券並用？（A 單獨使用 / B 可與可疊加券並用）
   → [需求方] 整筆拒絕，不可疊加的券只能單獨用。reason `NOT_STACKABLE`。
2. [執行者] Q2 多張券中有一張無效（跨租戶、過期、未達最低消費）時：整筆結帳整體失敗（all-or-nothing），還是略過無效券、套用其餘有效券？
   → [需求方] 整筆拒絕。reason 固定為：跨租戶 `TENANT_MISMATCH`；過期或尚未生效 `COUPON_EXPIRED`（未生效也用同一代碼）；未達最低消費 `MIN_ORDER_NOT_MET`。
3. [執行者] Q3 百分比折扣算出小數（15% × 333 = 49.95）時：無條件捨去、四捨五入、還是無條件進位？
   → [需求方] 每張 PERCENT 的折扣額各自無條件捨去取整數。

### speckit-clarify（5 題，一次一題）

4. [執行者] 現在時間剛好等於 `validFrom` 或 `validTo` 的那一刻，優惠券算不算在有效期間內？（A 兩端都算 / B 含起不含迄 / C 兩端都不算；建議 A）
   → [需求方] A：都算有效（含頭含尾）。以時間戳比較：validFrom ≤ now ≤ validTo。
5. [執行者] 折扣總額超過訂單金額時，應把折扣後金額截斷為 0，還是整筆拒絕？（A 截斷 / B 拒絕；建議 A）
   → [需求方] B：整筆拒絕。reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。總折扣剛好等於訂單金額可以，finalAmount = 0。
6. [執行者] 傳入的優惠券清單中同一張券（同租戶同代碼）出現兩次時，應如何處理？（A 去重 / B 拒絕 / C 算兩次；建議 B）
   → [需求方] B：整筆拒絕。reason 固定為 `DUPLICATE_COUPON`。
7. [執行者] 訂單金額為 0、負數或非整數時，應如何處理？（A 0 合法、其餘拒絕 / B 一律拒絕 / C 不驗證；建議 B）
   → [需求方] B：拒絕，reason 固定為 `INVALID_INPUT`。
8. [執行者] 同一筆結帳同時命中多種錯誤時，應依什麼順序檢查並回報哪一個原因？（建議：輸入合法性 → 租戶 → 重複 → 期間 → 最低消費 → 疊加 → 超額，回報第一個命中）
   → [需求方] `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。

## 執行者未問、自行決定的假設

- `INVALID_COUPON` 判定條件：type 非 PERCENT/FIXED、value 非整數、PERCENT 不在 0～100、FIXED < 0、minOrderAmount 有設定但為負或非整數、validFrom/validTo 無法解析、validFrom > validTo（需求方只給代碼與順序，未定義條件）。
- PERCENT value = 0、FIXED value = 0 視為合法券。
- `now` 無法解析時回 `INVALID_INPUT`。
- 最低消費以折扣前（原始）訂單金額判定（未提問，由 FR-010 類推）。
- 重複判定 key 為 tenantId + code。
- 不可疊加判定：券數 > 1 且任一張 stackable=false 即 NOT_STACKABLE（不論順序）。
- 成功時 applied 為全部傳入券代碼（all-or-nothing 下即全部套用）。
- 時間以 Date.parse 毫秒時間戳比較，支援時區偏移。
- 失敗 reason 僅回傳固定代碼字串，不附說明文字。

## 各 skill 完成摘要

### 1. speckit-constitution
- 產出 `.specify/memory/constitution.md` v1.0.0（Ratified 2026-10-20）。
- 五條原則：I TypeScript Only、II cucumber-js BDD（NON-NEGOTIABLE）、III `npm test` 單一入口、IV src/ 與 tests/ 分層、V 純函式與整數金額。
- 附 Technology Stack & Layout、Development Workflow、Governance。
- 無 deferred non-governance intents。

### 2. speckit-specify
- 無 hook。`feature_numbering: sequential`，specs/ 不存在 → `specs/001-multi-tenant-coupons/`。
- `resolve-template.ps1 spec-template -Json` 成功；寫入 `.specify/feature.json`。
- 產出 `spec.md`（4 個 User Story、Edge Cases、FR-001～FR-014、SC-001～SC-005、Assumptions）與 `checklists/requirements.md`。
- 3 個 [NEEDS CLARIFICATION]（混用疊加、部分失效、百分比捨入）→ 提問 Q1～Q3 → 答案寫回。checklist 16/16 通過。

### 3. speckit-clarify
- `check-prerequisites.ps1 -Json -PathsOnly` 成功。
- 問 5 題（邊界含否、超額處理、重複券、無效訂單金額、錯誤優先序）。
- 新增 `## Clarifications / ### Session 2026-10-20`；更新 US4 情境、Edge Cases、FR-003/006/007/011/012，新增 FR-015（錯誤順序）、FR-016（INVALID_COUPON）、Assumptions。
- checklist 重新驗證 16/16 → 16/16，無變化。

### 4. speckit-plan
- `setup-plan.ps1 -Json` 成功複製 plan 模板。
- Technical Context 無 NEEDS CLARIFICATION（TS 5.9.3 / Node 24.18 / cucumber 11.3 / tsx 4.23）。
- Constitution Check 五條原則 pre/post 皆 PASS，無 Complexity Tracking。
- 產出 plan.md、research.md（D1～D6 決策）、data-model.md、contracts/coupon-api.md、quickstart.md。
- 結構：`src/coupon.ts`、`tests/features/coupon.feature`、`tests/steps/coupon.steps.ts`、`tests/support/world.ts`。

### 5. speckit-tasks
- `setup-tasks.ps1 -Json` 成功（AVAILABLE_DOCS：research.md、data-model.md、contracts/、quickstart.md）。
- 產出 tasks.md 共 25 個任務：Setup 3、Foundational 3、US1 3、US2 6、US3 4、US4 2、Polish 4。
- 因憲章原則 II 要求 BDD 測試，各 story 皆含「先寫情境再實作」任務。
- 並行機會：T002/T003；其餘因共用 `src/coupon.ts` 與 `coupon.feature` 而循序。MVP = US1。

### 6. speckit-implement
- `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` 成功；checklist 閘門 requirements.md 16/16 PASS。
- `.gitignore` 補 `dist/`、`build/`、`*.log`、`.env*`。
- 先寫 `tests/support/world.ts`、`tests/steps/coupon.steps.ts`、`tests/features/coupon.feature`（44 scenarios）與 stub `src/coupon.ts` → `npm test` 44/44 紅燈、typecheck 通過。
- （中斷 2 於此）恢復後實作 `src/coupon.ts`（固定順序檢查管線 + 折扣計算）→ 44 scenarios / 238 steps 全綠、typecheck 0 錯誤。tasks.md T001～T025 全部標 [X]。

### 7. speckit-converge
- 第 1 輪：`check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks` 成功；無 extensions.yml。
- 檢查 FR-001～FR-016、SC-001～SC-005、US1～US4 共 21 個驗收情境、plan 4 個檔案觸點、憲章 I～V。
- 0 findings（missing 0 / partial 0 / contradicts 0 / unrequested 0）→ ✅ Converged；tasks.md 未修改。

## converge 輪數

1 輪（第 1 輪即 Converged，無需回 implement）。

## 工具錯誤

- 收尾時以 bash 呼叫 `python` 改寫 BENCH-LOG 失敗（`Python was not found`，環境無 Python），導致第一次 commit 的 BENCH-LOG 仍含「待填」；改用 Edit 工具補齊後另以第二個 commit 提交。
- 流程中斷 2 次（非工具錯誤）：約 07:47 session 意外結束（07:51:42 恢復）；約 08:00 外部 API 限額（15:14:53 恢復）。兩次皆從中斷處續跑。

## npm test 最終摘要

44 scenarios (44 passed) / 238 steps (238 passed)；`npm run typecheck` 0 錯誤。
