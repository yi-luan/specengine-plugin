# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 單一套件內的事件驅動服務（三個獨立記憶體內服務，僅以事件溝通）（唯一候選，依需求文件描述，待程式碼進駐後核實）
- Source Root Directory: `src/`【必填】（直接證據：README.md、tsconfig.json include）
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: `tests/`（直接證據：cucumber.cjs import 路徑、tsconfig.json include）
- Step Definitions Directory: `tests/steps/`【必填】，直接證據：README.md 與 cucumber.cjs 的 import 設定 tests/steps/**/*.ts（證據說明不用反引號，避免 spec-guard 誤判為第二個路徑）
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript 5.9.3（package.json 宣告 ^5.6.3）、Node.js v24.18.0（本機實測，package.json 未宣告 engines）；ESM（package.json `"type": "module"`、tsconfig `module: NodeNext`）；測試以 tsx 4.23.15 載入
- Database Engine: 無（需求明定不碰資料庫或網路，全部在記憶體中）（直接證據：需求文件）
- Data Access & ORM: 無（記憶體內資料結構）（直接證據：需求文件；依賴清單無 ORM）
- Schema Migration Command: 不適用（無資料庫）
- Seed Script Command: 不適用（無資料庫）
- UI Component Framework: 無（純函式、無 UI）（直接證據：依賴清單無 UI 套件；使用者指定）
- CSS / Styling Solution: 不適用（無 UI）

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 〔待確認〕（無資料庫；DBML 依 contract-rules 第 2.4 節 fallback 暫採 snake_case）
- Backend Classes / Interfaces / Methods: 型別與介面 PascalCase、函式與方法 camelCase（直接證據：需求文件固定的技術介面 `OrderService`、`createOrderService`、`placeOrder`）
- Frontend Functions / Variables / File Names: 不適用（無前端）
- Test Functions / Variables / File Names: 〔待確認〕（tests/ 目前只有 .gitkeep，無樣本）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: 小寫英文（唯一候選：`src/index.ts`、需求指定 `src/shop.ts`，待程式碼進駐後核實）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 無 HTTP／RPC；程序內函式呼叫，服務間以 `Event` 物件透過 `handle(event)` 廣播（直接證據：需求文件技術介面）
- Error Response Format: 指令回傳 `CommandResult = { ok: true; events } | { ok: false; reason: string }`（直接證據：需求文件技術介面）

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber` 11.3.0（package.json 宣告 ^11.3.0，node_modules 已安裝）【必填】
- Assertion Library: `node:assert/strict`（唯一候選：依賴清單未列任何斷言套件，Node.js 內建）
- Test Execution Command: `npm test`（直接證據：package.json scripts.test = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`）【必填】
- Test Report Path: `reports/cucumber.json`（直接證據：cucumber.cjs `format: ['progress', 'json:reports/cucumber.json']`）
- Property-Based Testing Library: 〔待確認〕（依賴清單未列 fast-check 等套件；未填時 spec 05 略過，不自行引入）
- Binding Layer: `direct`（使用者指定：純函式、無 UI，Step 直接呼叫 Service，無 Driver 層）【必填】
  - Step Definitions 如何接到被測系統。可選值：`driver`（step 只呼叫 Driver 介面，介面另有 in-process／api／ui 等實作，可用環境變數切換；SpecEngine 預設建議）或 `direct`（step 直接呼叫 Service，無 Driver 層，適合尚無 UI 或極小的專案）。屬團隊決策，需人工填寫。
- Driver Directory: 不適用（Binding Layer 為 `direct`）
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: Given 步驟直接以工廠函式建立記憶體內服務（`createInventoryService(stock)`、`createPaymentService(balances)`）注入初始狀態（唯一候選：需求固定介面即以初始狀態建構服務，無其他管道）
- Test Database Isolation: 不適用（無資料庫；每個 Scenario 於 World 內重建服務實例）
- Test Double Strategy: 不需要（全部記憶體內，無外部依賴）（直接證據：需求文件）
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 不適用（無資料庫）

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 無（純函式庫，呼叫端自帶 `customerId`）（直接證據：需求文件技術介面）
- Context Injection Strategy: 以參數傳入 `customerId`／`orderId`（直接證據：需求文件技術介面）
- Multi-Tenancy / Actor Isolation: 〔待確認〕（需求未提及多租戶，屬團隊決策）
