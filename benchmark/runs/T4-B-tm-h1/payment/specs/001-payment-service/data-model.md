# Data Model: 付款服務

## 顧客餘額

- `balances: Map<customerId: string, balance: integer>`
- 初始值來自 `createPaymentService(balances)`。
- 扣款：餘額減少訂單金額（只在狀態轉換成功時發生）。
- 退款：餘額回補訂單金額（只在狀態轉換成功時發生）。
- 不變量：餘額為整數；付款服務不會把餘額扣成負數（餘額不足時不扣款）。

## 付款紀錄

每筆訂單一筆，`orders: Map<orderId: string, PaymentRecord>`。

```text
PaymentRecord {
  orderId: string
  customerId: string | undefined   // 尚未收到 OrderPlaced 時為 undefined
  amount: integer | undefined      // 尚未收到 OrderPlaced 時為 undefined
  status: PaymentStatus
}

PaymentStatus =
  | 'AWAITING_ORDER'   // 已收到 StockReserved，等待 OrderPlaced（暫存）
  | 'UNPAID'           // 已有訂單資訊，尚未扣款（含付款失敗後的終態，見下）
  | 'CHARGED'          // 已扣款成功，尚未退款
  | 'FAILED'           // 付款失敗（餘額不足）
  | 'REFUNDED'         // 已退款
  | 'CANCELLED'        // 訂單已取消且未扣款（取消先於扣款）
```

## 狀態轉換

| 目前狀態 | 輸入事件 | 條件 | 下一狀態 | 副作用 |
|---|---|---|---|---|
| (無紀錄) | OrderPlaced | — | UNPAID | 記下 customerId、amount |
| (無紀錄) | StockReserved | — | AWAITING_ORDER | 暫存，不發事件 |
| (無紀錄) | OrderCancelled | — | CANCELLED | 不發事件 |
| AWAITING_ORDER | OrderPlaced | 餘額 ≥ 金額 | CHARGED | 扣款，發出 PaymentSucceeded |
| AWAITING_ORDER | OrderPlaced | 餘額 < 金額 | FAILED | 不扣款，發出 PaymentFailed |
| AWAITING_ORDER | OrderCancelled | — | CANCELLED | 作廢暫存，不發事件 |
| UNPAID | StockReserved | 餘額 ≥ 金額 | CHARGED | 扣款，發出 PaymentSucceeded |
| UNPAID | StockReserved | 餘額 < 金額 | FAILED | 不扣款，發出 PaymentFailed |
| UNPAID | OrderCancelled | — | CANCELLED | 不發事件 |
| CHARGED | OrderCancelled | — | REFUNDED | 退款，發出 PaymentRefunded |
| CHARGED / REFUNDED / FAILED / CANCELLED | 任何已處理過的輸入 | — | 不變 | 回傳空陣列 |
| CANCELLED | StockReserved | — | 不變 | 不扣款，不發事件（FR-014） |
| UNPAID | OrderPlaced（重複） | — | 不變 | 回傳空陣列 |
| CANCELLED | OrderPlaced | — | 不變（記下 customerId、amount，供之後的退款判斷不需要，僅保留紀錄） | 不發事件、不扣款（FR-014） |

註：`UNPAID` 狀態可收到 `OrderCancelled` 的情況是訂單已建立但尚未收到庫存保留；此時取消即終止。`FAILED` 為終態，不重試（spec 假設）。

## 與事件無關的輸入

`StockRejected`、`StockReleased`、`PaymentSucceeded`、`PaymentFailed`、`PaymentRefunded`，以及其他服務發出的任何事件：回傳空陣列，不改變狀態（FR-008）。
