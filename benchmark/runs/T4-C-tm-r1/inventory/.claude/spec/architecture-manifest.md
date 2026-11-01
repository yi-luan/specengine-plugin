# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

〔本專案為三人團隊平行開發：本工作區只負責「庫存服務」`src/inventory.ts`；`src/events.ts`、`src/shop.ts`、`src/order.ts`、`src/payment.ts` 為共用或同事負責的檔案，不得修改。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 事件驅動的記憶體內服務（三個服務只透過事件溝通、不共用資料；本工作區範圍為庫存服務）（直接證據：需求文件與 `src/events.ts` 的 `InventoryService.handle(event): Event[]` 介面）
- Source Root Directory: `src/`（直接證據：`tsconfig.json` include 與 README）【必填】
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: `tests/`（直接證據：`tsconfig.json` include、`cucumber.cjs` 的 `import` 路徑）
- Step Definitions Directory: `tests/steps/`，直接證據：cucumber.cjs 的 import 路徑 tests/steps/**/*.ts 與 README【必填】
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。
  - 補充：cucumber 另會載入 `tests/support/**/*.ts`（World、hooks 放此處）。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript `^5.6.3`（ESM，`"type": "module"`、`module: NodeNext`、`strict: true`）於 Node.js v24.18.0（本機實測，package.json 未宣告 engines），測試以 `tsx ^4.19.2` 載入（直接證據：`package.json`、`tsconfig.json`）
- Database Engine: 無（直接證據：需求文件明寫「不碰資料庫或網路，全部在記憶體中」）
- Data Access & ORM: 無（同上；狀態保存在服務實例的記憶體內）
- Schema Migration Command: 不適用（無資料庫）
- Seed Script Command: 不適用（無資料庫）
- UI Component Framework: 無（純函式服務、無 UI）（使用者決策）
- CSS / Styling Solution: 不適用

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 不適用（無資料庫）；`erm.dbml` 的領域模型依 contract-rules 第 2.4 節暫採 `snake_case`
- Backend Classes / Interfaces / Methods: 型別與介面 PascalCase（`InventoryService`、`Event`、`CommandResult`）、函式與方法 camelCase（`createInventoryService`、`getAvailable`、`handle`）、事件型別與狀態值為 PascalCase／全大寫字串字面量（`'OrderPlaced'`、`'PENDING'`）（直接證據：`src/events.ts`）
- Frontend Functions / Variables / File Names: 不適用（無前端）
- Test Functions / Variables / File Names: 〔待確認〕（`tests/steps/`、`tests/support/` 目前只有 `.gitkeep`，無既有樣本；spec 04 依「Test Identifier Language」預設 `en` 產出）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: 小寫英文單字 `.ts`（`src/inventory.ts`、`src/events.ts`）；ESM 相對匯入須寫 `.js` 副檔名（例：`import type { InventoryService } from './events.js'`）（直接證據：`src/` 既有檔案與 `tsconfig.json` NodeNext）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 無網路 API；服務介面固定為 `src/events.ts` 的 TypeScript interface（`InventoryService { handle(event: Event): Event[]; getAvailable(sku: string): number }`），服務之間只透過 `Event` 聯集型別溝通，不可更名（直接證據：需求文件「技術介面（固定，不可更名）」與 `src/events.ts`）
- Error Response Format: 事件處理器 `handle()` 以回傳事件表達結果（例如庫存不足回傳 `StockRejected`），不關心的事件型別回傳空陣列；命令型方法採 `src/events.ts` 的 `CommandResult`（`{ ok: false; reason }`），但庫存服務介面無命令型方法（直接證據：需求文件與 `src/events.ts`）

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber ^11.3.0`（cucumber-js，設定檔 `cucumber.cjs`，feature 路徑含 `.specengine/spec/features/**/*.feature`）（直接證據：`package.json`、`cucumber.cjs`）【必填】
- Assertion Library: `node:assert/strict`（唯一候選：`package.json` 未安裝任何第三方斷言套件，`@types/node` 已安裝，待程式碼進駐後核實）
- Test Execution Command: `npm test`（即 `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`）（直接證據：`package.json` scripts）【必填】
- Test Report Path: `reports/cucumber.json`（直接證據：`cucumber.cjs` 的 `format: ['progress', 'json:reports/cucumber.json']`；`reports/` 已在 `.gitignore`）
- Property-Based Testing Library: 無（`package.json` 未宣告 `fast-check` 等套件，spec 05 略過 property test）
- Binding Layer: `direct`（使用者決策：純函式、無 UI，Step 直接呼叫 `createInventoryService` 建立的服務實例）【必填】
  - Step Definitions 如何接到被測系統。可選值：`driver`（step 只呼叫 Driver 介面，介面另有 in-process／api／ui 等實作，可用環境變數切換；SpecEngine 預設建議）或 `direct`（step 直接呼叫 Service，無 Driver 層，適合尚無 UI 或極小的專案）。屬團隊決策，需人工填寫。
- Driver Directory: 不適用（Binding Layer 為 `direct`）
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: Given 步驟以工廠函式 `createInventoryService(stock)` 在記憶體內建立初始庫存，其他服務會送來的事件由測試自行建構後餵給 `handle()`（直接證據：需求文件「你的測試要自己準備其他服務會送來的事件」與工廠函式簽章）
- Test Database Isolation: 不適用（無資料庫；每個 Scenario 各自建立新的服務實例）
- Test Double Strategy: 不使用 mock 套件；訂單服務與付款服務在本工作區為空殼，測試以手工建構的 `Event` 物件取代它們（直接證據：需求文件「開發期間另外兩個服務在你的專案裡只是空殼」）
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 不適用（無資料庫）

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 不適用（需求範圍內無身份驗證，純記憶體內函式）（直接證據：需求文件未提及任何驗證）
- Context Injection Strategy: 不適用（同上）
- Multi-Tenancy / Actor Isolation: 不適用（單一庫存表，無租戶概念）（直接證據：需求文件與 `createInventoryService(stock)` 簽章）
