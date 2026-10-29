# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

〔初稿建立：2026-10-20 07:43，plugin 版本 2.0.0〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 〔待確認〕（掃描當下 `src/` 僅有空的 `index.ts`，無法判定；屬團隊決策）
- Source Root Directory: `src/`，直接證據：README.md「產品代碼在 `src/`」、tsconfig.json include `src/**/*.ts`【必填】
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: `tests/`，直接證據：tsconfig.json include `tests/**/*.ts`、cucumber.cjs import 設定
- Step Definitions Directory: `tests/steps/`，直接證據：README.md「Step Definitions 在 `tests/steps/`」、cucumber.cjs import `tests/steps/**/*.ts`【必填】
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。
  - 補充：cucumber.cjs 另匯入 `tests/support/**/*.ts`（hooks／World 用，目前為空目錄）；feature 搜尋路徑為 `.specengine/spec/features/**/*.feature` 與 `tests/features/**/*.feature`（直接證據：cucumber.cjs）。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript ^5.6.3（直接證據：package.json devDependencies；node_modules 實裝 5.9.3）；Node.js v24.18.0（本機實測，package.json 未宣告 engines）；模組系統 ESM（直接證據：package.json `"type": "module"`、tsconfig `module: NodeNext`、`strict: true`）；測試以 tsx ^4.19.2（實裝 4.23.15）經 `node --import tsx` 載入
- Database Engine: 〔待確認〕（掃描 package.json 無任何資料庫相關依賴；是否需要持久層屬團隊決策）
- Data Access & ORM: 〔待確認〕（同上，無 ORM 依賴）
- Schema Migration Command: 〔待確認〕（package.json scripts 僅有 `test`、`typecheck`）
- Seed Script Command: 〔待確認〕（同上）
- UI Component Framework: 〔待確認〕（掃描無任何 UI 相關依賴）
- CSS / Styling Solution: 〔待確認〕（同上）

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 〔待確認〕（無資料庫）
- Backend Classes / Interfaces / Methods: 〔待確認〕（樣本不足：`src/` 僅有空的 `index.ts`，待程式碼進駐後抽樣）
- Frontend Functions / Variables / File Names: 〔待確認〕（無前端程式碼）
- Test Functions / Variables / File Names: 〔待確認〕（`tests/steps/`、`tests/support/` 皆為空目錄）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: 〔待確認〕（樣本不足：僅 `src/index.ts`、`cucumber.cjs`、`tsconfig.json`，皆為小寫；建議人工複查）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 〔待確認〕（無 HTTP 框架依賴，屬團隊決策）
- Error Response Format: 〔待確認〕（屬團隊決策）

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber` ^11.3.0（直接證據：package.json devDependencies；實裝 11.3.0；設定檔 `cucumber.cjs`）【必填】（SpecEngine 預設建議採可真實執行的 Cucumber 風格框架，讓 `Given/When/Then` 直接綁定 `.feature`；若專案尚無 BDD 執行框架，需於 `spec 04` 前與團隊確認導入方式）
- Assertion Library: `node:assert/strict`（唯一候選：package.json 未宣告任何第三方斷言套件，Node 內建模組為唯一選項，待程式碼進駐後核實）
- Test Execution Command: `npm test`（直接證據：package.json scripts.test = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`）；型別檢查 `npm run typecheck`（直接證據：scripts.typecheck = `tsc --noEmit`）【必填】
- Test Report Path: `reports/cucumber.json`（直接證據：cucumber.cjs format `json:reports/cucumber.json`；`reports/` 已列入 .gitignore）（執行器輸出的 JSON／JUnit 報告路徑，`spec 06` 從報告中的 `@rule:` tag 統計覆蓋率；未填時 spec 06 略過覆蓋率統計並提示）
- Property-Based Testing Library: 〔待確認〕（掃描未安裝 `fast-check` 等套件；未填時 spec 05 略過，不自行引入套件）
- Binding Layer: `direct`（使用者決定，2026-10-20：專案為純函式、無 UI、極小，Step 直接呼叫 `src/` 的函式）【必填】
  - Step Definitions 如何接到被測系統。可選值：`driver`（step 只呼叫 Driver 介面，介面另有 in-process／api／ui 等實作，可用環境變數切換；SpecEngine 預設建議）或 `direct`（step 直接呼叫 Service，無 Driver 層，適合尚無 UI 或極小的專案）。屬團隊決策，需人工填寫。
- Driver Directory: 不適用（Binding Layer 為 `direct`，無 Driver 層；使用者決定，2026-10-20）
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: 〔待確認〕（Given 步驟如何建立前置資料：直接寫測試 DB、測試專用 seed API、或走正式 API。UI driver 尤其依賴此項，屬團隊決策）
- Test Database Isolation: 〔待確認〕（無資料庫依賴）
- Test Double Strategy: 〔待確認〕（屬團隊決策）
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 〔待確認〕（無資料庫依賴）

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 〔待確認〕（無相關依賴，屬團隊決策）
- Context Injection Strategy: 〔待確認〕（屬團隊決策）
- Multi-Tenancy / Actor Isolation: 〔待確認〕（屬團隊決策）
