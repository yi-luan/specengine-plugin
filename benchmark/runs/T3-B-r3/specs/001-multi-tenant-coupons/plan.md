# Implementation Plan: 多租戶優惠券（Multi-Tenant Coupons）

**Branch**: `001-multi-tenant-coupons` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-multi-tenant-coupons/spec.md`

## Summary

提供純函式 `applyCoupons(input)`（`src/coupon.ts`，介面固定不可更名），在單一請求中以
all-or-nothing 語意驗證並套用同租戶優惠券。驗證依固定的類別優先序（INVALID_INPUT →
INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED → MIN_ORDER_NOT_MET →
NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT）回報第一個命中的 reason；全部通過時，PERCENT 以折扣前
金額計算並各自無條件捨去，FIXED 取面額，加總為折扣總額。行為以 cucumber-js Gherkin 情境驗收。

## Technical Context

**Language/Version**: TypeScript 5.6（strict），Node.js 24，經 `tsx` 執行

**Primary Dependencies**: 無 runtime 依賴；dev：`@cucumber/cucumber` 11、`tsx`、`typescript`

**Storage**: N/A（純函式，不碰資料庫）

**Testing**: cucumber-js，`npm test`（`cucumber.cjs` 載入 `tests/features/**/*.feature`、`tests/steps/**/*.ts`）；`npm run typecheck`

**Target Platform**: Node.js 函式庫（由結帳流程呼叫）

**Project Type**: library（單一專案）

**Performance Goals**: 單次呼叫 O(n)（n = 券數），一般 n < 10，無特別效能目標

**Constraints**: 純函式、確定性；時間由 `now` 傳入；金額為整數元；對外型別與函式名稱固定

**Scale/Scope**: 單一模組 `src/coupon.ts`、一個 feature 檔、一個 step 檔

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. TypeScript Strict | 程式與測試皆 TS，`tsc --noEmit` 通過，不用 `any` | PASS（設計上以 `unknown` 做執行期防禦檢查） |
| II. Behavior-First (cucumber-js) | 每條 FR 至少一個 Gherkin 情境，先紅後綠 | PASS（tasks 先寫 feature/steps 再實作） |
| III. `npm test` 單一入口 | 全綠、無 undefined/pending | PASS（沿用現有 `cucumber.cjs`） |
| IV. Source/Test Layout | 產品碼 `src/`，feature 在 `tests/features/`，steps 在 `tests/steps/` | PASS |
| V. Simplicity & Pure Logic | 純函式、`now` 外部傳入、固定介面不改名、無新依賴 | PASS |

Post-design re-check（Phase 1 後）：PASS，無違規，Complexity Tracking 留空。

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-coupons/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── apply-coupons.md
└── tasks.md             # /speckit-tasks 產出
```

### Source Code (repository root)

```text
src/
├── index.ts             # 既有；re-export coupon
└── coupon.ts            # Coupon / ApplyInput / ApplyResult / applyCoupons

tests/
├── features/
│   └── coupon.feature   # 所有驗收情境（繁中描述 + 參數表）
├── steps/
│   └── coupon.steps.ts  # Step Definitions
└── support/             # 既有（空），本功能不需要
```

**Structure Decision**: 單一專案。產品碼僅新增 `src/coupon.ts`；測試以一個 feature 檔與一個 step 檔
覆蓋全部 FR；沿用既有 `cucumber.cjs` 不需修改設定。

## Complexity Tracking

無違規，不需填寫。
