# Implementation Plan: 事件驅動下單流程（訂單、庫存、付款）

**Branch**: `001-event-order-flow` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-event-order-flow/spec.md`

## Summary

以三個純記憶體的服務（訂單、庫存、付款）實作事件驅動的下單流程。每個服務只保存自己的狀態，只透過 `handle(event)` 接收事件、回傳新事件；廣播與傳遞由測試驅動程式負責。冪等性以「事件 id 去重」加上「狀態機守衛」實現；逾時以呼叫端推進的 `tick(now)` 判定。全部公開介面依需求的技術介面逐字實作於 `src/shop.ts`。

## Technical Context

**Language/Version**: TypeScript 5.6（ESM，`"type": "module"`），執行環境 Node 24

**Primary Dependencies**: 無執行期相依套件。測試使用 `@cucumber/cucumber` 11 與 `tsx`（已在 `package.json`）

**Storage**: N/A（全部在記憶體中，符合憲法 IV）

**Testing**: `npm test`（cucumber-js，Feature 位於 `tests/features/**/*.feature`，步驟定義位於 `tests/steps/**/*.ts`）；`npm run typecheck`（`tsc --noEmit`）

**Target Platform**: 本機 Node 程序（無網路、無資料庫）

**Project Type**: library（匯出工廠函式與介面的 TypeScript 模組）

**Performance Goals**: N/A（規格未要求；測試規模為單元級）

**Constraints**: 金額與數量皆為整數；時間為呼叫端傳入的 ISO 8601 字串；服務之間不得互相讀取狀態

**Scale/Scope**: 單一 SKU 集合、單一顧客集合的記憶體模型；不含持久化與併發

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 結果 |
|------|------|------|
| I. TypeScript 強型別 | 公開介面逐字依需求實作；`tsconfig.json` 嚴格模式；無 `any` | PASS |
| II. Gherkin 先行、TDD | 先寫 `tests/features/*.feature`，再寫步驟與實作；tasks 階段必須包含紅燈步驟 | PASS（由 tasks / implement 強制） |
| III. 服務隔離、只靠事件 | 每個服務只持有自己的 Map／狀態；`handle` 對不關心的事件回傳 `[]`；去重與守衛於各服務內部 | PASS |
| IV. 全記憶體、無外部副作用 | 不讀系統時鐘，時間由 `tick(now)` 與 `at` 參數傳入；無 I/O | PASS |
| V. 簡單優先、整數金額 | 僅實作規格列出的事件與狀態；金額與數量以整數運算 | PASS |
| Technology Constraints | 不引入需求以外的執行期套件；產品碼在 `src/`，步驟在 `tests/steps/` | PASS |

**Gate 結論**: 無違規，Complexity Tracking 留空。

**Post-design re-check (Phase 1 完成後)**: 已檢查 data-model.md 與 contracts/shop-api.md，仍全數 PASS。

## Project Structure

### Documentation (this feature)

```text
specs/001-event-order-flow/
├── spec.md
├── plan.md                  # 本檔
├── research.md              # Phase 0
├── data-model.md            # Phase 1
├── quickstart.md            # Phase 1
├── contracts/
│   └── shop-api.md          # Phase 1：公開介面與事件契約
├── checklists/
│   └── requirements.md
└── tasks.md                 # 由 /speckit-tasks 產生
```

### Source Code (repository root)

```text
src/
└── shop.ts                  # 型別、三個服務的工廠函式（createOrderService / createInventoryService / createPaymentService）

tests/
├── features/
│   └── order-flow.feature   # Gherkin 規格（先於實作）
└── steps/
    └── order-flow.steps.ts  # 步驟定義（驅動事件廣播與斷言）
```

**Structure Decision**: 單一 library 專案。三個服務放在同一個 `src/shop.ts`，因為需求明定匯出位置為該檔，且三個服務的「隔離」由各工廠函式內部封閉的狀態保證，而非由模組邊界保證。

## Complexity Tracking

> Constitution Check 無違規，本節留空。
