# Step Definitions Stub 結構範例（示範框架：playwright-bdd）

**本檔案僅示範結構，不代表目前專案採用的框架。** 以下範例採用 `playwright-bdd`：Step Definitions 用 `createBdd()` 產生，函式拿到的是 Playwright 的 `page` fixture（驅動真實瀏覽器），而不是自訂的 Context/World。若當前 `architecture-manifest.md` 宣告的 BDD 框架不是 `playwright-bdd`（例如 `@cucumber/cucumber`、`behave`、`pytest-bdd` 等），Gherkin `.feature` 語法與 Step 句型規範不變，但下方範例的具體 API（`createBdd()`、`page` fixture）必須替換為該框架的對應慣例（例如 `@cucumber/cucumber` 用套件本身的 `Given/When/Then` 搭配自訂 `World` 類別），只沿用「雙層 Background 映射、`@schema` 型別追溯註解、`throw new Error` 紅燈斷言、狀態隔離」這幾項結構性做法。`spec-guard.js` 的句型簽章比對邏輯對任何框架皆一視同仁（只認 `Given/When/Then('句型字串', ...)` 的呼叫形式，不管背後接的是哪個框架的 API）。

```typescript
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

const { Given, When, Then } = createBdd();

// 測試狀態隔離 Context：以 Playwright page 之 URL/DOM 狀態為主，
// 跨步驟需要暫存的資料另外用 fixture 擴充，不使用全域變數 (對齊 .specengine/spec/erm.dbml)
// @rule R-EXPENSE-000
// @schema Expense.amount: decimal
Given('使用者在記帳首頁', async function ({ page }) {
  /*
   * [PRE-CONDITION]
   * DBML Binding: (none，UI 前置狀態)
   * Expected Type: n/a
   */
  throw new Error("Contract Not Implemented: Given 使用者在記帳首頁");
});

// @rule R-EXPENSE-000
// @schema Expense.amount: decimal, Expense.category: varchar, Expense.expense_date: date
When('使用者輸入金額 {string}、分類 {string}、日期 {string} 並送出', async function ({ page }, amount: string, category: string, date: string) {
  /*
   * [ACTION TRIGGER]
   * DBML Binding: Expense.amount / Expense.category / Expense.expense_date
   * Expected Type: decimal / varchar / date
   */
  throw new Error("Contract Not Implemented: When 使用者輸入金額 {string}、分類 {string}、日期 {string} 並送出");
});

// @rule R-EXPENSE-000
// @schema Expense (row existence)
Then('支出紀錄列表應出現金額為 {string} 元的新紀錄', async function ({ page }, amount: string) {
  /*
   * [POST-ASSERTION]
   * DBML Binding: Expense (row existence)
   * Expected Type: n/a
   */
  throw new Error("Contract Not Implemented: Then 支出紀錄列表應出現金額為 {string} 元的新紀錄");
});
```