# BENCH-LOG — T5-B-r1（Spec Kit 流程）

## 時間
- 開始：2026-11-02 01:18:43
- 第 1 輪結束（提出 specify 階段 3 題，等待需求方）：見下方問答
- 第 1 次喚醒（Q1–Q3 答案）：2026-11-02 02:24:29
- 第 2 次喚醒（C1–C5 答案）：2026-11-02 02:27:31
- 結束：2026-11-02 03:00:24

## 問答原文

### 第 1 輪（speckit-specify 的 [NEEDS CLARIFICATION]，2026-11-02）

**Q1（FR-014／US2-3）**：保留已到期（不論排程是否已把它釋放）後才收到付款成功通知，系統應該怎麼處理？
- A：一律拒絕（回傳失敗），件數維持已釋放／待釋放狀態
- B：照樣成交，若件數已被釋放則再扣回一次（可能造成超賣，與需求 6 衝突）
- C：有條件成交：若保留尚未被排程釋放（狀態仍為保留中）就成交；若已釋放就拒絕
- Custom
- 答：A。以付款當下時間判斷：到期時刻（含）之後一律拒絕，回 `HOLD_EXPIRED`，即使排程還沒釋放；這張保留之後由排程照常釋放。

**Q2（FR-010／Edge Case）**：顧客要搶的件數大於目前剩餘件數時？
- A：整筆拒絕，不給任何件數
- B：部分成交，給顧客剩下的件數
- C：整筆拒絕，但回傳目前剩餘件數供顧客重試
- Custom
- 答：A。剛好等於可以搶到。不夠就整筆拒絕，回 `SOLD_OUT`，不部分保留。

**Q3（FR-003／US4-2）**：商家重複以同一搶購編號開檔時？
- A：拒絕，第一次設定為準
- B：覆寫為新設定（即使已有人搶到）
- C：只允許在開始時間之前覆寫，開始後拒絕
- Custom
- 答：A。saleId 已存在 → `DUPLICATE_SALE`，不改任何資料。

### 第 2 輪（speckit-clarify，2026-11-02）

**C1**：除了 `DUPLICATE_SALE`、`SOLD_OUT`、`HOLD_EXPIRED` 之外，其他失敗情況的原因代碼是否有指定？
- 建議：`INVALID_INPUT`（開檔參數不合法）、`SALE_NOT_FOUND`（搶購不存在）、`NOT_IN_SALE_PERIOD`（不在搶購期間）、`INVALID_QTY`（件數非正整數）、`LIMIT_EXCEEDED`（超過限購）、`HOLD_NOT_FOUND`（保留不存在）
- 答（自填）：
  - 開搶購：quantity 或 perCustomerLimit 不是正整數、saleId 為空、開始時間不早於結束時間 → `INVALID_INPUT`。
  - 搶購：qty 不是正整數，或 saleId／customerId／requestId 為空字串 → `INVALID_INPUT`；搶購編號不存在 → `SALE_NOT_FOUND`。以上都不改任何資料。
  - 不在期間：開始前回 `NOT_STARTED`，結束後回 `ENDED`。
  - 超過限購 `LIMIT_EXCEEDED`。
  - 保留找不到 `HOLD_NOT_FOUND`。

**C2**：搶購期間的邊界——開始時刻與結束時刻各自算不算在搶購期間內？
- A：開始（含）～結束（不含）  B：開始（含）～結束（含）  C：開始（不含）～結束（不含）
- 答：A。開始時刻（含）起可搶，結束時刻（含）起不可搶。

**C3**：同一請求編號第一次搶購失敗（例如 SOLD_OUT），之後用同一請求編號重送時？
- A：重新評估（失敗不記錄，重送時若有件數可成功）  B：記住失敗結果，重送回同樣失敗
- 答：A。前一次失敗：當成新請求重新判斷。（前一次成功：回同一張保留，同 holdId、同到期時間，不重複佔名額、不重算限購。）

