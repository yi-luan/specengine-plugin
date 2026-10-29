# Quickstart: 驗證多租戶優惠券套用

**Feature**: 001-multi-tenant-coupons | **Date**: 2026-10-20

## 前置條件

- Node.js 24、已執行 `npm install`（devDependencies：cucumber 11、tsx、typescript）。
- 契約見 [contracts/coupon-api.md](contracts/coupon-api.md)，資料形狀見 [data-model.md](data-model.md)。

## 執行

```bash
npm test            # 跑全部 Gherkin 情境（tests/features/coupon.feature）
npm run typecheck   # tsc --noEmit，須零錯誤
```

## 預期結果

- `npm test` 輸出 `N scenarios (N passed)`、`M steps (M passed)`，exit code 0；報告寫入 `reports/cucumber.json`。
- `npm run typecheck` 無輸出、exit code 0。

## 驗證情境對照（摘要）

| 情境群 | 對應 FR | 預期 |
|--------|---------|------|
| 單張 PERCENT / FIXED 折扣、無券 | FR-002, FR-008, FR-010 | ok, 金額正確 |
| 百分比捨去（15% × 333） | FR-010 | discount 49 |
| 跨租戶 | FR-001 | TENANT_MISMATCH |
| 過期 / 未生效 / 邊界含頭含尾 | FR-003 | COUPON_EXPIRED 或 ok |
| 最低消費未達 / 剛好達標 | FR-007 | MIN_ORDER_NOT_MET 或 ok |
| 兩張不可疊加、不可疊加 + 可疊加、單張不可疊加 | FR-004 | NOT_STACKABLE 或 ok |
| 多張可疊加（PERCENT+FIXED、PERCENT+PERCENT） | FR-005, FR-010 | ok, 各以原始金額計算 |
| 折扣超額 / 剛好等於 | FR-006 | DISCOUNT_EXCEEDS_AMOUNT 或 finalAmount 0 |
| 重複券 | FR-011 | DUPLICATE_COUPON |
| orderAmount 0 / 負 / 非整數 | FR-012 | INVALID_INPUT |
| 券值不合法 | FR-016 | INVALID_COUPON |
| 多重錯誤優先序 | FR-015 | 依序第一個命中 |

## 手動煙霧測試（選用）

```bash
node --import tsx -e "import('./src/coupon.ts').then(m => console.log(m.applyCoupons({ tenantId: 'T1', orderAmount: 1000, now: '2026-06-01T00:00:00Z', coupons: [{ tenantId: 'T1', code: 'P10', type: 'PERCENT', value: 10, validFrom: '2026-01-01T00:00:00Z', validTo: '2026-12-31T23:59:59Z', stackable: true }] })))"
```

預期輸出：`{ ok: true, finalAmount: 900, discount: 100, applied: [ 'P10' ] }`
