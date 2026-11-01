# 專案架構與執行環境宣告 (Architecture Manifest)

本宣告檔定義專案之系統拓撲、技術棧約束、資料持久化策略與測試執行環境。所有 SpecEngine Skill 執行時，皆必須以本檔宣告之變數為最高環境依準。

〔本檔案由 spec-manifest-sync 掃描本專案實際狀態自動建立初稿。凡標示〔待確認〕之項目，代表掃描當下無法找到唯一、可驗證的證據（或屬於需要團隊決策而非單純查證的項目），需人工核對後手動覆寫；已被掃描核實填入的項目，往後如與現況脫鉤，可再次執行 spec-manifest-sync 更新。〕

〔欄位分兩級：標示【必填】的 5 項是 spec 04／05 跑得起來的最低門檻，spec-manifest-sync 會在掃描後一次問完；其餘為選填，未填時各 Skill 依欄位說明的預設行為處理，不會阻斷流程。〕

---

# 1. 架構拓撲與目錄結構 (Architecture Topology & Paths)

- Architecture Pattern: 事件驅動的服務拆分（三個記憶體內服務，只透過 `Event` 溝通；本專案範圍只實作付款服務 `src/payment.ts`）（直接證據：需求文件與 `src/events.ts`、`src/shop.ts`）
- Source Root Directory: `src/`【必填】（直接證據：tsconfig.json include、README.md）
- Specification Root Directory: `.specengine/spec/`
- Test Root Directory: `tests/`（直接證據：tsconfig.json include、cucumber.cjs）
- Step Definitions Directory: `tests/steps/`【必填】，直接證據：cucumber.cjs 的 import 路徑 tests/steps/**/*.ts 與 README.md
  - 上列欄位請以反引號包住實際路徑（例如 `tests/steps/`），多個路徑以「／」分隔。spec-guard 腳本會直接解析此欄位，欄位仍為〔待確認〕、目錄不存在或凍結到 0 個句型時，`spec 05` 會 Fail Loud 中止。

---

# 2. 技術棧與持久化層 (Tech Stack & Persistence Layer)

- Primary Language & Runtime: TypeScript 5.9.3（package.json 宣告 ^5.6.3）／Node.js v24.18.0（本機實測，package.json 未宣告 engines）；ESM（`"type": "module"`、`module: NodeNext`），執行期以 tsx 4.23.15 載入
- Database Engine: 無（直接證據：需求文件「不碰資料庫或網路，全部在記憶體中」；package.json 無任何 DB 相依）
- Data Access & ORM: 無（同上；狀態保存在服務工廠函式的閉包記憶體內）
- Schema Migration Command: 不適用（無資料庫）
- Seed Script Command: 不適用（無資料庫）
- UI Component Framework: 無（直接證據：package.json 無 UI 相依；需求為純後端事件處理）
- CSS / Styling Solution: 不適用（無 UI）

---

# 3. 命名語法規範 (Lexical & Syntactic Conventions)

- Database Tables & Columns: 不適用（無資料庫；DBML 僅作記憶體狀態模型描述，暫採 `snake_case`）
- Backend Classes / Interfaces / Methods: 介面與型別 `PascalCase`（`PaymentService`、`Event`、`CommandResult`），函式與方法 `camelCase`（`createPaymentService`、`handle`、`getBalance`），事件型別字串 `PascalCase`（`StockReserved`），狀態常數全大寫（`PENDING`）（直接證據：`src/events.ts`，固定不可更名）
- Frontend Functions / Variables / File Names: 不適用（無前端）
- Test Functions / Variables / File Names: 〔待確認〕（唯一候選：`tests/steps/` 目前為空，僅 `.gitkeep`；建議沿用 `camelCase` 變數、`kebab-case` 或 `<模組>.steps.ts` 檔名，待程式碼進駐後核實）
- Feature Specification File Names: 繁體中文模組名稱（例如：`.specengine/spec/features/多檔上傳.feature`），此為 SpecEngine 全域固定慣例，不隨專案改變，不需查證。
- Test Identifier Language: 〔待確認〕（Step／Driver／fixture 的識別字語言：`en` 為英文識別字、中文放註解；`zh-TW` 為領域中文識別字。未填時 spec 04 預設 `en`。屬團隊決策，請考慮 lint、覆蓋率工具與終端機對非 ASCII 識別字的支援）
- Code File Names: `src/` 下為小寫單字 `.ts`（`events.ts`、`payment.ts`、`shop.ts`），ESM import 一律寫 `.js` 副檔名（`'./events.js'`）（直接證據：`src/*.ts`）

