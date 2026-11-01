# Quickstart: 限量搶購驗證

## 前置條件

- Node.js 與 `npm install` 已完成（`node_modules` 存在）。

## 執行全部驗證

```powershell
npm test
```

預期：所有 Gherkin scenarios（`tests/features/flash-sale/`）通過，報告寫入 `reports/cucumber.json`。

## 型別檢查

```powershell
npm run typecheck
```

預期：無錯誤（`src/flash.ts` 以 `strict` 模式編譯）。

## 預期結果對照

| 驗證重點 | 對應 spec |
|---------|----------|
| 開檔參數檢查與重複開檔 | FR-002 |
| 剩餘件數剛好等於可搶 / 不足拒絕 | FR-005 |
| 時段邊界（開始含、結束含不可搶） | FR-003 |
| 限購（保留中 + 已成交，釋放後歸還） | FR-006 |
| 付款成功、重複通知、到期後付款拒絕 | FR-007 |
| 到期釋放、只歸還一次、已成交不釋放 | FR-008 |
| 剩餘件數查詢 | FR-009 |
| 不超賣與併發下只有一人成功 | FR-010, FR-012 |
| 重送冪等與內容衝突 | FR-011 |
