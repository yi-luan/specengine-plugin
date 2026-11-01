# Implementation Plan: 訂單服務（事件驅動下單流程）

**Branch**: `001-order-service` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-order-service/spec.md`

## Summary

在 `src/order.ts` 實作 `createOrderService(): OrderService`：記憶體內保存訂單，`placeOrder` 驗證輸入並發
`OrderPlaced`；`handle` 依 `PaymentSucceeded`／`StockRejected`／`PaymentFailed` 推進狀態並以事件 id 去重；
`cancelOrder` 允許 PENDING／CONFIRMED 取消並發 `OrderCancelled`；`tick(now)` 把 now − at ≥ 15 分鐘仍為
PENDING 的訂單逾時取消。測試以 cucumber-js 的 Gherkin 情境驅動，自行構造其他服務的事件。

## Technical Context

**Language/Version**: TypeScript 5.6（strict, ES2022, NodeNext），Node 24 以 tsx 載入

**Primary Dependencies**: 無執行期依賴；開發依賴 `@cucumber/cucumber` 11、`tsx`、`typescript`、`@types/node`

**Storage**: N/A（記憶體內 `Map`）

**Testing**: cucumber-js（`npm test`），feature 檔 `tests/features/**/*.feature`，步驟 `tests/steps/**/*.ts`，支援 `tests/support/**/*.ts`；型別檢查 `npm run typecheck`

**Target Platform**: Node.js 24（本機），純函式庫，無 I/O

**Project Type**: library（單一服務模組，由整合人員接上事件匯流排）

**Performance Goals**: N/A（記憶體內同步操作；`tick` 對所有 PENDING 訂單線性掃描即可）

**Constraints**: 只可修改 `src/order.ts` 與 `tests/**`；不可 import `inventory.ts`／`payment.ts`；不讀系統時鐘；不碰 DB／網路；金額數量皆整數

**Scale/Scope**: 單一檔案約 150 行；4 個 user story、約 30 個情境

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 結果 |
|------|------|------|
| I. Spec-Driven, Test-First | 每個 FR 對應 Gherkin 情境；先寫 feature + steps（紅燈）再實作 | PASS（tasks 階段依此排序） |
| II. Fixed Shared Contract | 只實作 `OrderService` 介面；事件 id 以 `order-` 前綴；不改 events.ts/shop.ts | PASS |
| III. Service Isolation | 只 import `./events.js` 型別；不讀時鐘；只保存自己的 Map | PASS |
| IV. At-Least-Once, Unordered | 事件 id 去重 + 狀態機守衛；情境涵蓋重複與亂序 | PASS |
| V. Simplicity & Integer | 單檔、`Map`、`Number.isInteger` 驗證；無額外抽象 | PASS |

Post-design re-check（Phase 1 完成後）：設計未新增任何檔案到 `src/`，未引入依賴，仍全部 PASS。

## Project Structure

### Documentation (this feature)

```text
specs/001-order-service/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── order-service.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── events.ts            # 共用契約（唯讀）
├── shop.ts              # 整合入口（唯讀）
├── index.ts             # 唯讀
├── inventory.ts         # 同事負責（唯讀，空殼）
├── payment.ts           # 同事負責（唯讀，空殼）
└── order.ts             # 本 feature 唯一修改的產品碼

tests/
├── features/
│   └── order-service.feature    # 本 feature 的 Gherkin 情境
├── steps/
│   └── order.steps.ts           # 步驟定義
└── support/
    └── world.ts                 # 自訂 World：持有 OrderService、最近一次結果／事件
```

**Structure Decision**: 單一專案、單一檔案實作。測試放在 `tests/`（cucumber.cjs 已設定 `tests/features/**/*.feature`
與 `tests/steps/**/*.ts`、`tests/support/**/*.ts`），不新增設定檔。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規。

## Design Decisions (from research.md)

- 去重：`Set<string>` 保存已處理的事件 id；先查 id 再看狀態（雙重保障）。
- 狀態守衛：結果事件只在 `PENDING` 時生效；`CANCELLED`／`REJECTED`／`FAILED` 終態；`CONFIRMED` 只能被 `cancelOrder` 改。
- 逾時：`tick(now)` 對每張 `PENDING` 訂單計算 `Date.parse(now) - Date.parse(at) >= 15*60*1000`；不保存「上一次 tick」。
- 事件 id：`order-${++seq}`；每個服務實例自 1 起算（單一實例內唯一且帶前綴，滿足跨服務不碰撞）。
- `getOrder` 回傳新物件：未取消 `{ status }`，已取消 `{ status, cancelReason }`。
- 輸入驗證順序：`INVALID_INPUT`（空字串／非正整數）→ `DUPLICATE_ORDER`。