**C4**：顧客限購額度的計算，已釋放（EXPIRED）的保留要不要算進去？
- A：不算（只算保留中 + 已成交）  B：算（搶過就佔額度，即使沒付款）
- 答：A。保留中與已成交都算；已到期釋放的不算（釋放後可以再搶）。超過就整筆拒絕，回 `LIMIT_EXCEEDED`。

**C5**：搶購結束時間之後，尚未到期的保留還能不能付款成交？
- A：可以（結束時間只限制搶購，不限制付款）  B：不行（結束後一律拒絕付款）
- 答：A。搶購結束只影響搶，不影響付款。

## 自行決定的假設
（specify 階段寫入 spec.md Assumptions 的技術／預設假設）
- 保留固定 10 分鐘，不可調整。
- 搶購期間 = 開始（含）～結束（不含）。
- 搶購結束後，未到期保留仍可付款。
- 限購額度只算 HELD + PAID，EXPIRED 不佔額度。
- requestId 由呼叫端產生；同 requestId 帶不同參數時以第一次成功結果為準。
- 不存在的 sale 查 remaining 回 0；對不存在 sale 搶購回失敗。
- 技術環境：使用專案既有 tsconfig / cucumber.cjs，不新增 runtime 依賴。
- （clarify 後）單筆 qty > perCustomerLimit 視為 LIMIT_EXCEEDED（需求方只說「超過限購」）。
- （clarify 後）搶購失敗代碼的檢查順序由實作者決定：INVALID_INPUT → SALE_NOT_FOUND → requestId 重送比對（前次成功直接回同一保留，即使已過結束時間） → NOT_STARTED/ENDED → LIMIT_EXCEEDED → SOLD_OUT。
- （plan）expiresAt 以 `new Date(ms).toISOString()` 輸出（含毫秒 .000Z）；時間比較用 Date.parse。
- （plan）holdId 格式 `{saleId}~{requestId}~{attempt}`；Store 鍵以 `fs:` 為前綴。
- （plan）名額以「槽位 set nx 宣告 + 世代釋放標記」實作，避免計數器在當機時漏件；代價是售罄時每次搶購最差掃描全部槽位。
- （clarify 後）perCustomerLimit > quantity 不視為 INVALID_INPUT（需求方未列入）。

