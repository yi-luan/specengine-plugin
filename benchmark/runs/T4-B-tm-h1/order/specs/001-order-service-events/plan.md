# Implementation Plan: 訂單服務（事件驅動下單流程）

**Branch**: `001-order-service-events` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-order-service-events/spec.md`

## Summary

實作團隊三服務中的「訂單服務」：`src/order.ts` 匯出 `createOrderService(): OrderService`。服務只保存自己的訂單狀態（記憶體），透過 `placeOrder`、`cancelOrder`、`tick`、`handle`、`getOrder` 與外部互動。事件以「至少一次、可能重複、可能亂序」為前提設計：狀態轉換採「合法來源狀態才轉換」的狀態機，事件 id 採決定性格式，使重複處理不產生新事件。

## Technical Context

**Language/Version**: TypeScript 5.x（ESM，`package.json` `"type": "module"`），執行環境 Node.js
**Primary Dependencies**: 無新增（只使用 `src/events.ts` 的型別）
**Storage**: 無；記憶體內 `Map<orderId, OrderRecord>`
**Testing**: `@cucumber/cucumber` + Gherkin（`tests/features/`）、step definitions（`tests/steps/`）、`npm test`
**Target Platform**: Node.js 命令列／測試環境（純函式庫，無 I/O）
**Project Type**: library（三服務之一，由整合人員組合）
**Performance Goals**: 無特別要求（記憶體 Map 操作即可）
**Constraints**: 不讀系統時鐘、不做 I/O、金額與數量皆為整數、不得讀寫庫存與付款的狀態
**Scale/Scope**: 單一訂單服務，訂單數量無上限約束

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- 一、TypeScript 為唯一實作語言：PASS（`src/order.ts` 與測試皆為 TS，公開介面使用 `events.ts` 型別，不用 `any`）
- 二、事件驅動與冪等：PASS（狀態機只接受合法來源狀態；事件 id 決定性，重複處理不重發）
- 三、純記憶體、無副作用：PASS（無 I/O；逾時以 `tick(now)` 傳入的時間判斷）
- 四、測試先行：PASS（tasks 階段會先產生紅燈 feature 與 step，再實作）
- 五、檔案所有權邊界：PASS（只修改 `src/order.ts` 與 `tests/` 下自己的測試；不改 `events.ts`、`shop.ts`、`index.ts`、`inventory.ts`、`payment.ts`）
- 技術約束：`npm test` 與 `npm run typecheck` 必須全綠（PASS，於 implement 驗證）

## Phase 0: Research

見 [research.md](./research.md)。無未解的 NEEDS CLARIFICATION（兩題已由需求方裁示）。

## Phase 1: Design

- 資料模型：見 [data-model.md](./data-model.md)
- 介面合約：見 [contracts/order-service.md](./contracts/order-service.md)
- 驗證指引：見 [quickstart.md](./quickstart.md)

## Project Structure

### Documentation (this feature)

```text
specs/001-order-service-events/
├── spec.md
├── plan.md              # 本檔
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── order-service.md
├── checklists/
│   └── requirements.md
└── tasks.md             # 由 /speckit-tasks 產生
```

### Source Code (repository root)

```text
src/
├── order.ts             # 本功能唯一的產品碼（createOrderService）
├── events.ts            # 共用，不可修改
├── shop.ts              # 共用，不可修改
├── index.ts             # 共用，不可修改
├── inventory.ts         # 同事負責，不可修改
└── payment.ts           # 同事負責，不可修改

tests/
├── features/
│   └── order-service.feature   # 本功能 Gherkin 規格
├── steps/
│   └── order-service.steps.ts  # 本功能 step definitions（自己的測試）
└── support/                    # 目前為空，若需要共用 world 可放此處
```

**Structure Decision**: 單一函式庫結構。產品碼只有 `src/order.ts`；測試為 cucumber feature 與 steps，放在 `tests/` 底下。`cucumber.cjs` 已涵蓋 `tests/features/**/*.feature` 與 `tests/steps/**/*.ts`，不需修改設定。

## Complexity Tracking

無違規，無需填寫。
