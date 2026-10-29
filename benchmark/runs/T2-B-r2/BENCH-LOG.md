# BENCH-LOG — T2-B-r2（Spec Kit 流程）

- 開始時間：2026-10-20 02:45:16
- 中斷：約 02:47 外部 API 限額中斷（speckit-specify 寫檔指令尚未執行成功）
- 恢復時間：2026-10-20 07:24:50
- 結束時間：2026-10-20 07:37:01

## 角色切換紀錄與問答（執行者問了什麼 → 需求方答了什麼）

### speckit-specify 階段（[NEEDS CLARIFICATION] 標記，執行者 → 需求方）

- Q1（FR-007）執行者問：已付款訂單取消時「退還全部已付金額」要怎麼反映在訂單金額欄位？A) refundedAmount = paidAmount、paidAmount 不變；B) paidAmount 歸 0；C) 兩欄都不變、由狀態隱含。
  → 需求方答：A。狀態 `CANCELLED`；refundedAmount = paidAmount。
- Q2（FR-012）執行者問：各操作是否要驗證輸入金額（拒絕非整數、0、負數的付款／退款金額，以及非整數的訂單金額），還是只強制需求明寫的規則？
  → 需求方答：退款金額為 0 或負數 → 拒絕，reason 固定 `INVALID_AMOUNT`；建立訂單金額 0 或負數 → 拒絕，reason `INVALID_AMOUNT`；付款金額不等於訂單金額（少付或多付）→ 拒絕，reason 固定 `AMOUNT_MISMATCH`，不允許部分付款。非整數金額：你決定，照你的最佳判斷。
- Q3（FR-013）執行者問：失敗原因的格式？A) 中文自由句；B) 英文自由句；C) 固定代碼。
  → 需求方答：C。固定英文代碼 `INVALID_AMOUNT`、`AMOUNT_MISMATCH`、`INVALID_TRANSITION`、`REFUND_EXCEEDS_PAID`。檢查順序：先狀態（INVALID_TRANSITION）→ 再金額合法性（INVALID_AMOUNT）→ 再金額比對（AMOUNT_MISMATCH / REFUND_EXCEEDS_PAID）。

### speckit-clarify 階段（執行者 → 需求方，逐題）

- C1 執行者問：已付款但尚未出貨的訂單，可以直接用 refund 退款嗎？還是只能走取消？（建議 B 不行）
  → 需求方答：B。不行，要走取消。reason 固定為 `INVALID_TRANSITION`。
- C2 執行者問：已取消、已退款是不是終態——對它們做付款／出貨／取消／退款是否全部拒絕？（建議 A 是）
  → 需求方答：A。已取消的訂單付款／出貨／退款／再取消全部不能，reason 固定 `INVALID_TRANSITION`；已退款的訂單再退款／出貨／取消／付款全部不能，reason 固定 `INVALID_TRANSITION`。
- C3 執行者問：單次退款超過剩餘可退金額（已付 − 累計已退）時，整筆拒絕還是截斷到剩餘額？（建議 A 整筆拒絕）
  → 需求方答：A。整筆拒絕不截斷，reason 固定為 `REFUND_EXCEEDS_PAID`。
- C4 執行者問：對已建立訂單付款金額為 0 或負數時，reason 是 `INVALID_AMOUNT` 還是 `AMOUNT_MISMATCH`？（建議 A）
  → 需求方答：照檢查順序：先狀態（INVALID_TRANSITION）→ 再金額合法性（INVALID_AMOUNT）→ 再金額比對（AMOUNT_MISMATCH）。即 A。
- C5 執行者問：建立訂單時 id 要不要驗證（例如空字串拒絕）？（建議：不驗證）
  → 需求方答：你決定，照你的最佳判斷。

## 執行者沒問、自行決定的假設

- 非整數金額（10.5、NaN、Infinity）一律視為不合法金額，回 `INVALID_AMOUNT`（Q2 需求方回「你決定」）。
- 訂單 id 不做任何驗證，空字串也接受（C5 需求方回「你決定」）。
- 訂單為純記憶體值，不處理持久化、並行或 id 唯一性。
- 成功時回傳的新 order 物件是淺拷貝（欄位皆為原始型別，淺拷貝即足夠），不修改傳入物件。
- 已取消的已建立訂單：paidAmount = 0、refundedAmount = 0（依需求 4/5 推得，未另問）。
- 部分退款後狀態維持 SHIPPED、refundedAmount 累加（依需求 6/7 推得，未另問）。
- 已出貨訂單不能取消（依需求 4「已建立或已付款可以取消」反推，未另問）。
- 專案不新增任何 npm 依賴；feature 檔放 tests/features/，steps 放 tests/steps/，共用 world 放 tests/support/。
- Gherkin 以英文撰寫，狀態值用介面的英文代碼（CREATED 等）。

