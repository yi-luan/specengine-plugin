# Quickstart: 驗證限量搶購

**Feature**: 001-flash-sale | **Date**: 2026-11-02

## 前置

- Node.js 24、已安裝 devDependencies（`node_modules` 已就緒）。
- 不需要任何外部服務；測試使用 `tests/support/memory-store.ts` 的記憶體 Store。

## 指令

```bash
npm run typecheck   # tsc --noEmit，必須 0 錯誤
npm test            # cucumber-js，必須全部 scenarios passed、0 undefined / pending
```

`npm test` 讀取 `cucumber.cjs`：feature 檔在 `tests/features/**/*.feature`，步驟在 `tests/steps/**/*.ts`，
支援碼在 `tests/support/**/*.ts`；報告輸出到 `reports/cucumber.json`（已 gitignore）。

## 驗證場景對照

| Feature 檔 | 涵蓋 | 對應 FR |
|------------|------|---------|
| `tests/features/open-sale.feature` | 開檔成功、重複、參數不合法、兩台同時開同一編號 | FR-001～003, 018 |
| `tests/features/grab.feature` | 成功保留與到期時間、SOLD_OUT、LIMIT_EXCEEDED、NOT_STARTED／ENDED 邊界、重送冪等、失敗後重送、連點、兩台交錯、釋放後再搶 | FR-004～010, 022, 023 |
| `tests/features/pay.feature` | 成交、重複通知、到期拒付（已釋放／未釋放）、查無、結束後仍可付 | FR-011～014 |
| `tests/features/sweep.feature` | 釋放、雙伺服器只還一次、未到期不動、PAID 不動、到期時刻含 | FR-015～017 |
| `tests/features/remaining.feature` | 剩餘件數算式、查無搶購為 0、getHold 欄位與狀態 | FR-018, 019 |
| `tests/features/resilience.feature` | 搶購每一步當機後守恆、付款卡住期間被排程釋放、同一請求同時到兩台 | FR-020, 021, SC-001, 002 |

## 手動驗證（可選）

用 `node --import tsx` 的 REPL 腳本：建立 `MemoryStore` 與可調時鐘，`createFlashSale` 兩次代表兩台伺服器，
依 contracts/flash-sale-api.md 的順序呼叫 `openSale` → `grab` → `getRemaining` → `pay`／推進時鐘 → `sweep`，
觀察 `getHold` 狀態與剩餘件數變化。預期結果見 spec.md 各 Acceptance Scenarios。

## 完成判準

- `npm run typecheck` 通過。
- `npm test` 全綠，且每條 FR 至少對應一個場景（見上表）。
- `specs/001-flash-sale/tasks.md` 所有任務勾選完成。
