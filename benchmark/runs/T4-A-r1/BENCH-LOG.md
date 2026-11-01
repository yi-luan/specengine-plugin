# BENCH-LOG — T4-A-r1

- 開始時間：2026-11-01 02:35:30
- 結束時間：2026-11-01 02:39:38

## 產出檔案

- `src/shop.ts`：三個服務（訂單、庫存、付款）的記憶體實作，依固定介面匯出
- `src/index.ts`：改為 re-export `./shop.js`
- `tests/features/shop.feature`：34 個情境（含 Scenario Outline）
- `tests/steps/shop.steps.ts`：Step Definitions
- `tests/support/world.ts`：測試用記憶體事件匯流排（FIFO / 重複兩次 / 反序送達）

## 假設（需求未講清楚之處與我的決定）

- 15 分鐘逾時的邊界：下單時間 + 15 分鐘「整」時算逾時 → `now - placedAt >= 15min` 就取消（12:00 下單，12:15:00 tick 會取消，12:14:59 不會）。
- 哪些狀態的訂單可被顧客取消：只有 PENDING 與 CONFIRMED 可取消；REJECTED / FAILED / CANCELLED 回傳 `ok:false`（已取消再取消也回 `ok:false`，不重複發 OrderCancelled）。
- 取消時庫存服務是否發事件：需求 6 只說「放回保留的庫存」，我決定與需求 5 一致，放回時也發出 `StockReleased`；若沒有保留可放回則回傳空陣列、不發事件。
- 取消未扣款的訂單：付款服務不發 `PaymentRefunded`（沒有可退的款）。
- 訂單已取消（顧客或逾時）後才送達的 `PaymentSucceeded` / `StockRejected` / `PaymentFailed`：訂單維持 CANCELLED 不變；付款服務收到 `OrderCancelled` 時若已扣款就退款，若尚未扣款則記為結案、之後再收到 `OrderPlaced` + `StockReserved` 也不扣款。
- 庫存服務在收到 `OrderPlaced` 之前先收到 `OrderCancelled` / `PaymentFailed`（亂序）：把該訂單記為結案，之後的 `OrderPlaced` 不保留、回傳空陣列（不發 StockRejected）。
- 付款服務需要 `OrderPlaced` 的顧客與金額才能扣款，而 `StockReserved` 只有 orderId：付款服務同時記錄兩個事件是否已到，兩者齊備且未結案、未扣款時才扣款一次，不論先後順序。
- 重複送達：每個服務各自記住處理過的事件 id，重複的事件回傳空陣列（去重以事件 id 為準）。
- 已確認（CONFIRMED）訂單的保留庫存：視為已售出、持續保留，不回到可用庫存；只有取消時才放回。
- 未知 SKU：可用庫存視為 0 → `StockRejected`；`getAvailable` 對未知 SKU 回傳 0；`getBalance` 對未知顧客回傳 0。
- 下單輸入驗證：orderId / customerId / sku 不得為空字串；qty 必須是正整數；amount 必須是非負整數；at 必須可被 `Date.parse` 解析；orderId 重複回 `ok:false`。失敗的下單不建立訂單、不發事件。
- `tick(now)` 的 now 不合法時回傳空陣列；不要求時間單調遞增。
- 事件 id：以服務前綴（ord/inv/pay）+ `crypto.randomUUID()` 產生，全系統唯一。
- 建構時傳入的庫存 / 餘額若不是整數（或庫存為負）一律視為 0。
- 測試中「廣播」由測試用的 world 匯流排負責，三個服務之間不互相呼叫。

## `npm test` 摘要

- 34 scenarios (34 passed)、282 steps (282 passed)
- `npx tsc --noEmit` 無錯誤

## 工具錯誤

- 第一次 Write `src/index.ts` 因尚未 Read 被拒，Read 後重寫成功。
- 第一次跑測試：`tsc` 報 world 的 `log` 屬性與 cucumber `World.log` 衝突 → 改名為 `emitted`；另一個反序送達情境是我預期值寫錯（反序時 o4 先保留、o1 被拒），修正 feature 後全綠。
