# Quickstart: 多租戶優惠券

驗證本功能端到端可運行。前置條件：已執行 `npm install`，Node.js 版本與既有專案相容。

## 1. 型別檢查

```powershell
npm run typecheck
```

預期：無錯誤結束（`tsc --noEmit`）。

## 2. 執行情境測試

```powershell
npm test
```

預期：`tests/features/coupon.feature` 中所有情境通過，無失敗情境。情境涵蓋 spec 的 User Story 1–3 與 FR-001 至 FR-013。

## 3. 手動抽查（可選）

以 `applyCoupons` 直接呼叫，對照 [contracts/apply-coupons.md](./contracts/apply-coupons.md) 的行為摘要：

- 單張 10% 券、訂單 1000 元 → `discount: 100`、`finalAmount: 900`
- 固定 800 元 + 固定 500 元（可疊加）、訂單 1000 元 → `discount: 1000`、`finalAmount: 0`
- 兩張不可疊加券一起提交 → `{ ok: false, reason: 'NOT_STACKABLE' }`

各步驟的實作細節屬於 tasks 與實作階段，不在本文件重複。
