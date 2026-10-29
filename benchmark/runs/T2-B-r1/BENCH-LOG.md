# BENCH-LOG — T2-B-r1（GitHub Spec Kit 流程）

- 開始時間：2026-10-20 02:45:16
- 中斷時間：約 2026-10-20 02:47（外部 API 限額；中斷於 speckit-specify 撰寫 spec.md 期間）
- 恢復時間：2026-10-20 07:24:50
- 結束時間：2026-10-20 07:36:07（流程完成；隨後執行 git commit）

## 角色切換紀錄與問答（執行者問 → 需求方答）

### speckit-specify 階段（[NEEDS CLARIFICATION] 三題）

- **Q1 執行者問**：已付款訂單取消並「退還全部已付金額」後，訂單紀錄要怎麼呈現？(A) refundedAmount 設為 paidAmount、paidAmount 保留；(B) paidAmount 歸零；(C) 只改狀態。
  **需求方答**：狀態 `CANCELLED`；refundedAmount = paidAmount。（Option A）
- **Q2 執行者問**：退款金額為 0、負數或非整數時要失敗嗎？
  **需求方答**：0 或負數拒絕，reason 固定為 `INVALID_AMOUNT`。非整數的部分你決定，照你的最佳判斷。
- **Q3 執行者問**：失敗原因 `reason` 要採固定機器可讀代碼還是人類可讀句子？用什麼語言？要不要逐一列舉？
  **需求方答**：固定英文代碼：`INVALID_AMOUNT`、`AMOUNT_MISMATCH`、`INVALID_TRANSITION`、`REFUND_EXCEEDS_PAID`。檢查順序：先狀態（INVALID_TRANSITION）→ 再金額合法性（INVALID_AMOUNT）→ 再金額比對（AMOUNT_MISMATCH / REFUND_EXCEEDS_PAID）。

### speckit-clarify 階段（5 題，逐題提問）

- **C1 執行者問**：已出貨的訂單可以取消嗎？（A 可以並退還全部已付；B 不可以，拒絕；建議 B）
  **需求方答**：不能，拒絕。reason 固定為 `INVALID_TRANSITION`。
- **C2 執行者問**：已付款但尚未出貨的訂單可以直接申請退款嗎？（A 可以；B 不可以要走取消；建議 B）
  **需求方答**：不行，要走取消。reason 固定為 `INVALID_TRANSITION`。
- **C3 執行者問**：已取消或已退款的訂單，之後任何操作（付款、出貨、取消、退款）都要一律拒絕嗎？（A 是；B 否；建議 A）
  **需求方答**：全部不能，reason 固定為 `INVALID_TRANSITION`。
- **C4 執行者問**：單次退款超過剩餘可退金額（已付 − 累計已退）時，整筆拒絕還是自動截斷？（A 整筆拒絕；B 截斷；建議 A）
  **需求方答**：整筆拒絕不截斷，reason 固定為 `REFUND_EXCEEDS_PAID`。
- **C5 執行者問**：建立訂單時需要驗證識別碼嗎（例如空字串要拒絕嗎）？（A 要；B 不驗證；建議 B）
  **需求方答**：你決定，照你的最佳判斷。→ 執行者採 B（不驗證 id）。

## 執行者未問、自行決定的假設

- 非整數金額（如 10.5）在 createOrder / pay / refund 一律視為無效金額，回傳 `INVALID_AMOUNT`（Q2 需求方說「你決定」）。
- 訂單 id 不做驗證（空字串也接受），不驗唯一性、不持久化。
- CANCELLED 與 REFUNDED 視為終態。
- 付款必須一次付清，不支援部分付款。
- 功能範圍不含並行、時間、通知、外部金流。

## Skill 完成摘要

### 1. speckit-constitution
- 以 resolve-template.ps1 取得 constitution-template，寫入 .specify/memory/constitution.md v1.0.0（Ratified 2026-10-20）。
- 五原則：I TypeScript-only 於 src/、II Gherkin + cucumber-js 於 tests/、III `npm test` 唯一關卡（NON-NEGOTIABLE）、IV Test-first、V 純函式領域邏輯。另加 Technology Constraints、Development Workflow、Governance。
- 無 .specify/extensions.yml，前後 hook 皆略過。

### 2. speckit-specify
- create-new-feature.ps1 建立 specs/001-order-state-machine/（sequential 編號），.specify/feature.json 已寫入。
- spec.md：4 個 User Story（建單付款 P1、出貨 P2、取消 P2、分次退款 P3）、Edge Cases、FR-001～FR-015、Key Entities、SC-001～SC-005、Assumptions。
- 3 個 [NEEDS CLARIFICATION]（Q1–Q3）向需求方提問後寫回；checklists/requirements.md 全部通過。

