# Data Model: 事件驅動下單流程

每個服務只持有下列自己的狀態。彼此不可直接讀取。

## 訂單服務（OrderService）

**Order**
- `orderId: string`（唯一鍵）
- `customerId: string`
- `sku: string`
- `qty: number`（整數）
- `amount: number`（整數）
- `at: string`（ISO 8601，下單時間，逾時計算起點）
- `status: OrderStatus`（`PENDING | CONFIRMED | REJECTED | FAILED | CANCELLED`）
- `cancelReason?: 'CUSTOMER' | 'TIMEOUT'`（僅 `CANCELLED` 時有值）

**狀態轉換**

| 來源 | 觸發 | 目標 | 發出事件 |
|------|------|------|---------|
| — | `placeOrder`（orderId 未存在） | `PENDING` | `OrderPlaced` |
| `PENDING` | `StockRejected` | `REJECTED` | — |
| `PENDING` | `PaymentSucceeded` | `CONFIRMED` | — |
| `PENDING` | `PaymentFailed` | `FAILED` | — |
| `PENDING` / `CONFIRMED` | `cancelOrder` | `CANCELLED`（`CUSTOMER`） | `OrderCancelled` |
| `PENDING` | `tick(now)` 且已滿 15 分鐘 | `CANCELLED`（`TIMEOUT`） | `OrderCancelled` |
| 其他組合 | — | 不變 | — |

**Idempotency state**: `seenEventIds: Set<string>`

## 庫存服務（InventoryService）

**Stock（依 SKU）**
- `available: Map<sku, number>`（整數，可供保留數量；初始值來自 `createInventoryService(stock)`）

**Reservation（依 orderId）**
- `reservations: Map<orderId, { sku: string; qty: number }>`

**Tombstone**
- `cancelledOrders: Set<orderId>`

**Idempotency state**: `seenEventIds: Set<string>`，`ownSeq: number`

**行為**

| 收到事件 | 條件 | 動作 | 發出事件 |
|---------|------|------|---------|
| `OrderPlaced` | orderId 在 tombstone 中 | 忽略 | — |
| `OrderPlaced` | `available[sku] >= qty` 且尚未保留 | 扣減 available、記錄 reservation | `StockReserved` |
| `OrderPlaced` | `available[sku] < qty` | 不變 | `StockRejected` |
| `PaymentFailed` | 有 reservation | 放回數量、刪除 reservation | `StockReleased` |
| `PaymentFailed` | 無 reservation | 忽略 | — |
| `OrderCancelled` | 有 reservation | 放回數量、刪除 reservation | — |
| `OrderCancelled` | — | 加入 tombstone | — |

## 付款服務（PaymentService）

**Balance（依 customerId）**
- `balances: Map<customerId, number>`（整數，初始值來自 `createPaymentService(balances)`）

**Charge（依 orderId）**
- `charges: Map<orderId, { customerId: string; amount: number }>`

**Tombstone**
- `cancelledOrders: Set<orderId>`

**Order context**
- `orderInfo: Map<orderId, { customerId: string; amount: number }>`（由 `OrderPlaced` 寫入；`StockReserved` 只帶 `orderId`，扣款所需的顧客與金額必須由此取得）

**Idempotency state**: `seenEventIds: Set<string>`，`ownSeq: number`

**行為**

| 收到事件 | 條件 | 動作 | 發出事件 |
|---------|------|------|---------|
| `OrderPlaced` | — | 記錄 `orderInfo[orderId]` | — |
| `StockReserved` | orderId 在 tombstone 中 | 忽略（Q3） | — |
| `StockReserved` | 無 orderInfo | 忽略 | — |
| `StockReserved` | 餘額 `>=` 金額 | 扣款、記錄 charge | `PaymentSucceeded` |
| `StockReserved` | 餘額 `<` 金額 | 不變 | `PaymentFailed` |
| `OrderCancelled` | 有 charge | 退款、刪除 charge | `PaymentRefunded` |
| `OrderCancelled` | 無 charge | 不退款 | — |
| `OrderCancelled` | — | 加入 tombstone | — |

> 金額來源：`StockReserved` 不攜帶金額與顧客。付款服務依 `OrderPlaced` 寫入的 `orderInfo` 取得顧客與金額（`OrderPlaced` 會廣播給三個服務，見規格的「每個事件都會廣播給三個服務的 handle」）。

## 事件型別

見 `contracts/shop-api.md`。事件 `id` 由產生該事件的服務負責，格式為 `<service>-<seq>`。
