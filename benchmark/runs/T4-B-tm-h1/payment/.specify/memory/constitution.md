# bench-points Constitution

## Core Principles

### I. TypeScript 強型別
所有產品代碼與測試代碼 MUST 以 TypeScript 撰寫，tsconfig 保持 `strict: true`。
不得以 `any` 繞過型別檢查；公開函式與匯出介面 MUST 有明確的型別標註。
理由：事件與服務介面由多人平行開發，型別是唯一可機械驗證的合約。

### II. 產品碼與測試分離
產品代碼 MUST 放在 `src/`；測試代碼（Step Definitions、support、feature 驗證）MUST 放在 `tests/`。
產品碼 MUST NOT 依賴測試程式；測試 MAY 依賴產品碼的公開匯出。
理由：模組邊界清楚，才能讓各服務檔案獨立替換與整合。

### III. 行為以 Cucumber 驗證（NON-NEGOTIABLE）
功能行為 MUST 以 cucumber-js（Gherkin feature 檔 + TypeScript Step Definitions）描述與驗證。
新增或變更行為的順序為：先寫 feature 與會失敗的步驟 → 確認失敗 → 實作 → 轉為通過。
不得為了讓測試通過而弱化斷言或刪除 scenario。

### IV. 單一入口的全綠測試
`npm test` MUST 是唯一的測試入口，且在提交前 MUST 全部通過（零失敗、零未定義步驟）。
測試 MUST 不依賴外部服務、資料庫或網路；所有狀態都在記憶體中。

### V. 服務狀態封閉
每個服務 MUST 只保存自己的狀態，不得直接讀取或呼叫其他服務的內部狀態；
服務之間只能透過事件溝通。對事件的處理 MUST 容忍重複送達與亂序送達（冪等）。

## Technology Stack

- 語言：TypeScript（ES2022 目標，NodeNext 模組解析）
- 測試框架：@cucumber/cucumber（cucumber-js），以 tsx 載入 TypeScript
- 型別檢查：`tsc --noEmit`（`npm run typecheck`）
- 套件管理：npm，依賴以 `package-lock.json` 鎖定
- 不使用資料庫、網路 I/O 或外部訊息佇列

## Development Workflow

- 每個功能變更 MUST 先有對應的 feature 場景，再有實作（見原則 III）。
- 提交前 MUST 通過 `npm test` 與 `npm run typecheck`。
- 不得修改其他團隊成員負責的檔案；跨服務的整合由整合人員處理。
- 所有金額與數量為整數；時間一律為 ISO 8601 字串。

## Governance

本憲法優先於其他開發慣例。修訂須記錄於此檔案，並更新版本號。
版本策略（語意化版本）：MAJOR 為移除或重新定義原則；MINOR 為新增原則或章節；PATCH 為文字澄清。
每次實作與合併前 MUST 核對上述原則是否遵守；違反須在 PR 或變更說明中說明理由。
執行期開發指引以本憲法與 `.specify/` 內的 Spec Kit 指令為準。

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
