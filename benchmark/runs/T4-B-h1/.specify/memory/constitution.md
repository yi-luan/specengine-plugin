# bench-points Constitution

## Core Principles

### I. TypeScript 強型別

所有產品碼與測試碼 MUST 以 TypeScript 撰寫，並於 `tsconfig.json` 保持嚴格模式。
公開介面 MUST 與需求中的技術介面逐字一致（型別名稱、方法名稱、參數與回傳型別不得更名或改寫）。
`any` 只允許出現在無法避免的邊界處，並 MUST 附上理由註解。
理由：需求的介面為固定契約，型別檢查是最便宜的契約驗證手段。

### II. 行為先以 Gherkin 規格化，測試先行（NON-NEGOTIABLE）

任何行為變更 MUST 先在 `tests/features/` 底下的 `.feature` 檔（Gherkin）中描述，再撰寫步驟定義與測試，
測試 MUST 先在未實作時失敗（紅燈），實作後轉綠燈，最後才可重構。
未經紅燈確認的測試不得視為驗收證據。

### III. 三服務彼此隔離，只透過事件溝通

訂單、庫存、付款三個服務 MUST 各自只保存自己的狀態。
任何服務 MUST NOT 直接讀取或呼叫其他服務的內部狀態；服務間的唯一溝通方式是事件。
每個服務的 `handle` MUST 對不關心的事件類型回傳空陣列，且 MUST 能容忍重複與亂序的事件。
理由：需求明定事件至少送達一次、可能重複、不保證順序，冪等與容錯是正確性的前提。

### IV. 全記憶體、無外部副作用

產品碼 MUST NOT 存取資料庫、網路、檔案系統或系統時鐘；所有時間 MUST 由呼叫端以 ISO 8601 字串傳入。
狀態 MUST 僅存在於記憶體中，且以工廠函式（`createOrderService` 等）建立以利測試隔離。

### V. 簡單優先（YAGNI）

只實作需求明定的行為。不得新增未經規格化的功能、設定旗標或抽象層。
所有金額與數量 MUST 為整數；浮點數運算 MUST NOT 出現在金額或庫存計算中。

## Technology Constraints

- 語言：TypeScript（ESM，`"type": "module"`）
- 行為測試：`@cucumber/cucumber`，執行入口為 `npm test`，設定見 `cucumber.cjs`（Feature 路徑為 `tests/features/**/*.feature`）
- 產品碼位置：`src/`；步驟定義與測試支援碼位置：`tests/steps/`、`tests/support/`
- 不得引入需求以外的執行期相依套件

## Development Workflow

- 每個 Feature 的 Gherkin 規格（`tests/features/`）MUST 先於對應實作提交。
- 合併前 MUST 通過 `npm test` 全綠，且 `npm run typecheck` 無錯誤。
- 任何原則的修改 MUST 同步更新本文件的版本號與 Sync Impact Report。

## Governance

本憲法凌駕於其他所有開發慣例之上。
修訂程序：以 PR 提出修改內容與理由，經專案負責人核可後合併，並更新版本號與 `LAST_AMENDED_DATE`。
版本政策（語意化版本）：
- MAJOR：移除或重新定義既有原則或治理規則，造成不相容的變更。
- MINOR：新增原則、章節，或實質擴充既有指引。
- PATCH：文字澄清、錯字修正、非語意性的調整。
所有 Pull Request 與 Converge 檢查 MUST 驗證是否符合本憲法；違反者 MUST 在合併前修正或取得明確的例外核可。

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
