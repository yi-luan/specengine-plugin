# Data Model: 訂單狀態機

## Order

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | 訂單識別碼，由呼叫端提供 |
| `status` | `OrderStatus` | 目前狀態 |
| `amount` | `number` | 訂單金額（整數元，> 0） |
| `paidAmount` | `number` | 已付金額（整數元，0 或等於 amount） |
| `refundedAmount` | `number` | 累計退款金額（整數元，0 ≤ 值 ≤ paidAmount） |

### OrderStatus

`'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED'`，對應「已建立／已付款／已出貨／已取消／已退款」。

## 狀態轉換

| 來源狀態 | 操作 | 條件 | 結果狀態 | 金額變化 |
|----------|------|------|----------|----------|
| CREATED | pay(amount) | amount == order.amount | PAID | paidAmount = amount |
| PAID | ship | — | SHIPPED | 無 |
| CREATED | cancel | — | CANCELLED | 無 |
| PAID | cancel | — | CANCELLED | refundedAmount = paidAmount（Q1: A） |
| SHIPPED | refund(amount) | amount > 0，refundedAmount + amount ≤ paidAmount | SHIPPED；若 refundedAmount + amount == paidAmount 則為 REFUNDED | refundedAmount += amount |

其餘組合皆為非法操作，回傳失敗原因，訂單不變。

## 驗證規則

- `createOrder`：`amount` 為整數且 > 0；`id` 不做額外檢查（需求未要求）。
- `pay`：狀態必須為 CREATED；`amount` 必須等於 `order.amount`。
- `ship`：狀態必須為 PAID。
- `cancel`：狀態必須為 CREATED 或 PAID。
- `refund`：狀態必須為 SHIPPED；`amount` 為整數且 > 0；`refundedAmount + amount ≤ paidAmount`。
