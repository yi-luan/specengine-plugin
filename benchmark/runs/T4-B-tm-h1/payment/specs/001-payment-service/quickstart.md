# Quickstart: 付款服務

## 前置條件

- Node.js（與專案 package-lock.json 相容）
- 已執行 `npm install`（node_modules 已存在時可略過）

## 驗證步驟

1. 型別檢查：

   ```text
   npm run typecheck
   ```

   預期：無錯誤輸出。

2. 行為測試（cucumber-js）：

   ```text
   npm test
   ```

   預期：`tests/features/payment.feature` 的所有情境通過，無 undefined 或 pending 步驟。

## 預期結果對照

| 情境 | 預期 |
|---|---|
| 庫存已保留且餘額足夠 | 餘額減少，發出 PaymentSucceeded |
| 庫存已保留且餘額不足 | 餘額不變，發出 PaymentFailed |
| 已扣款的訂單被取消 | 餘額回補，發出 PaymentRefunded |
| 未扣款的訂單被取消 | 無事件、餘額不變 |
| 重複的 StockReserved 或 OrderCancelled | 餘額與事件只變化一次 |
| StockReserved 先於 OrderPlaced | 暫存，OrderPlaced 到達後才判定 |
| 取消後才到的 StockReserved | 不扣款、無事件 |

詳細的事件合約見 [contracts/payment-events.md](./contracts/payment-events.md)，狀態與轉換見 [data-model.md](./data-model.md)。
