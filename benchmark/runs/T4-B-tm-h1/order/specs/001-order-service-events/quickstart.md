# Quickstart: 訂單服務驗證

## 前置條件

- Node.js 與已安裝的 `node_modules`（`npm install` 已完成）。

## 執行

```sh
npm test            # 執行全部 Gherkin 特性（含 tests/features/order-service.feature）
npm run typecheck   # TypeScript 型別檢查
```

## 預期結果

- `npm test` 全綠，本功能的每個 Scenario 皆通過。
- `npm run typecheck` 無錯誤。

## 手動驗證情境（可選）

```ts
import { createOrderService } from './src/order.js';
const s = createOrderService();
s.placeOrder({ orderId: 'O-1', customerId: 'C-1', sku: 'A', qty: 1, amount: 100, at: '2026-06-15T12:00:00Z' });
// 預期：getOrder('O-1').status === 'PENDING'
s.tick('2026-06-15T12:15:00Z');
// 預期：getOrder('O-1') 為 { status: 'CANCELLED', cancelReason: 'TIMEOUT' }
```

細節見 [spec.md](./spec.md) 與 [contracts/order-service.md](./contracts/order-service.md)。
