# bench-points Constitution

## Core Principles

### 一、TypeScript 為唯一實作語言
產品程式碼與測試程式碼一律使用 TypeScript（ESM）。所有公開介面必須使用 `src/events.ts` 所定義的型別；不得以 `any` 繞過型別檢查。
理由：三位工程師平行開發，固定介面的型別是跨服務整合的唯一合約。

### 二、事件驅動與冪等
服務之間只能透過事件溝通，不得直接呼叫或讀取對方的狀態。每個服務 MUST 假設事件可能重複送達且順序不保證：重複事件 MUST NOT 造成重複扣減、重複發出事件或狀態倒退。
理由：事件匯流排的傳遞保證是至少一次、無序，違反此假設的實作在整合時必然出錯。

### 三、純記憶體、無副作用的核心邏輯
服務實作 MUST 完全在記憶體中運作，不得存取資料庫、檔案系統或網路。時間一律以外部傳入的 ISO 8601 字串為準，服務內部 MUST NOT 讀取系統時鐘。
理由：可決定性（deterministic）的測試是驗證時間相關規則（例如 15 分鐘逾時）的前提。

### 四、測試先行（Test-First）
每一個行為 MUST 先有失敗的測試（紅燈），再寫實作（轉綠燈）。測試以 cucumber-js 撰寫，Gherkin 特性檔放在 `tests/features/`，step definitions 放在 `tests/steps/`，共用支援程式放在 `tests/support/`。
理由：需求以行為描述，測試即規格。

### 五、檔案所有權邊界
每位工程師只能修改自己負責的產品檔案與自己的測試。`src/events.ts`、`src/shop.ts`、`src/index.ts` 為共用固定檔，任何人不得修改。
理由：三人平行開發時，越界修改會造成整合衝突與責任不清。

## 技術約束

- 執行環境：Node.js，套件管理使用 npm，模組格式為 ESM（`package.json` 的 `"type": "module"`）。
- 測試指令：`npm test` MUST 可直接執行並跑完全部 Feature；`npm run typecheck` MUST 通過。
- 測試執行器：`@cucumber/cucumber`，透過 `cucumber.cjs` 設定路徑與 import。
- 金額與數量一律為整數，不得使用浮點數表示金額。

## 開發流程

- 每個功能依序：規格（specify）→ 釐清（clarify）→ 計畫（plan）→ 任務（tasks）→ 實作（implement）→ 收斂檢查（converge）。
- 收斂檢查未通過 MUST 回到實作階段修正，直到規格、測試、程式碼三者一致為止。
- 提交前 `npm test` 與 `npm run typecheck` MUST 全綠。

## Governance

本憲章高於所有其他開發慣例。任何違反本憲章的實作 MUST 在程式審查時被阻擋，除非先修訂本憲章。
修訂憲章需要：說明修訂理由、更新版本號、更新 Sync Impact Report。版本號依語意化版本規則：
MAJOR 為不相容的原則移除或重新定義；MINOR 為新增原則或段落；PATCH 為文字澄清。
所有規格與計畫文件 MUST 在建立或修改時檢查是否符合本憲章。

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
