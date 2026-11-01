# Implementation Plan: 庫存服務（事件驅動下單流程）

**Branch**: `001-inventory-reservation`（未建立 git 分支） | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-inventory-reservation/spec.md`

## Summary

實作 `src/inventory.ts` 的 `createInventoryService(stock)`，回傳符合 `InventoryService` 介面的記憶體內服務。服務依事件保留、放回庫存，並以訂單狀態表與事件 id 集合做冪等與亂序容忍。測試以 cucumber-js（Gherkin feature + TypeScript step definitions）撰寫，事件由測試自行準備，不依賴其他服務。

## Technical Context

**Language/Version**: TypeScript 5（`strict: true`），ES2022，NodeNext 模組

**Primary Dependencies**: 無新增執行期相依；使用 Node 內建 `node:crypto` 的 `randomUUID` 產生事件 id。測試使用既有的 `@cucumber/cucumber`、`tsx`。

**Storage**: 無。全部在記憶體中（Map / Set）。

**Testing**: cucumber-js（`npm test`），feature 放在 `tests/features/`，step definitions 放在 `tests/steps/`。另以 `npm run typecheck` 檢查型別。

**Target Platform**: Node.js（`npm test` 執行環境）

**Project Type**: library（由整合人員接上事件匯流排）

**Performance Goals**: 無特別目標；每個事件處理為 O(1) 查表。

**Constraints**: 不碰資料庫或網路；只修改 `src/inventory.ts` 與自己的測試檔案；不得修改 `src/events.ts`、`src/shop.ts`、`src/index.ts`、`src/order.ts`、`src/payment.ts`。

**Scale/Scope**: 單一 SKU 集合、單一服務實例；數量與庫存皆為整數。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I 記憶體內、無外部依賴：通過。服務只用 Map/Set，不讀寫其他服務。
- II 固定介面不可更動：通過。`createInventoryService` 名稱與簽章不變，`InventoryService` 介面不改。
- III 負責範圍邊界：通過。只改 `src/inventory.ts` 與 `tests/` 下自己的檔案。
- IV 測試先行：通過。tasks 階段會先寫 feature 與 step 紅燈，再實作。
- V 事件語意的健壯性：通過。以事件 id 去重、以訂單狀態表做冪等，並容忍取消先到。

Post-design re-check: 通過（見下方 Phase 1 產出）。

## Project Structure

### Documentation (this feature)

```text
specs/001-inventory-reservation/
├── plan.md              # 本檔
├── research.md          # Phase 0 決策
├── data-model.md        # Phase 1 狀態模型
├── quickstart.md        # Phase 1 驗證指南
├── checklists/
│   └── requirements.md
└── tasks.md             # 由 speckit-tasks 產生
```

（本功能是內部函式庫，對外介面已固定於 `src/events.ts`，不另建 `contracts/`。）

### Source Code (repository root)

```text
src/
└── inventory.ts         # 本次實作（唯一的產品碼變更）

tests/
├── features/
│   └── inventory-reservation.feature
└── steps/
    └── inventory-reservation.steps.ts
```

**Structure Decision**: 單一專案。產品碼只放 `src/inventory.ts`；測試放在 `tests/features/` 與 `tests/steps/`，與 `cucumber.cjs` 的設定一致。

## Phase 0 / Phase 1 Outputs

- `research.md`：事件 id 產生方式、取消與付款失敗先到的處理、重複事件去重策略。
- `data-model.md`：庫存表、訂單保留紀錄、事件 id 集合與狀態轉移。
- `quickstart.md`：如何執行 `npm test` 與 `npm run typecheck`，以及預期結果。
