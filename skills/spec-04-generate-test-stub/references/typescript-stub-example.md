# Step Definitions 與 Driver 層結構範例

**本檔案僅示範結構，不代表任何專案採用的框架。** 範例使用 `playwright-bdd` 與 TypeScript，模組為「點數折抵」。若 manifest 宣告的框架不同（`@cucumber/cucumber`、`behave`、`pytest-bdd`、Reqnroll 等），把 step 註冊 API 與 fixture 機制換成該框架的對應慣例；要沿用的是四件事：句型字串與 `.feature` 一致、`@rule`／`@schema`／`@binds` 註解、step 只呼叫 Driver、Driver 介面與實作分檔。

`spec-guard.js` 只認 `Given/When/Then('句型字串', ...)` 的呼叫形式與 `*.driver.*` 檔名，不管背後是哪個框架。

## 對應的 Gherkin

```gherkin
  @rule:R-POINTS_REDEMPTION-001
  Rule: 折抵點數不得超過餘額或訂單金額
    Scenario Outline: 折抵邊界驗證
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_total>"
      When 會員輸入折抵點數 "<points>"
      Then 系統回傳結果 "<result>"
```

## Step Definitions：只翻譯句子

```typescript
// tests/steps/點數折抵.steps.ts
import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';

// @rule R-POINTS_REDEMPTION-001
// @schema Member.points_balance: int
// @binds 點數折抵Driver.設定會員餘額
Given('會員點數餘額為 {string}', async ({ 點數折抵 }, balance: string) => {
  await 點數折抵.設定會員餘額(Number(balance));
});

// @rule R-POINTS_REDEMPTION-001
// @schema Order.total_amount: decimal
// @binds 點數折抵Driver.建立訂單
Given('訂單金額為 {string}', async ({ 點數折抵 }, total: string) => {
  await 點數折抵.建立訂單(Number(total));
});

// @rule R-POINTS_REDEMPTION-001
// @schema none
// @binds 點數折抵Driver.輸入折抵點數
When('會員輸入折抵點數 {string}', async ({ 點數折抵 }, points: string) => {
  await 點數折抵.輸入折抵點數(Number(points));
});

// @rule R-POINTS_REDEMPTION-001
// @schema none
// @binds 點數折抵Driver.取得結果
Then('系統回傳結果 {string}', async ({ 點數折抵 }, expected: string) => {
  expect(await 點數折抵.取得結果()).toBe(expected);
});
```

## Driver 介面：綁定契約，spec-guard 全字節凍結

```typescript
// tests/drivers/點數折抵.driver.ts
export interface 點數折抵Driver {
  /** 建立一位點數餘額為 balance 的會員，作為後續操作主體 */
  設定會員餘額(balance: number): Promise<void>;
  /** 為該會員建立一筆金額為 total 的待結帳訂單 */
  建立訂單(total: number): Promise<void>;
  /** 對該訂單套用 points 點折抵 */
  輸入折抵點數(points: number): Promise<void>;
  /** 回傳最近一次折抵操作的結果文字（成功或錯誤訊息） */
  取得結果(): Promise<string>;
}
```

## Driver 實作：spec-04 產出時全部拋例外，spec-05 填入

```typescript
// tests/drivers/點數折抵.inprocess.ts
import type { 點數折抵Driver } from './點數折抵.driver';

export class 點數折抵InProcess implements 點數折抵Driver {
  async 設定會員餘額(balance: number): Promise<void> {
    throw new Error('Contract Not Implemented: 點數折抵Driver.設定會員餘額');
  }
  async 建立訂單(total: number): Promise<void> {
    throw new Error('Contract Not Implemented: 點數折抵Driver.建立訂單');
  }
  async 輸入折抵點數(points: number): Promise<void> {
    throw new Error('Contract Not Implemented: 點數折抵Driver.輸入折抵點數');
  }
  async 取得結果(): Promise<string> {
    throw new Error('Contract Not Implemented: 點數折抵Driver.取得結果');
  }
}
```

