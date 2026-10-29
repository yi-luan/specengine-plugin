# Quickstart: 驗證訂單狀態機

## 前置條件

- Node.js 24、已執行 `npm install`（devDependencies 已在 repo 內）。

## 執行驗收

```bash
npm test            # cucumber-js：tests/features/**/*.feature + tests/steps/**/*.ts
npm run typecheck   # tsc --noEmit
```

**期望結果**：`npm test` 輸出 `N scenarios (N passed)`、`M steps (M passed)`，無 undefined /
pending / ambiguous；`npm run typecheck` 無輸出（exit 0）。

## 手動煙霧測試（可選）

```bash
node --import tsx -e "
import { createOrder, pay, ship, refund, cancel } from './src/order.ts';
const c = createOrder('o-1', 100); console.log(c);
const p = c.ok && pay(c.order, 100); console.log(p);
const s = p && p.ok && ship(p.order); console.log(s);
const r1 = s && s.ok && refund(s.order, 30); console.log(r1);
const r2 = r1 && r1.ok && refund(r1.order, 70); console.log(r2);   // status REFUNDED
console.log(cancel(s.order));                                       // INVALID_TRANSITION
"
```

## 覆蓋對照

- 需求 1–8 ↔ feature 檔的 `Rule:` 區塊（見 [data-model.md](./data-model.md) 的轉移表與 [contracts/order-api.md](./contracts/order-api.md)）。
- 非法轉移矩陣（13 格 ✗）以 `Scenario Outline` 一次覆蓋。
- 純函式（FR-012）每個 When 步驟皆以快照比對驗證。
