# Data Model: 訂單狀態機

## Entities

### Order

| 欄位 | 型別 | 說明 | 不變條件 |
|------|------|------|----------|
| `id` | `string` | 呼叫端提供的識別碼 | 不驗證、不保證唯一 |
| `status` | `OrderStatus` | 目前狀態 | 五值之一 |
| `amount` | `number` | 訂單金額（整數元） | `> 0` 且為整數；建立後不變 |
| `paidAmount` | `number` | 已付金額 | CREATED 時 0；PAID 之後 = `amount`；取消 CREATED 時維持 0 |
| `refundedAmount` | `number` | 累計退款金額 | `0 ≤ refundedAmount ≤ paidAmount`；CANCELLED(自 PAID) 時 = `paidAmount` |

### OrderStatus

`'CREATED' | 'PAID' | 'SHIPPED' | 'CANCELLED' | 'REFUNDED'`

### OrderResult

`{ ok: true; order: Order } | { ok: false; reason: string }`

`reason` 限定為下列固定代碼之一：

| 代碼 | 意義 | 產生於 |
|------|------|--------|
| `INVALID_TRANSITION` | 目前狀態不允許此操作 | pay/ship/cancel/refund |
| `INVALID_AMOUNT` | 金額非正整數 | createOrder/pay/refund |
| `AMOUNT_MISMATCH` | 付款金額 ≠ 訂單金額 | pay |
| `REFUND_EXCEEDS_PAID` | 累計退款會超過已付金額 | refund |

## State Transitions

```text
                 pay(amount == order.amount)          ship()
  [CREATED] ───────────────────────────────► [PAID] ─────────► [SHIPPED]
      │                                        │                   │
      │ cancel()                               │ cancel()          │ refund(n) 累計 < paid
      ▼                                        ▼                   │  (停留 SHIPPED)
  [CANCELLED]                              [CANCELLED]             │ refund(n) 累計 == paid
  paid=0, refunded=0                       refunded = paid         ▼
                                                              [REFUNDED]
```

| 目前狀態 | pay | ship | cancel | refund |
|----------|-----|------|--------|--------|
| CREATED | → PAID | ✗ | → CANCELLED | ✗ |
| PAID | ✗ | → SHIPPED | → CANCELLED（refunded = paid） | ✗ |
| SHIPPED | ✗ | ✗ | ✗ | → SHIPPED 或 REFUNDED |
| CANCELLED | ✗ | ✗ | ✗ | ✗ |
| REFUNDED | ✗ | ✗ | ✗ | ✗ |

✗ = 回傳 `INVALID_TRANSITION`。

## Validation Order（每個操作）

1. 狀態守衛 → `INVALID_TRANSITION`
2. 金額合法性（`Number.isInteger(n) && n > 0`）→ `INVALID_AMOUNT`
3. 金額比對 → `AMOUNT_MISMATCH`（pay）/ `REFUND_EXCEEDS_PAID`（refund）

`createOrder` 只有步驟 2；`ship` / `cancel` 只有步驟 1。

## Purity Contract

- 任何函式不得修改傳入的 `order`；成功時回傳新物件（淺拷貝 + 變更欄位）。
- 失敗時不產生新訂單，只回傳 `{ ok: false, reason }`。