### 3. speckit-clarify
- check-prerequisites.ps1 -Json -PathsOnly 取得路徑。
- 覆蓋掃描：Lifecycle/state transitions 與 Edge cases 為 Partial，其餘 Clear 或不適用（純函式庫無 NFR/整合）。
- 問 5 題（C1–C5），新增 `## Clarifications / ### Session 2026-10-20`，更新 US3、US4、Edge Cases、Assumptions。
- checklist 重驗：16/16 → 16/16，無狀態變化。

### 4. speckit-plan
- setup-plan.ps1 複製範本後填寫 plan.md：Technical Context（TS 5.6 / Node 24 / cucumber-js 11 / 無執行期依賴）、Constitution Check 六項全 PASS、Project Structure（src/order.ts、tests/features、tests/steps、tests/support）。
- Phase 0 research.md：6 項決策（守衛式轉移、REASONS 常數與判定順序、`Number.isInteger && > 0`、快照驗證純函式、單一 feature 檔用 Rule 分組、node:assert/strict）。
- Phase 1：data-model.md（欄位不變條件、轉移表、判定順序）、contracts/order-api.md（固定介面 + 行為契約表）、quickstart.md。

### 5. speckit-tasks
- setup-tasks.ps1 取得範本與 AVAILABLE_DOCS（research/data-model/contracts/quickstart）。
- tasks.md 共 29 任務：Setup T001–T003、Foundational T004–T007、US1 T008–T013、US2 T014–T017、US3 T018–T021、US4 T022–T025、Polish T026–T029；每個 story 皆含「先寫測試並觀察紅燈」任務。

### 6. speckit-implement
- check-prerequisites -RequireTasks 通過；checklists/requirements.md 16/16 PASS 自動放行。
- .gitignore 補 dist/、build/、*.log、.env*。
- T001 基線：npm test 0 scenarios、typecheck 通過。
- 測試先行：tests/support/world.ts、tests/features/order-state-machine.feature（7 個 Rule、46 scenarios，含 15 格非法轉移矩陣 Scenario Outline 與 4 個純函式情境）、tests/steps/order.steps.ts；src/order.ts 先放 NOT_IMPLEMENTED 骨架。
- 紅燈觀察：46 scenarios / 46 failed（全為 NOT_IMPLEMENTED），0 undefined、0 ambiguous；typecheck 通過。
- 實作 createOrder / pay / ship / cancel / refund 後：46 scenarios (46 passed)、183 steps (183 passed)；typecheck 通過。
- 29 個任務全部標記 [X]。
- 執行方式備註：四個 story 的 feature/steps 任務共用同兩個檔案，故一次寫完全部測試→觀察紅燈→一次實作五個函式→綠燈（仍符合先紅後綠）。

### 7. speckit-converge
- 第 1 輪：check-prerequisites -RequireSpec -RequireTasks 通過。比對 15 FR / 5 SC / 23 驗收情境 / 8 Edge Cases / 6 plan 決策 / 5 憲法原則。發現 1 筆 LOW partial（F1：Edge Case「id 不驗證、空字串亦接受」無驗收情境）→ 追加 `## Phase 8: Convergence` T030（tasks_appended）。
- 回到 implement：新增情境「空字串 id 也可建立訂單」與步驟 `Then 訂單的 id 為 {string}`；npm test 47 scenarios (47 passed)、186 steps (186 passed)；typecheck 通過；T030 標記 [X]（30/30）。
- 第 2 輪：0 findings → ✅ Converged；tasks.md 位元組未變（md5 60d707b8996b6644c817fe8766690467 前後相同）。

## Converge 輪數

2 輪（第 1 輪 tasks_appended 1 筆 → implement → 第 2 輪 Converged）。

## 最終 npm test 摘要

- `npm test`：47 scenarios (47 passed)、186 steps (186 passed)，0 undefined / pending / ambiguous。
- `npm run typecheck`：通過（exit 0）。

## 工具錯誤

- 02:47 Bash heredoc 一次寫 spec.md + checklist 時 shell 解析錯誤（unexpected EOF），兩檔皆未寫入；改用 Write 工具重寫。
- 02:47 外部 API 限額中斷，07:24:50 恢復後從 speckit-specify 接續。
- 07:25 `python` 不存在於此 Windows 環境（Store alias），改用 Write 工具編輯 log。
- 07:33 編輯 .feature 後 IDE 診斷 hook 回報大量「Undefined step」警告（編輯器的 Cucumber 擴充不解析 .ts steps），非阻斷；實際 `npm test` 0 undefined，忽略。
- Spec Kit 的 PowerShell 腳本（resolve-template / create-new-feature / check-prerequisites / setup-plan / setup-tasks）全部正常執行，無錯誤。
