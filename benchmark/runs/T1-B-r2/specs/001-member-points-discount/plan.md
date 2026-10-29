# Implementation Plan: 會員點數折抵

**Branch**: `001-member-points-discount` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-member-points-discount/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

實作一個純函式 `applyPointsDiscount(input)`（`src/points.ts`），依固定順序驗證輸入
（`INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT`），
以 1 點折 1 元計算折抵後應付金額與剩餘點數；30% 上限以整數運算 `floor(orderAmount × 3 / 10)`
取整，等於上限允許、超過整筆拒絕。行為以 cucumber-js Gherkin 情境描述，step definitions
在 `tests/steps/`，由 `npm test` 執行。技術介面（型別名稱與函式簽名）依需求文件固定，不得更名。

## Technical Context

**Language/Version**: TypeScript 5.9.3（`strict`、`module: NodeNext`），執行於 Node.js v24.18.0（ESM，`"type": "module"`）

**Primary Dependencies**: 無執行期依賴；開發依賴 `@cucumber/cucumber` 11.3.0、`tsx` 4.23.15、`typescript` 5.9.3、`@types/node`

**Storage**: N/A（純函式，不碰資料庫；呼叫方負責持久化剩餘點數）

**Testing**: cucumber-js（`npm test` = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`，設定於 `cucumber.cjs`：features 於 `tests/features/**/*.feature`，steps 於 `tests/steps/**/*.ts`，support 於 `tests/support/**/*.ts`）；型別檢查 `npm run typecheck`

**Target Platform**: Node.js 24（跨平台；本機為 Windows 11）

**Project Type**: library（單一模組，供結帳流程呼叫）

**Performance Goals**: 單次呼叫 O(1)，純算術與比較；無 I/O。不另設效能目標。

**Constraints**: 金額與點數皆為整數；函式無副作用、無外部狀態；公開介面名稱固定（`PointsDiscountInput`、`PointsDiscountResult`、`applyPointsDiscount`）；失敗原因為四個固定代碼之一

**Scale/Scope**: 一個匯出函式、兩個型別；3 個 user story、11 條 FR；預估 1 個 feature 檔、1 個 step 檔

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 本計畫如何符合 | 狀態 |
|------|----------------|------|
| I. TypeScript-Only | 產品碼 `src/points.ts`、測試 `tests/steps/*.ts` 全為 TS，strict 模式；介面依需求逐字匯出 | PASS |
| II. Behaviour Tests With cucumber-js | 驗收情境寫成 `tests/features/points-discount.feature`，steps 在 `tests/steps/`；每條 FR 至少一個 scenario | PASS |
| III. Test-First | tasks 將先寫 feature + steps（紅燈），再實作 `src/points.ts` 轉綠；不得弱化測試 | PASS |
| IV. Single Test Entry Point `npm test` | 不改 `cucumber.cjs` 的路徑；新 feature/steps 自動被 `npm test` 掃到 | PASS |
| V. Fixed Layout src/ + tests/ | 只新增 `src/points.ts` 與 `tests/` 下檔案；`src/` 不 import `tests/`；純函式無 I/O | PASS |
| 技術限制 | 不新增任何依賴；`npm run typecheck` 需乾淨 | PASS |

Pre-Phase-0 gate: PASS（無違規，無需 Complexity Tracking）。

Post-Phase-1 re-check: PASS（設計產出未引入新依賴、新目錄或副作用）。

## Project Structure

### Documentation (this feature)

```text
specs/001-member-points-discount/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── points-api.md    # applyPointsDiscount 公開介面契約
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # 既有佔位檔（保留）
└── points.ts            # applyPointsDiscount + 型別（本功能新增）

tests/
├── features/
│   └── points-discount.feature   # Gherkin 驗收情境（本功能新增）
├── steps/
│   └── points-discount.steps.ts  # step definitions（本功能新增）
└── support/                      # 既有空目錄；本功能不需 hooks/world 時維持為空
```

**Structure Decision**: 採單一專案結構。產品碼只有 `src/points.ts`；測試依 `cucumber.cjs`
既定路徑放在 `tests/features/`（feature）與 `tests/steps/`（steps）。不建立
`tests/unit`、`tests/contract` 等子目錄，因為 cucumber 設定只掃上述路徑，且單一純函式不需要
額外分層。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規，本節留空。
