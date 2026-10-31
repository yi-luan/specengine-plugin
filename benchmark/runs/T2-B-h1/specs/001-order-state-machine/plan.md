# Implementation Plan: 訂單狀態機

**Branch**: `001-order-state-machine` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-order-state-machine/spec.md`

## Summary

以純函式實作訂單狀態機：`createOrder`、`pay`、`ship`、`cancel`、`refund` 五個操作，各自回傳 `OrderResult`。成功時回傳新的訂單物件，失敗時回傳 `{ ok: false, reason }`，不修改傳入資料。已付款取消時，退款全額計入 `refundedAmount`（Clarifications Q1: A）。驗收以 cucumber feature 檔描述各條規則，由 `npm test` 執行。

## Technical Context

**Language/Version**: TypeScript 5.6（`strict: true`），target ES2022，module NodeNext
**Primary Dependencies**: `@cucumber/cucumber` 11.x（測試）、`tsx` 4.x（執行 TypeScript）、`@types/node` 22.x
**Storage**: N/A（純函式，不做持久化）
**Testing**: cucumber-js（`npm test`），feature 檔位於 `tests/features/`，步驟定義位於 `tests/steps/`，設定檔 `cucumber.cjs`；型別檢查 `npm run typecheck`
**Target Platform**: Node.js（ESM）
**Project Type**: library（單一模組，匯出純函式）
**Performance Goals**: N/A（操作為常數時間的物件運算）
**Constraints**: 金額為整數元；公開介面與型別名稱依需求固定；不得修改傳入的 Order
**Scale/Scope**: 單一模組 `src/order.ts`，5 個操作、5 種狀態

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I. 純函式與不可變性：全部為純函式，成功時建立新物件 → PASS
- II. 規格先行：所有行為追溯到 spec FR-001 至 FR-012 → PASS
- III. 測試先行：tasks 與 implement 階段必須先寫 feature 與步驟定義（紅燈），再實作 → PASS（於後續階段強制執行）
- IV. 型別嚴格與介面凍結：匯出名稱與簽章依需求固定；`strict` 模式 → PASS
- V. 金額為整數與明確失敗：金額以整數檢查；業務失敗回傳 `{ ok: false, reason }` → PASS
- 技術限制：`npm test` 為唯一驗收入口，`npm run typecheck` 需同時通過；不新增相依套件 → PASS
- 開發流程：spec 與 checklist 已全數通過 → PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-order-state-machine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── order-api.md     # Phase 1 output（公開介面契約）
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # /speckit-tasks 產出（本階段不建立）
```

### Source Code (repository root)

```text
src/
└── order.ts             # 型別與五個純函式（唯一產品程式碼）

tests/
├── features/
│   └── order-state-machine.feature   # 由 spec 的 Acceptance Scenarios 轉寫
├── steps/
│   └── order-state-machine.steps.ts  # cucumber 步驟定義
└── support/             # 既有，視需要使用
```

**Structure Decision**: 單一模組結構。產品程式碼只有 `src/order.ts`；測試為 `tests/features/` 與 `tests/steps/`，對應 `cucumber.cjs` 既有設定。本功能的 feature 檔只放 `tests/features/`，不使用 `.specengine/spec/features/` 路徑。

## Complexity Tracking

> 無違反憲章的項目，本節不需填寫。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| （無） | | |
