# Data Model: 會員點數折抵

**Feature**: 001-member-points-discount | **Date**: 2026-10-20

本功能為純函式，沒有持久化實體；以下為輸入／輸出資料形狀與驗證規則。

## PointsDiscountInput（折抵請求）

| 欄位 | 型別 | 意義 | 驗證規則 | 違規原因代碼 |
|------|------|------|----------|--------------|
| `orderAmount` | `number` | 訂單金額（整數元） | 必須為整數且 `> 0` | `INVALID_INPUT` |
| `pointsBalance` | `number` | 會員目前點數餘額（整數點） | 必須為整數且 `>= 0` | `INVALID_INPUT` |
| `pointsToUse` | `number` | 本次想使用的點數（整數點） | 必須為整數且 `>= 0`；`<= pointsBalance`；`<= floor(orderAmount × 30%)` | `INVALID_POINTS` / `INSUFFICIENT_POINTS` / `EXCEEDS_LIMIT` |

驗證順序（固定，回報第一個命中）：`INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT`。

## PointsDiscountResult（折抵結果）

判別聯集（discriminated union），以 `ok` 區分：

| 變體 | 欄位 | 計算／意義 |
|------|------|------------|
| 成功 `ok: true` | `finalAmount: number` | `orderAmount - pointsToUse`（整數元，恆 `>= 70%` 訂單金額） |
| | `remainingPoints: number` | `pointsBalance - pointsToUse`（整數點，恆 `>= 0`） |
| 失敗 `ok: false` | `reason: string` | 四個固定代碼之一：`INVALID_INPUT`、`INVALID_POINTS`、`INSUFFICIENT_POINTS`、`EXCEEDS_LIMIT` |

## 衍生值

- `discountLimit = floor(orderAmount × 3 / 10)`：整數運算，避免浮點誤差（見 research R1）。

## 狀態轉移

無。函式無狀態、無副作用；呼叫方以 `remainingPoints` 更新會員餘額（FR-009）。
