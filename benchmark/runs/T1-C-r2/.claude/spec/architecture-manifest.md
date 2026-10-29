# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

〔首次建立：2026-10-20 02:01，plugin 2.0.0，spec-manifest-sync 掃描核實。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 單一套件、純函式模組（唯一候選：`src/` 僅有 `index.ts` 佔位檔，無分層目錄，待程式碼進駐後核實）
- Source Root Directory: `src/`【必填】，直接證據：README.md「產品代碼在 src/」、tsconfig.json include src/**/*.ts
- Specification Root Directory: `.specengine/spec/`，直接證據：cucumber.cjs paths 含 .specengine/spec/features/**/*.feature
- Test Root Directory: `tests/`，直接證據：tsconfig.json include tests/**/*.ts、cucumber.cjs import tests/steps/**/*.ts 與 tests/support/**/*.ts
- Step Definitions Directory: `tests/steps/`【必填】，直接證據：cucumber.cjs import tests/steps/**/*.ts、README.md「Step Definitions 在 tests/steps/」、目錄已存在但為空
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript 5.9.3（`package.json` 宣告 `^5.6.3`，`strict: true`、`module: NodeNext`、ESM `"type": "module"`）＋ Node.js v24.18.0（本機實測，package.json 未宣告 engines）；測試以 `tsx` 4.23.15 載入 TS（直接證據：`cucumber.cjs` loader `tsx`）
- Database Engine: 〔待確認〕（掃描無任何資料庫套件或連線設定）
- Data Access & ORM: 〔待確認〕（掃描無 ORM 套件）
- Schema Migration Command: 〔待確認〕（`package.json` scripts 無對應指令）
- Seed Script Command: 〔待確認〕（`package.json` scripts 無對應指令）
- UI Component Framework: 〔待確認〕（掃描無 UI 套件）
- CSS / Styling Solution: 〔待確認〕（掃描無樣式套件）

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 〔待確認〕（專案無資料庫）
- Backend Classes / Interfaces / Methods: 〔待確認〕（`src/index.ts` 為空佔位檔，無可抽樣程式碼）
- Frontend Functions / Variables / File Names: 〔待確認〕（專案無前端）
- Test Functions / Variables / File Names: 〔待確認〕（`tests/` 尚無檔案）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: 小寫（唯一候選：僅 `src/index.ts` 一個樣本，待程式碼進駐後核實）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 〔待確認〕（專案無 API 層）
- Error Response Format: 〔待確認〕（屬團隊決策）

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber` 11.3.0（cucumber-js）【必填】（直接證據：`package.json` devDependencies `^11.3.0`、`cucumber.cjs` 設定檔、node_modules 已安裝 11.3.0）
- Assertion Library: `node:assert`（唯一候選：`package.json` 未宣告任何斷言套件，Node 內建模組為唯一可用選項，待測試進駐後核實）
- Test Execution Command: `npm test`（即 `cucumber-js`）【必填】（直接證據：`package.json` scripts.test）；型別檢查另有 `npm run typecheck`（`tsc --noEmit`）
- Test Report Path: `reports/cucumber.json`，直接證據：cucumber.cjs format json:reports/cucumber.json；reports/ 已列入 .gitignore
- Property-Based Testing Library: 〔待確認〕（掃描無 `fast-check` 等套件；未填時 spec 05 略過，不自行引入）
- Binding Layer: `direct`【必填】（使用者決策 2026-10-20：專案為純函式、無 UI、極小專案，Step 直接呼叫 `src/` 的函式，無 Driver 層）
- Driver Directory: 不適用，Binding Layer 為 direct
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: 〔待確認〕（專案無資料庫；屬團隊決策）
- Test Database Isolation: 〔待確認〕（專案無資料庫）
- Test Double Strategy: 〔待確認〕（屬團隊決策）
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 〔待確認〕（專案無資料庫）

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 〔待確認〕（掃描無認證套件）
- Context Injection Strategy: 〔待確認〕（屬團隊決策）
- Multi-Tenancy / Actor Isolation: 〔待確認〕（掃描無租戶相關程式碼）