（一行一個）

## 各 skill 完成摘要

1. **speckit-constitution**：以 resolve-template.ps1 取得範本，寫入 `.specify/memory/constitution.md` v1.0.0（五原則：TypeScript Only、cucumber-js BDD、`npm test` 單一品質閘、src/ 與 tests/ 佈局、簡單與純函式；另有技術限制、開發流程、治理）。無 extensions.yml，略過 hooks。
2. **speckit-specify**：短名 `order-state-machine`，sequential 編號 → `specs/001-order-state-machine/`；寫入 `.specify/feature.json`、`spec.md`（3 個 user story、17 條 FR、4 條 SC、邊界案例、假設）、`checklists/requirements.md`。留下 3 個 [NEEDS CLARIFICATION]（FR-007/012/013）向需求方提問 Q1–Q3，回答後併入 spec，checklist 16/16 通過。
3. **speckit-clarify**：check-prerequisites.ps1 取路徑；分類掃描後提出 5 題（C1–C5），答案寫入 `## Clarifications / ### Session 2026-10-20`，並更新 FR-009、FR-011、新增 FR-016、FR-017、Edge Cases、Assumptions。checklist 重新驗證 16/16 → 16/16。
4. **speckit-plan**：setup-plan.ps1 複製範本；產出 `plan.md`（Technical Context 無未知、Constitution Check 五項 PASS、專案結構）、`research.md`（R1–R6 決策）、`data-model.md`（實體、不變量、轉移表）、`contracts/order-api.md`、`quickstart.md`。
5. **speckit-tasks**：setup-tasks.ps1；產出 `tasks.md` 共 23 個任務（Setup 2、Foundational 3、US1 6、US2 5、US3 4、Polish 3），含測試先行任務。
6. **speckit-implement**：check-prerequisites（RequireTasks）；checklist 閘 16/16 PASS；`.gitignore` 補 `dist/ build/ *.log .env*`。T001 基線 0 scenarios；T003 `tests/support/world.ts`、T004 `src/order.ts`（先 stub）、T005 `tests/steps/order.steps.ts`；US1 feature → 紅（17 失敗）→ 實作 createOrder/pay → 13/17 綠（4 個需後續 fixture）；US2 → 紅（27 中 14 失敗）→ ship/cancel → 24/27；US3 → 紅（41 中 17 失敗）→ refund → **41 scenarios / 213 steps 全綠**，`tsc --noEmit` 乾淨；移除 NOT_IMPLEMENTED stub；追溯 FR-001…FR-017 與需求 1–8 皆有對應情境；23 個任務全標 [X]。
   - 補充：World 多加了 `input` 欄位（tasks.md T003 原列 order/snapshot/result 三欄），用於純函式比對。
7. **speckit-converge**：見下方「converge 輪數」；結果 Converged。最終 `npm test`：41 scenarios (41 passed)、213 steps (213 passed)、約 0.02 s；`npm run typecheck` 無錯誤。

## converge 輪數

- 共 1 輪。Round 1（speckit-converge）：check-prerequisites（RequireSpec+RequireTasks）後，逐項比對 FR-001…FR-017、SC-001…SC-004、US1–US3 全部驗收情境與 Edge Cases、plan 決策 R1–R6 與專案結構、23 個任務、憲章原則 I–V；另以 node 探針驗證 NaN/Infinity、終態、檢查順序、純函式。零 findings（missing / partial / contradicts / unrequested 皆 0）→ 回報 Converged，tasks.md 未變動（未新增 Convergence phase），不需回到 implement。

## 工具錯誤

- 02:47 左右：speckit-specify 寫 spec.md 的 bash heredoc 指令出現 `unexpected EOF while looking for matching '` 解析錯誤，未寫入任何檔案；之後外部 API 限額中斷。恢復後改用 Write 工具寫檔。
- 07:2x：bash 內呼叫 `python` 失敗（Windows 沒有安裝 Python，只有 Store 別名）；改用 Edit 工具更新 BENCH-LOG.md。

