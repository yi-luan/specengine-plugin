# Research: 訂單服務

本功能沒有需要外部調查的未知項目。下列決策皆由 spec.md 的需求與裁示推導。

## 決策 1：狀態機採「合法來源狀態」規則

- **Decision**: 只有來自 `PENDING` 的 `PaymentSucceeded`、`StockRejected`、`PaymentFailed` 才轉換狀態；其他狀態下收到一律忽略。
- **Rationale**: 事件亂序與重複是需求明定的條件（需求第 8 點），以來源狀態作為守門條件可同時滿足冪等與亂序。
- **Alternatives considered**: 以序號或版本號排序事件（需要事件帶序號，不在固定介面內，排除）。

## 決策 2：終態與取消規則（需求方裁示）

- **Decision**: 終態為 `CANCELLED`、`REJECTED`、`FAILED`。`CANCELLED` 只由顧客取消或逾時產生。`cancelOrder` 允許來源狀態 `PENDING` 與 `CONFIRMED`；其餘回 `NOT_CANCELLABLE`。
- **Rationale**: 需求方 Q1 選 B、Q2 選 A。
- **Alternatives considered**: 允許所有非取消狀態取消（需求方未選）。

## 決策 3：事件 id 決定性格式

- **Decision**: 本服務發出的事件 id 為 `order:${orderId}:${EventType}`（例如 `order:O-1:OrderPlaced`）。
- **Rationale**: `OrderPlaced` 每筆訂單只會發一次；`OrderCancelled` 因終態只會發一次；因此該格式在全系統唯一，且重試時不會產生不同 id。
- **Alternatives considered**: 隨機 UUID（不可重現，測試不穩定）；全域遞增計數器（重建服務後會重複）。

## 決策 4：逾時判斷

- **Decision**: `tick(now)` 對每筆 `PENDING` 訂單，若 `Date.parse(now) - Date.parse(placedAt) >= 15 * 60 * 1000` 則取消，原因 `TIMEOUT`。
- **Rationale**: 需求第 7 點「15 分鐘內沒有完成付款」；spec.md 假設為「≥ 15 分鐘即逾時」。
- **Alternatives considered**: 嚴格大於（與 spec 假設不一致，排除）。

## 決策 5：拒絕的失敗原因代碼

- **Decision**: 使用字串代碼 `INVALID_INPUT`、`DUPLICATE_ORDER`、`NOT_CANCELLABLE`、`ORDER_NOT_FOUND`。
- **Rationale**: `CommandResult` 的 `reason` 為 string；`NOT_CANCELLABLE` 與 `ORDER_NOT_FOUND` 由需求方指定，其餘兩個為本服務自行定義（記入 BENCH-LOG 假設）。
