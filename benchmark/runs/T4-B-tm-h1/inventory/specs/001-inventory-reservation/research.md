# Research: 庫存服務

## 事件 id 產生

- Decision: 每個回傳事件的 `id` 使用 `` `inv-${randomUUID()}` ``。
- Rationale: 需求要求全系統唯一；UUID 在不同服務實例間不會碰撞，不需要共享計數器。
- Alternatives considered: 單調遞增計數器（同一實例內唯一，但跨服務可能碰撞）；時間戳（同毫秒可能碰撞）。

## 事件 id 去重（同一事件重複送達）

- Decision: 維護 `seenEventIds: Set<string>`，收到已見過的 `id` 直接回傳 `[]`，不改任何狀態。
- Rationale: 需求方明確答覆：第二次起直接忽略，不改任何狀態、不發任何事件。
- Alternatives considered: 只靠訂單狀態表做冪等（無法處理無訂單狀態的事件重複，且不符合需求方答覆）。
- 記憶體成長：事件數量在本功能範圍內有限，接受線性成長。

## 取消或付款失敗先於 OrderPlaced 抵達（亂序）

- Decision: 收到 `OrderCancelled` 或 `PaymentFailed` 而沒有該訂單紀錄時，建立一筆終態紀錄（`CANCELLED` 或 `FAILED`，不保留庫存）。之後到的 `OrderPlaced` 看到終態紀錄即直接回傳 `[]`。
- Rationale: 需求方答覆 Q1 A 只明說取消先到的情況；付款失敗先到同理會造成庫存被永久佔用，所以採用相同處理。
- Alternatives considered: 忽略沒有紀錄的取消或付款失敗（之後到的 OrderPlaced 會保留庫存且無人放回，造成庫存錯帳）。

## 同一訂單被拒絕後的重複 OrderPlaced

- Decision: 訂單的第一次處理結果（`RESERVED` 或 `REJECTED`）即為最終結果；不同 id 的重複 `OrderPlaced` 回傳 `[]`。
- Rationale: 與 FR-005 一致；避免訂單服務收到互相矛盾的 StockRejected 與 StockReserved。
- Alternatives considered: 重新嘗試保留（會讓同一訂單先拒絕後又保留，違反訂單服務的最終狀態語意）。

## 放回庫存的次數與來源

- Decision: 只有狀態為 `RESERVED` 的訂單可放回；放回後狀態轉為 `RELEASED`。`PaymentFailed` 與 `OrderCancelled` 都走同一條放回路徑，回傳 `StockReleased`。
- Rationale: FR-004b 與需求方答覆 Q2 A：同一訂單最多放回一次，沒保留過的不加庫存、不發事件。

## 數量與 SKU 驗證

- Decision: 數量必須是正整數；非整數、0 或負數回傳 `StockRejected` 並記為 `REJECTED`。SKU 不在初始庫存表時視為可用庫存 0。
- Rationale: 需求第 9 點與 FR-013；未知 SKU 的處理等同庫存不足，不需要特殊錯誤路徑。
