# BENCH-LOG — T4-B-tm-r1 payment（Spec Kit 流程）

## 時間
- 開始：2026-11-01 02:52:05
- 第 1 次【待答】送出：2026-11-01 02:55（specify Q1–Q3）
- 第 1 次被喚醒：2026-11-01 02:55:39
- 第 2 次【待答】送出：2026-11-01 02:58（clarify Q4）
- 第 2 次被喚醒：2026-11-01 02:58:31
- 結束：2026-11-01 03:07:30

## 工具錯誤
- 02:54 Write spec.md 被拒（create-new-feature.ps1 已先從範本建立該檔，Write 要求先 Read）；Read 後重寫成功。非流程性錯誤。
- 02:56 被喚醒後 11 個 Edit 全部被拒（喚醒後檔案讀取狀態重置，需先 Read）；重新 Read 三個檔案後重做成功。非流程性錯誤。
- 03:03 Write src/payment.ts 被拒（該檔先前只用 bash cat 看過，未用 Read 工具）；Read 後重寫成功。非流程性錯誤。

## 自行決定的假設
- A1 技術環境：`.specify/extensions.yml` 不存在，所有 skill 的 extension hooks 跳過。
- A2 15 分鐘逾時由訂單服務負責；付款服務把逾時取消視同一般 `OrderCancelled`，付款服務不需要時間概念。
- A3 建構時未列入的顧客餘額視為 0，`getBalance` 回 0。
- A4 金額為非負整數；負金額不在範圍。
- A5 付款服務只對 `OrderPlaced`（記住顧客與金額）、`StockReserved`、`OrderCancelled` 有反應，其餘事件回空陣列。
- A6 餘額剛好等於金額視為足夠；金額 0 的訂單扣款必成功。
- A7（Q3 需求方交由我決定）`StockReserved` 先於 `OrderPlaced` 到達時，記住「已保留」，待 `OrderPlaced` 到達時立即扣款並在該次 `handle(OrderPlaced)` 回傳結果事件；若在此之前已收到 `OrderCancelled` 則不扣款。理由：至少一次送達不保證會重送，丟掉會讓訂單卡到逾時。
- A8（Q4 需求方只裁示同 id 去重，其餘交由我決定）扣款失敗為該訂單終局：之後即使是新 id 的 `StockReserved` 也不再扣款、不發事件，每張訂單最多一個付款結果事件。理由：庫存已依規則 5 釋放、訂單已標付款失敗，避免同事服務要處理「失敗後翻成功」。

## 問答原文

### 第 1 輪（speckit-specify）
- Q1：當訂單被取消（顧客取消或 15 分鐘逾時），但付款服務從未成功扣款（付款失敗、或取消比 `StockReserved` 先到），付款服務要發一個 amount 為 0 的 `PaymentRefunded`，還是什麼都不發？（A 什麼都不發 / B 一律發 amount 0 / Custom）
  - 答：**Q1: A**。已扣款才退，全額退，同一張訂單最多退一次；沒扣過款就不退、不發事件。
- Q2：若付款服務已先收到某訂單的 `OrderCancelled`，之後才收到該訂單的 `StockReserved`，應該忽略（不扣款、不發事件），還是照常扣款後立刻退款，或發 `PaymentFailed`？（A 忽略 / B 扣款後退款 / C 發 PaymentFailed / Custom）
  - 答：**Q2: A**。付款服務記住這張訂單已取消；之後到的 `StockReserved` 不扣款、不發任何事件。
- Q3：若付款服務先收到 `StockReserved` 才收到 `OrderPlaced`，應該記住「已保留」並在 `OrderPlaced` 到達時立即扣款，還是忽略那次 `StockReserved`？（A 記住並於 OrderPlaced 時扣款 / B 忽略 / Custom）
  - 答：**Q3: 你決定，照你的最佳判斷。** → 自行決定採 A（見假設 A7）。

### 第 2 輪（speckit-clarify）
- Q4：付款因餘額不足而失敗（已發出 `PaymentFailed`）之後，如果同一張訂單的 `StockReserved` 又被重複送達，付款服務要再試一次扣款，還是把這張訂單視為「已終局失敗」、不再扣款也不再發事件？（Recommended A 終局失敗 / B 每次重試 / C 重試但只在成功時發事件 / Short）
  - 答：**同一個事件（同 id）重複送達時，第二次起直接忽略，不改任何狀態、不發任何事件。其他情況你決定，照你的最佳判斷。** → 事件層以 id 去重（FR-004a）；新 id 的 `StockReserved` 遇到已失敗訂單：自行決定不重試（見假設 A8、FR-012）。

