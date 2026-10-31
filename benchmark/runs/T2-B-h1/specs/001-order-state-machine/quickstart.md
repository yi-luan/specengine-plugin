# Quickstart: 訂單狀態機

## 前置條件

- Node.js（與專案 `package.json` 相容）
- 已執行 `npm install`

## 驗證步驟

1. 型別檢查：`npm run typecheck`，預期無錯誤。
2. 行為驗收：`npm test`，預期 `tests/features/order-state-machine.feature` 的所有情境皆通過（全綠）。

## 預期結果摘要

- 建立金額 > 0 的訂單 → 狀態「已建立」。
- 已建立訂單付款金額相符 → 「已付款」；不符 → 失敗。
- 已付款出貨 → 「已出貨」；已付款取消 → 「已取消」且 refundedAmount 等於 paidAmount。
- 已出貨分次退款，累計達已付金額 → 「已退款」；超額 → 失敗。

契約見 [contracts/order-api.md](./contracts/order-api.md)，資料規則見 [data-model.md](./data-model.md)。
