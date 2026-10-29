# Quickstart: 會員點數折抵 驗證指南

**Feature**: 001-member-points-discount | **Date**: 2026-10-20

## 前置條件

- Node.js 24（專案以 `node --import tsx` 載入 TypeScript）
- 已安裝依賴：`npm install`（專案已含 `node_modules/`）

## 執行驗收測試

```bash
npm test
```

- 會依 `cucumber.cjs` 執行 `tests/features/**/*.feature`，載入 `tests/steps/**/*.ts`。
- 期望結果：所有 scenario 通過（`N scenarios (N passed)`、`M steps (M passed)`），
  無 undefined / pending step，結束碼 0。
- 測試報告同時輸出到 `reports/cucumber.json`。

## 型別檢查

```bash
npm run typecheck
```

期望結果：無錯誤輸出，結束碼 0。

## 手動驗證（可選）

```bash
node --import tsx -e "import('./src/points.ts').then(m => console.log(m.applyPointsDiscount({ orderAmount: 1000, pointsBalance: 500, pointsToUse: 200 })))"
```

期望輸出：`{ ok: true, finalAmount: 800, remainingPoints: 300 }`。
其餘對照案例見 [contracts/points-api.md](./contracts/points-api.md)。

## 驗證情境對照

| 情境 | 對應 | 預期 |
|------|------|------|
| 正常折抵 / 用完餘額 / 剛好 30% | US1 | `ok: true`，金額與點數依契約 |
| 超過 30% / 101 元取整 | US2 | `EXCEEDS_LIMIT`；30 點成功、31 點失敗 |
| 餘額不足 / 非整數 / 負數 / 0 點 / 非法金額或餘額 | US3 | 依契約代碼；0 點成功 |
| 多重違規順序 | Edge | 回報順序第一個命中 |
