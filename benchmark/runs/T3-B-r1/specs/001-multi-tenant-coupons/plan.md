# Implementation Plan: 多租戶優惠券套用

**Branch**: `001-multi-tenant-coupons` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-multi-tenant-coupons/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

實作一個純函式 `applyCoupons(input: ApplyInput): ApplyResult`（`src/coupon.ts`），在多租戶情境下對一筆訂單套用零到多張優惠券：依固定順序驗證（輸入合法性、券值合法性、租戶、重複、有效期間、最低消費、疊加規則、超額），通過後計算折扣（每張 PERCENT 以原始金額計算並各自無條件捨去、FIXED 直接加總），回傳折扣後金額、折扣總額與依傳入順序的套用代碼；任一驗證失敗即回傳固定代碼字串的失敗原因。以 cucumber-js Gherkin 情境逐條覆蓋 FR-001～FR-016。

## Technical Context

**Language/Version**: TypeScript 5.9.3（`strict`、`module: NodeNext`）於 Node.js v24.18.0（ESM）

**Primary Dependencies**: 無執行期依賴；開發依賴 `@cucumber/cucumber` 11.3.0、`tsx` 4.23.15、`typescript` 5.9.3、`@types/node`

**Storage**: N/A（純函式，不碰資料庫）

**Testing**: cucumber-js，`npm test` = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`，設定於 `cucumber.cjs`（features `tests/features/**/*.feature`，steps `tests/steps/**/*.ts`，support `tests/support/**/*.ts`）；`npm run typecheck` = `tsc --noEmit`

**Target Platform**: Node.js 24（跨平台 library 模組）

**Project Type**: library（單一 TypeScript 模組）

**Performance Goals**: 單次呼叫為 O(n) 於券數 n；無特殊目標（券數為個位數到十位數）

**Constraints**: 公開介面名稱與型別固定不可更名；金額全為整數；不得讀系統時鐘；不得新增執行期依賴

**Scale/Scope**: 單一函式、單一模組；約 8 條錯誤路徑 + 疊加計算；預估 Gherkin 情境 25～35 條

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 狀態 |
|------|------|------|
| I. TypeScript Only | 產品碼與測試碼皆為 `.ts`，`strict` 模式；`Coupon`/`ApplyInput`/`ApplyResult` 型別逐字沿用需求 | PASS |
| II. cucumber-js BDD | 每條 FR 對應至少一個 Gherkin 情境；feature 於 `tests/features/`、steps 於 `tests/steps/`、support 於 `tests/support/` | PASS |
| III. 單一測試入口 | `npm test` 透過既有 `cucumber.cjs` 自動發現 feature 與 step；`npm run typecheck` 零錯誤 | PASS |
| IV. src/ 與 tests/ 分層 | 產品碼只在 `src/coupon.ts`；測試不含業務邏輯；產品碼不 import `tests/` | PASS |
| V. 純函式、整數金額 | `now` 由輸入傳入；無 I/O；所有金額整數；PERCENT 折扣明確捨去 | PASS |

**Pre-Phase-0 gate**: PASS，無需 Complexity Tracking。

**Post-Phase-1 re-check**: PASS（設計未引入新模組、依賴或 I/O；見下方結構）。

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-coupons/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── coupon-api.md    # applyCoupons 公開介面與 reason 代碼契約
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # 既有（保留）
└── coupon.ts            # 本功能：型別 + applyCoupons（純函式）

tests/
├── features/
│   └── coupon.feature   # Gherkin 情境（成功計算、各錯誤路徑、疊加、邊界）
├── steps/
│   └── coupon.steps.ts  # Step definitions：組 Coupon、呼叫 applyCoupons、斷言結果
└── support/
    └── world.ts         # 自訂 World：保存輸入與結果
```

**Structure Decision**: 採單一 library 結構。產品碼集中於 `src/coupon.ts`（需求固定的檔名），測試依 `cucumber.cjs` 既定路徑放在 `tests/features`、`tests/steps`、`tests/support`。不新增子目錄層級，避免過度設計。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規，本節留空。

## Design Notes (from Phase 0/1)

- 驗證順序（FR-015）實作為線性管線：每個檢查函式回傳 `string | null`，依序執行，遇第一個非 null 即回傳 `{ ok: false, reason }`。
- 時間比較：`Date.parse(iso)` 取毫秒時間戳；無法解析（NaN）視為 `INVALID_COUPON`（券的時間）或 `INVALID_INPUT`（`now`）。
- 折扣計算：`percentTotal = Σ Math.floor(orderAmount * value / 100)`；`fixedTotal = Σ value`；`discount = percentTotal + fixedTotal`；`discount > orderAmount` → `DISCOUNT_EXCEEDS_AMOUNT`；否則 `finalAmount = orderAmount - discount`。
- 疊加規則：`coupons.length > 1 && coupons.some(c => !c.stackable)` → `NOT_STACKABLE`。
- 重複判定：以 `tenantId + '\u0000' + code` 為 key 於 Set 中查重。
