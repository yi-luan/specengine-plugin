# Quickstart: 驗證訂單服務

## 前置

- Node.js 24、依賴已安裝（`node_modules` 連結至 benchmark base）。
- 只需 `src/order.ts` 與 `tests/**`；庫存／付款服務維持空殼。

## 指令

```bash
npm run typecheck   # tsc --noEmit，須無錯誤
npm test            # cucumber-js，跑 tests/features/order-service.feature
```

## 預期結果

- `npm test` 輸出 `N scenarios (N passed)`、`M steps (M passed)`，無 undefined／pending／failed。
- 型別檢查無錯誤。
- `git status` 只顯示 `src/order.ts`、`tests/**`、`specs/**`、`.specify/**`、`BENCH-LOG.md` 的變更。

## 情境對照

| spec 情境 | feature 檔 Rule |
|-----------|-----------------|
| US1（下單與狀態推進） | Rule: 顧客下單並依結果推進狀態 |
| US2（顧客取消） | Rule: 顧客取消訂單 |
| US3（15 分鐘逾時） | Rule: 15 分鐘未完成付款自動取消 |
| US4（重複與亂序） | Rule: 事件重複與亂序送達 |

細節見 [contracts/order-service.md](contracts/order-service.md) 與 [data-model.md](data-model.md)。