## 各 skill 完成摘要
- **speckit-constitution**：`.specify/memory/constitution.md` v1.0.0（5 原則：TypeScript strict、cucumber-js BDD 紅→綠、src/tests 佈局、Shared-Store 正確性、簡單與決定性；技術約束、流程閘門、治理）。無 extensions.yml，略過 hooks。
- **speckit-specify**：建立 `specs/001-flash-sale/spec.md`、`checklists/requirements.md`、`.specify/feature.json`（feature_directory=specs/001-flash-sale）。5 個 User Story、22 條 FR、7 條 SC、10 條假設。3 個 [NEEDS CLARIFICATION]（FR-003、FR-010、FR-014）待需求方。Checklist 14/16 通過（2 項待釐清後補勾）。→ 第 1 次喚醒後已寫回答案（新增 Clarifications 區、FR-023 原因代碼），Checklist 16/16。
- **speckit-clarify**：check-prerequisites 取得 FEATURE_SPEC；覆蓋掃描後問 5 題（C1–C5），答案全部寫回 spec（Clarifications 區 +5 條、US1 新增情境 8–10、US2 新增情境 6、Edge Cases、FR-002/004/005/007/009/011/013/023、Assumptions 清理）。Checklist 維持 16/16。覆蓋摘要：功能範圍／資料模型／互動流程／邊界與失敗／術語 Resolved 或 Clear；非功能（效能數字、可觀測性）Outstanding 低影響；整合（金流重複通知）Clear。
- **speckit-plan**：setup-plan.ps1 複製模板；寫出 `plan.md`（Technical Context、Constitution Check 全 PASS、專案結構）、`research.md`（R1–R8：槽位宣告取代計數器、世代釋放標記避免 ABA、終態鍵互斥、requestId 映射與接手、排程列舉集合、時間格式、掃描起點、測試用記憶體 Store）、`data-model.md`（鍵空間、狀態機、不變量）、`contracts/flash-sale-api.md`（介面與原因代碼、檢查順序）、`quickstart.md`。
- **speckit-tasks**：setup-tasks.ps1 取得 AVAILABLE_DOCS（research／data-model／contracts／quickstart）；寫出 `tasks.md` 共 29 個任務、9 個 Phase（Setup 3、Foundational 2、US4 3、US1 5、US2 3、US3 3、US5 3、韌性 3、Polish 4）；每個 story 先測試後實作；MVP = US4 + US1。
- **speckit-implement**：check-prerequisites（tasks 存在）、checklist 16/16 PASS、.gitignore 補 `dist/ *.log .env*`。先寫 `tests/support/memory-store.ts`（記憶體 Store + 交錯／當機／卡住包裝器）、`tests/support/world.ts`、`tests/steps/flash.steps.ts`、6 個 feature 檔與 `src/flash.ts` 骨架 → 紅燈（115 scenarios 全 NOT_IMPLEMENTED、0 undefined）→ 寫完整實作 → 113/115 → 高競爭兩場景少賣（同顧客兩請求各佔一個顧客槽位互相卡死、搶購槽位尾端部分宣告）→ 加入 wait-die（holdId 小者優先、大者退讓重試、無法湊足立即判定不足）與殘留宣告自動釋放 → 114/115 → 最後一個是測試預期錯誤（混合件數下 6 件 + 剩 1 件是合法結果），改為「成功 + 剩餘 = 限量 且 剩餘 ≤ 1」→ 115/115 全綠、typecheck 0 錯誤、連跑 3 次穩定。tasks.md T001–T029 全部 [X]。README 補用法。

## converge 輪數
- 第 1 輪：check-prerequisites OK；對照 FR 23／SC 7／US 驗收情境 31／plan 決策 8／constitution 5 → 3 個 LOW findings（F1 unrequested：wait-die 未在 research.md 記錄；F2 partial：「同 requestId 不同參數重送」缺場景；F3 partial：SC-003／004 重送 100 次缺場景）→ tasks.md 追加 Phase 10 Convergence T030–T032 → 回 implement。
- implement 第 2 輪：research.md 補 R9（wait-die）、grab.feature +2 場景（不同參數重送、重送 100 次）、pay.feature +1 場景（付款通知 100 次）、steps +2；`npm test` 118 scenarios／1236 steps 全綠、typecheck 0 錯誤；T030–T032 [X]。
- 第 2 輪：重新對照 spec／plan／tasks／constitution，0 findings → **Converged**，tasks.md 未改動。
- 共 2 輪 converge（第 1 輪 tasks_appended、第 2 輪 converged）。

## 工具錯誤
- Write constitution.md 第一次失敗（工具要求先 Read 才可覆寫既有檔），Read 後重寫成功。
- 每次被喚醒後，對前一輪已 Read 過的檔案（spec.md、checklists/requirements.md、BENCH-LOG.md）做 Edit 會先失敗一次（「File has not been read yet」），重新 Read 後成功；共發生 2 次（第 1、2 次喚醒各一批）。
- 一次 Edit 的 old_string 打錯字（flash.ts 的 ClaimPass 型別註解）找不到目標，Grep 定位後重做成功。
- README.md 以 Write 覆寫前未 Read 失敗一次，Read 後成功。
- IDE 的 Cucumber 擴充套件對 .feature 回報「Undefined step」警告，係該擴充套件無法解析 tsx 載入的 TypeScript steps；實際 `npm test` 0 undefined，非真實錯誤。
- 無 Spec Kit 腳本錯誤；npm／tsc／cucumber 皆正常。
