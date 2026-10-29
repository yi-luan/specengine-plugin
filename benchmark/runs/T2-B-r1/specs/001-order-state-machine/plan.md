# Implementation Plan: 訂單狀態機（Order State Machine）

**Branch**: `001-order-state-machine` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-order-state-machine/spec.md`

## Summary

實作一組純函式的訂單狀態機（`createOrder` / `pay` / `ship` / `cancel` / `refund`），狀態為
CREATED → PAID → SHIPPED → REFUNDED，CREATED/PAID 可 → CANCELLED。所有操作回傳
`OrderResult`（成功帶新訂單、失敗帶固定代碼 reason），不修改傳入訂單。以 Gherkin 情境
（cucumber-js）作為唯一驗收，`npm test` 全綠即完成。

## Technical Context

**Language/Version**: TypeScript 5.6（strict、ESM、NodeNext），Node.js 24 via `tsx`

**Primary Dependencies**: 無執行期依賴；開發依賴 `@cucumber/cucumber` 11.x、`tsx`、`typescript`、`@types/node`（皆已安裝）

**Storage**: N/A（純值運算，無持久化）

**Testing**: cucumber-js（`cucumber.cjs`：features 於 `tests/features/**/*.feature`，steps 於 `tests/steps/**/*.ts`，support 於 `tests/support/**/*.ts`）；斷言用 Node 內建 `node:assert/strict`

**Target Platform**: Node.js 24（任何平台）

**Project Type**: library（單一模組 `src/order.ts`）

**Performance Goals**: N/A（每次操作為 O(1) 純計算）

**Constraints**: 介面名稱與型別固定不可更名（FR-014）；金額整數元；純函式；失敗 reason 限四個固定代碼

**Scale/Scope**: 1 個模組、5 個函式、5 個狀態、4 個失敗代碼；約 30 個 Gherkin 情境

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 結果 |
|------|------|------|
| I. TypeScript-only in `src/` | 僅新增 `src/order.ts`；固定介面逐字匯出 | PASS |
| II. Gherkin + cucumber-js in `tests/` | `tests/features/order-state-machine.feature` + `tests/steps/order.steps.ts`；情境 1:1 對應 spec 驗收情境 | PASS |
| III. `npm test` 唯一關卡 | 不改 test script；feature/steps 放在既有 glob 內即可被發現 | PASS |
| IV. Test-first | tasks 以「先寫 feature + steps 並觀察紅燈 → 再實作」排序 | PASS |
| V. 純函式 | 以展開運算子回傳新物件；失敗回傳值不拋例外；不用全域狀態 | PASS |
| 無新執行期依賴 | 斷言用 `node:assert/strict` | PASS |

Post-design re-check（Phase 1 完成後）：設計未新增任何目錄層、依賴或非純邏輯，全部 PASS。

## Project Structure

### Documentation (this feature)

```text
specs/001-order-state-machine/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── order-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # 既有；改為 re-export ./order.js
└── order.ts             # 本功能：型別 + 5 個純函式 + reason 代碼常數

tests/
├── features/
│   └── order-state-machine.feature   # Gherkin 情境（對應 spec US1–US4 + Edge Cases）
├── steps/
│   └── order.steps.ts                # Step definitions（Given/When/Then）
└── support/
    └── world.ts                      # 自訂 World：保存當前訂單、操作前快照、最後結果
```

**Structure Decision**: 單一專案（library）。產品碼只有 `src/order.ts`；測試以 cucumber
既有 glob 配置放置，不需修改 `cucumber.cjs` 或 `package.json`。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規，無需填寫。
