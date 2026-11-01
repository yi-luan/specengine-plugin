# 付款服務事件合約

本服務對外的唯一介面是 `src/events.ts` 定義的 `PaymentService`，事件型別同樣來自 `src/events.ts`，不得修改。

## 工廠函式

```ts
// src/payment.ts
export function createPaymentService(balances: Record<string, number>): PaymentService;
```

- `balances`：每位顧客的初始餘額（整數）。
- 回傳值實作 `PaymentService`：`handle(event): Event[]`、`getBalance(customerId): number`。

## 處理的輸入事件

| 事件 | 本服務的回應 |
|---|---|
| `OrderPlaced` | 記下顧客與金額；若有暫存的 StockReserved，依餘額判定扣款或付款失敗 |
| `StockReserved` | 依訂單狀態扣款、判定失敗、暫存或忽略（見 data-model.md） |
| `OrderCancelled` | 已扣款則退款並發出 PaymentRefunded；否則標為已取消，不發事件 |
| 其他事件 | 回傳空陣列 |

## 發出的事件

| 事件 | 欄位 | 發出時機 |
|---|---|---|
| `PaymentSucceeded` | `id`, `orderId`, `amount` | 扣款成功 |
| `PaymentFailed` | `id`, `orderId` | 餘額不足 |
| `PaymentRefunded` | `id`, `orderId`, `amount` | 已扣款的訂單被取消 |

- `id` 格式為 `pay-<序號>`，由服務實例自行產生，在實例內單調遞增。
- 只有狀態轉換成功時才發出事件；重複輸入不發出事件。

## 不變量

- 同一訂單的 PaymentSucceeded 至多一次，PaymentRefunded 至多一次。
- 餘額永不為負，且只在扣款與退款時改變。
