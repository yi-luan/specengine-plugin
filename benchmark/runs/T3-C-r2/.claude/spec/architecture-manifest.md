# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 〔待確認〕
- Source Root Directory: `src/`，直接證據：README 明載「產品代碼在 src/」且 tsconfig.json include 宣告 src/**/*.ts【必填】
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: `tests/`，直接證據：README 明載 Step Definitions 在 tests/steps/，tsconfig.json include 宣告 tests/**/*.ts
- Step Definitions Directory: `tests/steps/`，直接證據：cucumber.cjs 的 import 宣告 tests/steps/**/*.ts，README 亦明載【必填】
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript ^5.6.3（直接證據：package.json devDependencies，實裝 5.9.3）；Node.js v24.18.0（本機實測，package.json 未宣告 engines）；ESM（package.json `"type": "module"`），以 `tsx` ^4.19.2 載入執行（直接證據：scripts.test 的 `--import tsx`）
- Database Engine: 〔待確認〕（依賴清單查無任何資料庫套件）
- Data Access & ORM: 〔待確認〕（依賴清單查無任何 ORM 套件）
- Schema Migration Command: 〔待確認〕
- Seed Script Command: 〔待確認〕
- UI Component Framework: 〔待確認〕（依賴清單查無任何 UI 套件）
- CSS / Styling Solution: 〔待確認〕

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 〔待確認〕
- Backend Classes / Interfaces / Methods: 〔待確認〕（src/ 僅有空殼 index.ts，無樣本可抽）
- Frontend Functions / Variables / File Names: 〔待確認〕
- Test Functions / Variables / File Names: 〔待確認〕（tests/ 目錄為空，無樣本可抽）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: 〔待確認〕（唯一樣本 src/index.ts 不足以判定慣例，待程式碼進駐後核實）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 〔待確認〕
- Error Response Format: 〔待確認〕

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber` ^11.3.0（直接證據：package.json devDependencies 與 cucumber.cjs 設定檔，node_modules 實裝 11.3.0；以 tsx 載入 TypeScript step 檔）【必填】
- Assertion Library: 〔待確認〕（依賴清單無斷言套件；Node 內建 `node:assert/strict` 為唯一候選，待測試碼進駐後核實）
- Test Execution Command: `npm test`（直接證據：package.json scripts.test = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`；型別檢查另有 `npm run typecheck`）【必填】
- Test Report Path: `reports/cucumber.json`（直接證據：cucumber.cjs format 宣告 `json:reports/cucumber.json`；reports/ 已列入 .gitignore）
- Property-Based Testing Library: 〔待確認〕（依賴清單查無 fast-check 等套件，spec 05 略過 property test）
- Binding Layer: `direct`（使用者於 spec-manifest-sync 決定：專案為純函式、無 UI、極小，step 直接呼叫 `src/` 匯出的函式，無 Driver 層）【必填】
  - Step Definitions 如何接到被測系統。可選值：`driver`（step 只呼叫 Driver 介面，介面另有 in-process／api／ui 等實作，可用環境變數切換；SpecEngine 預設建議）或 `direct`（step 直接呼叫 Service，無 Driver 層，適合尚無 UI 或極小的專案）。屬團隊決策，需人工填寫。
- Driver Directory: 不適用（Binding Layer 為 `direct`，無 Driver 層；spec-guard 略過第 3 層凍結）
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: 〔待確認〕（Given 步驟如何建立前置資料：直接寫測試 DB、測試專用 seed API、或走正式 API。UI driver 尤其依賴此項，屬團隊決策）
- Test Database Isolation: 〔待確認〕
- Test Double Strategy: 〔待確認〕
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 〔待確認〕

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 〔待確認〕
- Context Injection Strategy: 〔待確認〕
- Multi-Tenancy / Actor Isolation: 〔待確認〕
