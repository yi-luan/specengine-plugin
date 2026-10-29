# Research: 會員點數折抵

**Feature**: 001-member-points-discount | **Date**: 2026-10-20

Technical Context 中沒有 NEEDS CLARIFICATION 項目（技術棧由專案既有設定與憲章固定），
以下記錄實作上需要先定案的決策。

## R1. 30% 上限的整數計算方式

- **Decision**: `limit = Math.floor((orderAmount * 3) / 10)`；允許 `pointsToUse <= limit`。
- **Rationale**: 需求方已明確回答「無條件捨去取整數」（101 元 → 30 點）；「不得超過」表示等於允許
  （1000 元用 300 點成功）。`orderAmount * 0.3` 以浮點計算有出現 `0.30000000000000004` 類誤差的
  風險，改用整數乘除後再 floor 可完全避免。
- **Alternatives considered**: `Math.ceil`（需求方否決）；`Math.round`（未被選擇）；
  `orderAmount * 0.3` 浮點（可行但有誤差風險）。

## R2. 驗證順序與失敗原因代碼

- **Decision**: 依序檢查並回傳第一個命中：
  1. `INVALID_INPUT`：`orderAmount` 不是整數或 `<= 0`；`pointsBalance` 不是整數或 `< 0`。
  2. `INVALID_POINTS`：`pointsToUse` 不是整數或 `< 0`。
  3. `INSUFFICIENT_POINTS`：`pointsToUse > pointsBalance`。
  4. `EXCEEDS_LIMIT`：`pointsToUse > floor(orderAmount × 30%)`。
- **Rationale**: 需求方指定的固定順序；先擋掉非法輸入可避免後續比較產生無意義結果。
  `orderAmount`、`pointsBalance` 的「整數」檢查是需求「金額與點數皆以整數元／整數點計算」
  的自然延伸，歸入 `INVALID_INPUT`。
- **Alternatives considered**: 回傳多個原因（需求方否決）；不檢查 orderAmount（需求方否決）。

## R3. 整數判定

- **Decision**: 使用 `Number.isInteger(x)`；它對 `NaN`、`Infinity`、小數皆回傳 false。
- **Rationale**: 需求要求整數；`Number.isInteger` 是標準且不需額外依賴。
- **Alternatives considered**: `x % 1 === 0`（對 Infinity 判斷錯誤）；`Number.isSafeInteger`
  （更嚴格，但金額不會超過安全整數範圍，差異無實際影響）。

## R4. 0 點折抵

- **Decision**: `pointsToUse === 0` 走正常路徑：通過所有檢查後回傳
  `{ ok: true, finalAmount: orderAmount, remainingPoints: pointsBalance }`。
- **Rationale**: 需求方答「成功」；不需特判，因為 0 ≤ balance 且 0 ≤ limit 恆成立。

## R5. 測試組織（cucumber-js 11 + tsx + ESM）

- **Decision**: 一個 feature 檔 `tests/features/points-discount.feature`（Scenario + Scenario Outline
  涵蓋成功、各失敗代碼、邊界與多重違規順序），一個 step 檔 `tests/steps/points-discount.steps.ts`，
  自 `@cucumber/cucumber` 匯入 `Given/When/Then`，以 `node:assert/strict` 斷言；
  steps 內以模組區域變數保存輸入與結果（每個 scenario 的 Given 會重設）。import 產品碼時寫
  `../../src/points.js`（NodeNext 解析規則，tsx 會對應到 `.ts`）。
- **Rationale**: `cucumber.cjs` 已設定路徑與 `tsx` 載入；不新增依賴即可跑。
- **Alternatives considered**: 加 vitest/jest（違反憲章 II 與「不新增依賴」）；
  以 `tests/support/world.ts` 自訂 World（單一函式不需要，維持最簡）。