```typescript
// tests/drivers/點數折抵.ui.ts（結構同上，建構子接 Playwright page 與 request；省略）
```

## fixture 接線：依環境變數選 Driver

```typescript
// tests/fixtures.ts
import { test as base, createBdd } from 'playwright-bdd';
import type { 點數折抵Driver } from './drivers/點數折抵.driver';
import { 點數折抵InProcess } from './drivers/點數折抵.inprocess';
import { 點數折抵UI } from './drivers/點數折抵.ui';

export const test = base.extend<{ 點數折抵: 點數折抵Driver }>({
  點數折抵: async ({ page, request }, use) => {
    const driver = process.env.BINDING === 'ui'
      ? new 點數折抵UI(page, request)
      : new 點數折抵InProcess();
    await use(driver);
  },
});

export const { Given, When, Then } = createBdd(test);
```

## spec-05 完成後的 in-process 實作長相

```typescript
export class 點數折抵InProcess implements 點數折抵Driver {
  private member!: Member;
  private order!: Order;
  private result = '';
  constructor(private svc = PointsRedemptionService.forTest()) {}

  async 設定會員餘額(balance: number) { this.member = await this.svc.members.create({ points_balance: balance }); }
  async 建立訂單(total: number)       { this.order = await this.svc.orders.create({ member_id: this.member.id, total_amount: total }); }
  async 輸入折抵點數(points: number) {
    try { await this.svc.redeem(this.order.id, points); this.result = '成功'; }
    catch (e) { this.result = (e as DomainError).message; }
  }
  async 取得結果() { return this.result; }
}
```

step 檔與介面檔在 spec-05 期間一個字都不用改。

## JavaScript 加 cucumber-js 的對應寫法（Test Identifier Language = `en`）

JavaScript 沒有 interface，介面檔改用「全部方法拋例外的基底類別」；實作檔繼承它。識別字與檔名改英文，中文放註解。`spec-guard.js` 的 `@binds` 檢查靠 `方法名(` 的字樣，對 class 方法同樣有效。

```javascript
// tests/drivers/points-redemption.driver.js（介面檔，spec-guard 全字節凍結）
'use strict';
class PointsRedemptionDriver {
  /** 建立一位點數餘額為 balance 的會員 */
  async setMemberBalance(balance) { throw new Error('Contract Not Implemented: PointsRedemptionDriver.setMemberBalance'); }
  /** 為該會員建立金額為 total 的待結帳訂單 */
  async createOrder(total) { throw new Error('Contract Not Implemented: PointsRedemptionDriver.createOrder'); }
  /** 對該訂單套用 points 點折抵 */
  async redeem(points) { throw new Error('Contract Not Implemented: PointsRedemptionDriver.redeem'); }
  /** 回傳最近一次操作的結果文字 */
  async lastResult() { throw new Error('Contract Not Implemented: PointsRedemptionDriver.lastResult'); }
}
module.exports = { PointsRedemptionDriver };
```

```javascript
// tests/steps/points-redemption.steps.js
'use strict';
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
require('../fixtures'); // cucumber.js 的 require 若未涵蓋 fixtures，由此載入

// @rule R-POINTS_REDEMPTION-*
// @schema members.points_balance: int
// @binds PointsRedemptionDriver.setMemberBalance
Given('會員點數餘額為 {string}', async function (balance) {
  await this.pointsRedemption.setMemberBalance(Number(balance));
});
```

```javascript
// tests/fixtures.js：World 依 BINDING 選 Driver
'use strict';
const { setWorldConstructor } = require('@cucumber/cucumber');
const { PointsRedemptionInProcess } = require('./drivers/points-redemption.inprocess');
setWorldConstructor(class {
  constructor() {
    const binding = process.env.BINDING || 'inprocess';
    if (binding !== 'inprocess') throw new Error(`BINDING=${binding} 尚無對應 Driver 實作`);
    this.pointsRedemption = new PointsRedemptionInProcess();
  }
});
```