---

# 4. 通訊協定與錯誤處理合約 (Protocol & Error Handling Standard)

- API Interface Standard: 記憶體內事件介面：`PaymentService.handle(event: Event): Event[]`、`getBalance(customerId: string): number`；不關心的事件回傳空陣列；服務自產事件 `id` 須全系統唯一（直接證據：`src/events.ts` 與需求文件「技術介面」節）
- Error Response Format: 〔待確認〕（`PaymentService` 介面無錯誤回傳通道；業務失敗以事件表達（`PaymentFailed`），其餘異常處理屬團隊決策）

---

# 5. 驗證與測試驅動策略 (Verification & Test Harness)

- BDD Execution Framework: `@cucumber/cucumber` 11.3.0（cucumber-js，設定檔 `cucumber.cjs`，以 `node --import tsx` 載入 TypeScript）【必填】（直接證據：package.json、cucumber.cjs）
- Assertion Library: `node:assert/strict`（唯一候選：package.json 未安裝任何 assertion 套件，Node 內建 assert 為唯一可用來源）
- Test Execution Command: `npm test`（= `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`）；型別檢查 `npm run typecheck`（= `tsc --noEmit`）【必填】（直接證據：package.json scripts）
- Test Report Path: `reports/cucumber.json`（直接證據：cucumber.cjs `format: ['progress', 'json:reports/cucumber.json']`；`.gitignore` 已排除 `reports/`）
- Property-Based Testing Library: 無（直接證據：package.json 未安裝 fast-check 等套件；spec 05 不自行引入）
- Binding Layer: `direct`【必填】（團隊決策，由使用者於本次導入時指定：純函式、無 UI，Step 直接呼叫 `createPaymentService` 回傳的 Service）
  - Step Definitions 如何接到被測系統。可選值：`driver`（step 只呼叫 Driver 介面，介面另有 in-process／api／ui 等實作，可用環境變數切換；SpecEngine 預設建議）或 `direct`（step 直接呼叫 Service，無 Driver 層，適合尚無 UI 或極小的專案）。屬團隊決策，需人工填寫。
- Driver Directory: 不適用（Binding Layer 為 `direct`）
  - Binding Layer 為 `driver` 時必填，反引號包住路徑（例如 `tests/drivers/`）。介面檔命名為 `<模組>.driver.<副檔名>`，`spec-guard` 會對介面檔全字節凍結；同目錄的實作檔（`<模組>.inprocess.*`、`<模組>.ui.*`）不受限。
- Test Data Seeding Strategy: Given 步驟直接以 `createPaymentService(balances)` 建立初始餘額，並由測試自行構造其他服務會送來的 `Event` 物件餵入 `handle`（唯一候選：需求文件「你的測試要自己準備其他服務會送來的事件」；無 DB、無 seed API）
- Test Database Isolation: 不適用（無資料庫；每個 Scenario 以新的 Service 實例隔離）
- Test Double Strategy: 不使用 mock 框架；其他服務（訂單、庫存）在本專案僅為空殼，測試以手工構造事件取代（唯一候選：package.json 無 mock 套件；需求文件分工說明）
- Spec Read-Only Guard Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"`），不需逐專案填寫。
- Feature/DBML Lint Command：由 plugin 自帶（`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`），不需逐專案填寫。
- Schema Introspection Command: 不適用（無資料庫）

---

# 6. 安全上下文與身份委派 (Security Context & Actor Delegation)

- Authentication Mechanism: 無（直接證據：需求與介面皆無身份驗證；`customerId` 由事件攜帶）
- Context Injection Strategy: 不適用（無身份驗證）
- Multi-Tenancy / Actor Isolation: 無多租戶；顧客以 `customerId` 區分餘額（直接證據：`createPaymentService(balances: Record<string, number>)`、`getBalance(customerId)`）