## 各 skill 完成摘要
- speckit-constitution（02:52–02:53）：以 resolve-template.ps1 解析範本，寫成 `.specify/memory/constitution.md` v1.0.0。五原則：共用契約不可改、服務獨立擁有與隔離、測試先行（cucumber-js、`npm test`）、事件傳遞健壯性（冪等、亂序）、簡單與確定性。技術約束：TypeScript、產品碼 src/、測試 tests/。
- speckit-specify（02:53–02:55）：以 create-new-feature.ps1 建立 `specs/001-payment-service/`，寫 spec.md（3 個 user story、11 條 FR、5 條 SC）與 checklists/requirements.md。留 3 個 [NEEDS CLARIFICATION]（上限 3），轉為【待答】Q1–Q3。02:56 喚醒後把 Q1–Q3 答案寫回 spec（User Story 2/3 情境、FR-005、FR-011、Key Entities、Assumptions、新增 Clarifications 區）；checklist 全數通過。
- speckit-clarify（02:57 開始）：check-prerequisites.ps1 -Json -PathsOnly 取得路徑。覆蓋掃描：功能範圍／資料模型／互動流程／整合／術語／完成訊號皆 Clear；非功能（效能、觀測）對記憶體內服務不適用；邊界情境剩 1 個高影響未決：付款失敗後 `StockReserved` 重送是否重試扣款。轉為【待答】Q4（一次一題，上限 5）。02:58 喚醒後把 Q4 答案寫回 spec（Story 3 新增情境 7/8、Edge Cases、FR-002、FR-004 拆為事件層／訂單層、新增 FR-012、Clarifications、Assumptions）。其餘類別無值得再問的高影響項，問 1 題即止。checklist 重驗 16/16 → 16/16，無狀態變化。
- speckit-plan（02:59–03:01）：setup-plan.ps1 複製範本後填寫 plan.md（Technical Context、Constitution Check 五門全 PASS、專案結構），research.md（R1 事件 id 去重 Set、R2 每訂單狀態機 + 單一 tryCharge、R3 `pay-`+randomUUID、R4 餘額複本、R5 測試架構），data-model.md（CustomerBalance、OrderRecord、HandledEventIds、狀態轉移），contracts/payment-service.md（handle 行為表），quickstart.md。無 NEEDS CLARIFICATION。
- speckit-tasks（03:01–03:02）：setup-tasks.ps1 取得範本；tasks.md 共 21 個任務：Setup 3、Foundational 3、US1 4、US2 4、US3 4、Polish 3。含測試任務（憲法要求測試先行）。MVP = US1。
- speckit-implement（03:02–03:06）：check-prerequisites -RequireTasks 通過；checklist 16/16 PASS 自動續行；.gitignore 補 `dist/ *.log .env*`。TDD 順序：T004 骨架（只做事件 id 去重）→ US1 feature 12 情境紅燈（6 失敗 6 通過）→ T009 實作 tryCharge → US2 feature 紅燈（5 失敗）→ T013 實作 OrderCancelled 退款 → US3 feature 11 情境（因去重 Set 與單一 tryCharge 路徑已滿足，直接全綠，T017 無需改動）。最終 `npm run typecheck` 無錯、`npm test`：29 scenarios (29 passed), 198 steps (198 passed)。tasks.md 21/21 標 [X]。檔案：src/payment.ts、tests/features/payment.feature、tests/steps/payment.steps.ts、tests/support/world.ts、tests/support/hooks.ts。
- speckit-converge 第 1 輪（03:06–03:07）：check-prerequisites -RequireSpec -RequireTasks 通過。以 spec（FR-001～012、SC-001～005、16 個驗收情境、7 個邊界）、plan（R1～R5、檔案結構）、constitution（I～V；git status 確認 src/ 只動 payment.ts）逐項比對程式碼：0 missing / 0 partial / 0 contradicts / 0 unrequested。結果 **Converged**，tasks.md 未改動。converge 輪數：1。
