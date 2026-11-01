# Quickstart: 驗證 事件驅動下單流程

## 前置條件

- Node 24（依 `README.md`）
- 已執行 `npm install`（`node_modules` 內已有 `tsx` 與 `@cucumber/cucumber`）

## 驗證指令

```powershell
npm run typecheck   # tsc --noEmit，應無錯誤
npm test            # cucumber-js，應全綠
```

## 預期結果

- 所有 `tests/features/order-flow.feature` 的情境通過。
- 涵蓋：下單成功、庫存不足、付款失敗與庫存釋放、顧客取消（處理中與已確認）、取消後的 tombstone、15 分鐘逾時（含剛好 15 分鐘）、重複與亂序事件。

## 手動試跑（可選）

於 Node REPL 或 tsx 腳本中建立三個服務，依序把事件廣播給三個服務的 `handle`。參見 `contracts/shop-api.md` 的行為約定。
