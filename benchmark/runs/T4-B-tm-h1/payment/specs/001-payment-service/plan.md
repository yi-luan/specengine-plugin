# Implementation Plan: 付款服務（事件驅動下單流程）

**Branch**: `001-payment-service` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-payment-service/spec.md`

## Summary

實作 `src/payment.ts` 匯出的 `createPaymentService(balances)`，回傳符合 `PaymentService` 介面（`src/events.ts`）的記憶體內服務。服務只保存自己的狀態：顧客餘額與每筆訂單的付款紀錄。以 cucumber-js 撰寫 feature 與 Step Definitions 驗證 spec 的 User Story 與 Edge Cases；測試自行注入 `OrderPlaced`、`StockReserved`、`OrderCancelled` 等事件，不依賴其他服務。

關鍵設計決定（對應 spec 的 Clarifications）：
- `StockReserved` 先於 `OrderPlaced` 抵達：暫存（付款紀錄狀態為「等待訂單資訊」），`OrderPlaced` 到達時再判定扣款或付款失敗；暫存期間若已取消則作廢。
- 取消後才到的 `StockReserved`：不扣款、不發事件（付款紀錄狀態為「已取消」）。
- 冪等：每筆訂單的扣款與退款各由狀態機保證最多一次；重複事件直接回傳空陣列。

## Technical Context

**Language/Version**: TypeScript 5.x，target ES2022，module NodeNext（見 tsconfig.json）

**Primary Dependencies**: 無執行期相依套件；測試使用 @cucumber/cucumber 與 tsx（已在 package.json）

**Storage**: 無；全部在記憶體中（spec 的假設與憲法 原則 IV）

**Testing**: cucumber-js，`npm test`；型別檢查 `npm run typecheck`

**Target Platform**: Node.js（開發與測試環境）

**Project Type**: library（單一服務模組，由整合人員接上事件匯流排）

**Performance Goals**: 無特別目標；每個事件為 O(1) 的 Map 操作

**Constraints**: 不讀寫 `src/events.ts`、`src/shop.ts`、`src/order.ts`、`src/inventory.ts`；不得依賴其他服務狀態；金額與餘額為整數

**Scale/Scope**: 單一付款服務；測試規模為數十個情境

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- 原則 I（TypeScript 強型別）：產品碼與測試皆為 TypeScript，strict 模式；公開函式標註型別。PASS
- 原則 II（產品碼與測試分離）：產品碼於 `src/payment.ts`，測試於 `tests/`。PASS
- 原則 III（Cucumber 行為驗證）：feature 先寫、step 先紅、再實作、再綠。PASS（tasks 階段排序）
- 原則 IV（單一入口全綠測試）：`npm test` 為唯一入口；無外部依賴。PASS
- 原則 V（服務狀態封閉）：服務只持有自身 Map；對其他服務只透過事件。PASS
- Technology Stack：符合 cucumber-js + tsx + TypeScript。PASS

Gate 結果：無違反，Complexity Tracking 不需填寫。

## Project Structure

### Documentation (this feature)

```text
specs/001-payment-service/
├── plan.md              # 本檔
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/
│   └── payment-events.md  # Phase 1 輸出：事件合約
├── checklists/
│   └── requirements.md
└── spec.md
```

tasks.md 由 `/speckit-tasks` 產生，不在本階段建立。

### Source Code (repository root)

```text
src/
└── payment.ts           # 唯一產品碼變更：createPaymentService

tests/
├── features/
│   └── payment.feature  # 由 spec 的 User Story 與 Edge Cases 形式化
├── steps/
│   └── payment.steps.ts # Step Definitions
└── support/
    └── world.ts         # 每個情境的付款服務實例與事件輸入
```

**Structure Decision**: 單一模組 + cucumber 測試。產品碼只有 `src/payment.ts`；測試放在 `tests/` 下以符合 `cucumber.cjs` 的 paths 與 import 設定（`tests/steps/**/*.ts`、`tests/support/**/*.ts`，feature 路徑 `tests/features/**/*.feature`）。

## Complexity Tracking

> Constitution Check 無違反，無需填寫。
