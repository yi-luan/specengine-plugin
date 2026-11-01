# bench-points

TypeScript + cucumber-js 專案。`npm test` 跑 cucumber（已設定 Node 24 相容的 tsx 載入）；產品代碼在 `src/`，Step Definitions 在 `tests/steps/`。

事件驅動下單流程：公開介面在 `src/shop.ts`（訂單／庫存／付款三個服務分別在 `src/order-service.ts`、`src/inventory-service.ts`、`src/payment-service.ts`）；驗收情境在 `tests/features/*.feature`，規格與設計文件在 `specs/001-event-driven-order-flow/`。
