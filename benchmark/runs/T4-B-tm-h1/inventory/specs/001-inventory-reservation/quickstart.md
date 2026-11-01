# Quickstart: 庫存服務驗證

## 前置條件

- Node.js（與專案 `package.json` 相容）
- 在專案根目錄執行 `npm install`（若 `node_modules` 已存在可略過）

## 驗證指令

```bash
npm run typecheck   # 型別檢查，應無錯誤
npm test            # 執行 cucumber-js，應全部通過
```

## 預期結果

- `npm test` 執行 `tests/features/inventory-reservation.feature` 的所有情境，全部通過。
- `npm run typecheck` 無錯誤。
- 測試輸出的 JSON 報告寫入 `reports/cucumber.json`（已在 `.gitignore`）。

## 手動檢查情境（可選）

1. 建立 `createInventoryService({ A: 10 })`，送入 `OrderPlaced`（qty 3），應回傳 `StockReserved`，`getAvailable('A')` 為 7。
2. 對同一訂單送入 `PaymentFailed`，應回傳 `StockReleased`，`getAvailable('A')` 回到 10。
3. 再次送入相同 `id` 的 `PaymentFailed`，應回傳空陣列，庫存不變。
