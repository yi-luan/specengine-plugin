<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: all template placeholders replaced (initial ratification of this project constitution)
- Added sections: Technology Stack, Development Workflow
- Removed sections: none
- Deferred TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. 記憶體內、無外部依賴（Pure In-Memory Services）
每個服務的狀態只存在於記憶體中。MUST NOT 存取資料庫、檔案系統或網路。服務之間 MUST NOT 直接呼叫或讀取彼此的狀態，只能透過事件（`src/events.ts` 定義的 `Event`）溝通。
Rationale: 三位工程師平行開發，各服務以事件解耦，才能獨立替換並由整合人員接上真正的事件匯流排。

### II. 固定介面不可更動（Fixed Shared Contracts）
`src/events.ts`、`src/shop.ts`、`src/index.ts` 是團隊共用的固定介面，MUST NOT 修改。各服務工廠函式的名稱與簽章（`createOrderService`、`createInventoryService`、`createPaymentService`）MUST NOT 更名。
Rationale: 同事的程式碼依賴這些固定名稱與型別，任何變動都會破壞整合。

### III. 負責範圍邊界（Ownership Boundaries）
每位工程師 MUST 只修改自己負責的服務檔案與自己的測試。不得修改同事負責的檔案。
Rationale: 平行開發時的唯一安全合約是檔案所有權。

### IV. 測試先行（Test-First, NON-NEGOTIABLE）
新行為 MUST 先以 Gherkin feature 與 step definitions 表達並確認失敗（紅燈），再實作（綠燈）。其他服務送來的事件 MUST 由測試自行準備。
Rationale: 測試是需求的可執行形式，且開發期間沒有其他服務可以整合測試。

### V. 事件語意的健壯性（Idempotent, Order-Tolerant Event Handling）
事件傳遞為至少一次且可能亂序。服務 MUST 對重複事件保持冪等，MUST 容忍事件亂序抵達，且 MUST 對不關心的事件類型回傳空陣列。
Rationale: 需求明定事件可能重複與亂序，這是系統的正常情況而非例外。

## Technology Stack

- 語言：TypeScript（`strict: true`），ES2022，NodeNext 模組。
- 測試：cucumber-js（`@cucumber/cucumber`），Gherkin feature 檔案與 step definitions 以 TypeScript 撰寫。
- 執行：`tsx` 載入 TypeScript（`node --import tsx`）。
- 產品代碼位於 `src/`，測試位於 `tests/`（step definitions 於 `tests/steps/`，support 於 `tests/support/`，feature 於 `tests/features/`）。
- 唯一的驗收指令是 `npm test`，MUST 全綠才算完成。`npm run typecheck` 也 MUST 通過。

## Development Workflow

- 每個功能走 Spec Kit 流程：specify → clarify → plan → tasks → implement → converge。
- 有需要人裁示的問題（需求不明、規則衝突）MUST 明確列出並等待答覆，不得自行揣測答案後當作既定事實。
- 完成前 MUST 執行 `npm test` 與 `npm run typecheck` 並確認結果。

## Governance

本憲章凌駕於其他開發慣例之上。修訂需記錄於 Sync Impact Report，並依語意化版本更新版本號：
- MAJOR：移除或重新定義既有原則。
- MINOR：新增原則或章節，或實質擴充指引。
- PATCH：文字澄清、錯字修正。

所有實作與審查 MUST 驗證是否符合上述原則；違反時需在 plan 中說明並取得同意。

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
