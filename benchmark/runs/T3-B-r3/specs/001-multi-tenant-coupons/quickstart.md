# Quickstart: 多租戶優惠券

## 前置

- Node.js 24、已 `npm install`（node_modules 已存在）。

## 驗證

```bash
npm test            # 執行 tests/features/coupon.feature，預期全部 scenario passed，0 failed/undefined
npm run typecheck   # 預期無錯誤
```

## 預期驗收重點

- 單張 PERCENT／FIXED 計算正確、PERCENT 無條件捨去（見 [contracts/apply-coupons.md](./contracts/apply-coupons.md)）。
- 8 種 reason 各至少一個情境，以及優先序情境（同時違反兩條時回較前者）。
- 有效期間邊界（now = validFrom、now = validTo 皆成功）。
- 空券清單成功、折扣 0。
