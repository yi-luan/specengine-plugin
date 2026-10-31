# Implementation Plan: 多租戶優惠券

**Branch**: `001-multi-tenant-coupon` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-multi-tenant-coupon/spec.md`

## Summary

提供純函式 `applyCoupons`（於 `src/coupon.ts` 匯出），輸入租戶、訂單金額、提交的優惠券清單與當下時間，
輸出成功時的折扣後金額、折扣總額與依傳入順序排列的套用代碼，或失敗時的固定原因代碼。
所有規則以 cucumber-js 情境驗證，情境與 step definitions 先寫成紅燈，再實作為綠燈。

## Technical Context

**Language/Version**: TypeScript 5.x（`strict: true`），target ES2022，module NodeNext（沿用 `tsconfig.json`）

**Primary Dependencies**: 無新增執行期依賴。開發期沿用既有 `@cucumber/cucumber`、`tsx`、`typescript`

**Storage**: N/A（純函式，不碰資料庫；由需求與 Assumptions 定義）

**Testing**: cucumber-js 經 `npm test` 執行；Gherkin 放在 `tests/features/`，step definitions 放在 `tests/steps/`，共用工具放在 `tests/support/`

**Target Platform**: Node.js（ES modules，與既有 `package.json` 相同）

**Project Type**: library（單一模組，匯出純函式）

**Performance Goals**: N/A（無效能需求）

**Constraints**: 純函式、無 I/O、時間由 `now` 傳入；金額為整數元；失敗以結果值回傳而非拋出例外（見 constitution I–V）

**Scale/Scope**: 單一模組 `src/coupon.ts`，一組公開函式與型別，13 條功能需求、5 個失敗代碼加 2 個券值相關代碼

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢核 | 結果 |
|------|------|------|
| I. TypeScript Strict Product Code | 產品碼放在 `src/coupon.ts`，`strict: true`，匯出型別與函式簽章明確，不使用 `any`，名稱依需求檔固定 | PASS |
| II. Behavior Specified in Gherkin | 每條 FR 至少一個情境，情境放在 `tests/features/` 並由 `npm test` 執行 | PASS（於 tasks 落實） |
| III. Test-First | tasks 階段先寫情境與 step definitions 並確認失敗，再實作 | PASS（於 tasks 落實） |
| IV. Pure, Dependency-Free Domain Logic | `applyCoupons` 無 I/O，`now` 以輸入傳入 | PASS |
| V. Integer Money and Explicit Failure Results | 百分比折扣的捨去規則明確定義（見 research.md）；失敗以 `{ ok: false, reason }` 回傳 | PASS |
| 技術棧 | 無新增依賴；`npm run typecheck` 必須通過 | PASS |
| 開發流程與品質閘門 | `npm test` 全綠且 `npm run typecheck` 通過為完成條件 | PASS（於 converge 驗證） |

Phase 1 設計完成後重新檢核：無違規項目，Complexity Tracking 不需要填寫。

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-coupon/
├── plan.md              # 本檔（/speckit-plan 輸出）
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/
│   └── apply-coupons.md # Phase 1 輸出（公開函式契約）
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # 由 /speckit-tasks 產生，本階段不建立
```

### Source Code (repository root)

```text
src/
└── coupon.ts            # 匯出 Coupon、ApplyInput、ApplyResult、applyCoupons

tests/
├── features/
│   └── coupon.feature   # 由 spec 的 User Stories 與 FR 產生的 Gherkin 情境
├── steps/
│   └── coupon.steps.ts  # step definitions（紅燈先行）
└── support/             # 本功能暫不需要共用工具
```

**Structure Decision**: 單一模組。`src/coupon.ts` 為唯一的產品檔；Gherkin 與 step definitions 分別落在
`tests/features/` 與 `tests/steps/`，對應 `cucumber.cjs` 的既有路徑設定。`src/index.ts` 維持既有內容，不另外 re-export，
避免擴大公開面。

## Complexity Tracking

> 本計畫沒有 Constitution Check 的違規項目，本表留空。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| （無） | | |
