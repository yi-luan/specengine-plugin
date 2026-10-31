# bench-points Constitution

## Core Principles

### I. 純函式與不可變性（NON-NEGOTIABLE）
所有匯出的領域函式 MUST 是純函式：不得修改傳入的任何參數（尤其是 `Order` 物件），成功時 MUST 回傳新的物件；失敗時 MUST NOT 修改任何狀態。
理由：需求明訂「全部是純函式」，不可變性使狀態轉換可獨立測試、可重放。

### II. 規格先行
每一項行為 MUST 先在規格（`specs/` 下的 spec / plan / tasks）中有明確描述，才可寫程式。實作與測試 MUST 追溯到規格中的某一條需求；無對應需求的行為 MUST NOT 被加入。
理由：需求方的規格是唯一真相來源，避免實作自行擴張範圍。

### III. 測試先行（NON-NEGOTIABLE）
行為 MUST 先以 cucumber 測試（`tests/features/`、步驟定義於 `tests/steps/`）表達並確認為紅燈，才可實作；實作後 MUST 轉為綠燈。遵循 Red-Green-Refactor 循環。
理由：`npm test` 是唯一的驗收入口，測試先行確保每條需求都有可執行的證據。

### IV. 型別嚴格與公開介面凍結
程式 MUST 以 TypeScript 撰寫並通過 `strict` 模式。`src/order.ts` 匯出的型別與函式簽章（`OrderStatus`、`Order`、`OrderResult`、`createOrder`、`pay`、`ship`、`cancel`、`refund`）為固定介面，MUST NOT 更名或改變參數與回傳型別。禁止使用 `any` 作為繞過型別檢查的手段。
理由：公開介面被測試與外部呼叫端依賴，不可隨意變動。

### V. 金額為整數與明確失敗
所有金額 MUST 以整數元表示，不得使用浮點數運算。違反業務規則（例如金額非正、狀態不允許的操作、退款超過已付金額）時 MUST 回傳 `{ ok: false, reason }`，並附上可讀的失敗原因；MUST NOT 以拋出例外作為業務失敗的通道。
理由：需求第 8 條要求失敗時回傳原因；整數金額避免精度錯誤。

## 技術限制

- 語言與執行環境：TypeScript + Node.js（ESM）；以 `tsx` 執行 TypeScript。
- 測試框架：`@cucumber/cucumber`（cucumber-js），設定檔為 `cucumber.cjs`。
- 產品程式碼位於 `src/`；測試位於 `tests/`（`tests/features/`、`tests/steps/`、`tests/support/`）。
- 唯一的驗收指令為 `npm test`，MUST 全綠才可視為完成；`npm run typecheck` MUST 同時通過。
- 不得新增與需求無關的相依套件。

## 開發流程

- 工作流程依 Spec Kit 順序進行：constitution → specify → clarify → plan → tasks → implement → converge。
- 任何實作變更 MUST 伴隨對應的測試變更；測試紅燈時 MUST NOT 宣告完成。
- 需求不明確時 MUST 先釐清（clarify），不得自行假設後繼續實作而不記錄。
- converge 階段 MUST 確認規格、計畫、任務與實作一致，未收斂則回到 implement。

## Governance

- 本憲章優先於其他所有實務做法與口頭約定。
- 修訂 MUST 記錄變更內容、理由與版本號，並以 PR / commit 形式留存。
- 版本政策（語意化版本）：MAJOR 為移除或重新定義既有原則；MINOR 為新增原則或章節、實質擴充指引；PATCH 為措辭、錯字或非語意性調整。
- 每次 plan 與 converge 階段 MUST 檢查是否符合本憲章；違反者 MUST 說明理由或修正後才可進行。

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
