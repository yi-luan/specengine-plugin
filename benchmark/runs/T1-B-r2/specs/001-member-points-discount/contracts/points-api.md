# Contract: `src/points.ts` 公開介面

**Feature**: 001-member-points-discount | **Date**: 2026-10-20

此介面由需求文件固定，**不可更名**。

```ts
export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };
export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult;
```

## 行為契約

| # | 條件（依序檢查） | 回傳 |
|---|------------------|------|
| 1 | `orderAmount` 非整數或 `<= 0`，或 `pointsBalance` 非整數或 `< 0` | `{ ok: false, reason: "INVALID_INPUT" }` |
| 2 | `pointsToUse` 非整數或 `< 0` | `{ ok: false, reason: "INVALID_POINTS" }` |
| 3 | `pointsToUse > pointsBalance` | `{ ok: false, reason: "INSUFFICIENT_POINTS" }` |
| 4 | `pointsToUse > floor(orderAmount × 30%)` | `{ ok: false, reason: "EXCEEDS_LIMIT" }` |
| 5 | 以上皆通過（含 `pointsToUse === 0`） | `{ ok: true, finalAmount: orderAmount - pointsToUse, remainingPoints: pointsBalance - pointsToUse }` |

## 範例

| 輸入 `(orderAmount, pointsBalance, pointsToUse)` | 回傳 |
|---|---|
| (1000, 500, 200) | `{ ok: true, finalAmount: 800, remainingPoints: 300 }` |
| (1000, 300, 300) | `{ ok: true, finalAmount: 700, remainingPoints: 0 }` |
| (1000, 500, 300) | `{ ok: true, finalAmount: 700, remainingPoints: 200 }` |
| (1000, 500, 0) | `{ ok: true, finalAmount: 1000, remainingPoints: 500 }` |
| (101, 100, 30) | `{ ok: true, finalAmount: 71, remainingPoints: 70 }` |
| (101, 100, 31) | `{ ok: false, reason: "EXCEEDS_LIMIT" }` |
| (1000, 1000, 301) | `{ ok: false, reason: "EXCEEDS_LIMIT" }` |
| (1000, 500, 600) | `{ ok: false, reason: "INSUFFICIENT_POINTS" }` |
| (1000, 500, 10.5) | `{ ok: false, reason: "INVALID_POINTS" }` |
| (1000, 500, -10) | `{ ok: false, reason: "INVALID_POINTS" }` |
| (0, 500, 10) | `{ ok: false, reason: "INVALID_INPUT" }` |
| (-100, 500, 10) | `{ ok: false, reason: "INVALID_INPUT" }` |
| (1000, -5, 10) | `{ ok: false, reason: "INVALID_INPUT" }` |

## 保證

- 純函式：相同輸入恆得相同輸出；不讀寫任何外部狀態。
- 不拋出例外；所有失敗以 `{ ok: false, reason }` 表達。
- 成功回傳的 `finalAmount`、`remainingPoints` 皆為整數且 `>= 0`。
