# 需求：會員點數折抵

1. 會員結帳時可以用點數折抵現金，1 點折抵 1 元，折抵點數必須是整數。
2. 單筆訂單的折抵金額不得超過訂單金額的 30%。
3. 折抵成功後，會員的點數餘額要扣掉這次使用的點數。
4. 折抵成功時回傳折抵後的應付金額與剩餘點數；不成功時回傳失敗原因。

## 技術介面（固定，不可更名）

在 `src/points.ts` 匯出：

```ts
export type PointsDiscountInput = { orderAmount: number; pointsBalance: number; pointsToUse: number };
export type PointsDiscountResult =
  | { ok: true; finalAmount: number; remainingPoints: number }
  | { ok: false; reason: string };
export function applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult;
```

純函式，不碰資料庫。金額與點數皆以整數元／整數點計算。
