# bench-points

TypeScript + cucumber-js 專案。`npm test` 跑 cucumber（已設定 Node 24 相容的 tsx 載入）；產品代碼在 `src/`，Step Definitions 在 `tests/steps/`。

## 限量搶購（`src/flash.ts`）

```ts
import { createFlashSale, type Store } from './src/flash.js';

const sale = createFlashSale(store /* 實作 Store 介面，類 Redis */, () => new Date().toISOString());
await sale.openSale({ saleId: 's1', quantity: 10, perCustomerLimit: 2, startsAt: '2026-06-15T12:00:00Z', endsAt: '2026-06-15T13:00:00Z' });
const r = await sale.grab({ saleId: 's1', customerId: 'alice', qty: 2, requestId: 'req-1' }); // { ok: true, value: { holdId, expiresAt } }
await sale.pay(r.ok ? r.value.holdId : '');   // 金流付款成功通知（可重複）
await sale.sweep();                           // 排程：釋放到期未付款的保留（每台伺服器每分鐘各跑一次）
await sale.getRemaining('s1');                // 商品頁剩餘件數
```

每呼叫一次 `createFlashSale` 代表一台伺服器；伺服器之間只透過 `Store` 共享狀態。
失敗原因代碼與設計說明見 `specs/001-flash-sale/`（`contracts/flash-sale-api.md`、`research.md`、`data-model.md`）。

## 指令

- `npm test`：cucumber-js，feature 在 `tests/features/`，步驟在 `tests/steps/`，記憶體版 Store 與 World 在 `tests/support/`。
- `npm run typecheck`：`tsc --noEmit`。
