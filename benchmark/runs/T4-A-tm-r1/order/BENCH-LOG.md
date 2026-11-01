# BENCH-LOG — T4-A-tm-r1 / 訂單服務（src/order.ts）

- 開始時間：2026-11-01 02:52:04
- 結束時間：2026-11-01 02:54:33

## 假設（需求未明說，依最佳判斷決定）

- 重複的訂單編號再次下單怎麼辦？→ 回傳 `{ ok: false }`，不發事件、不覆寫原訂單。
- 數量與金額的合法範圍？→ 數量必須是正整數（≥1），金額必須是非負整數（≥0）；否則下單失敗、不建立訂單。
- 下單／取消／tick 的時間字串格式錯誤怎麼辦？→ `Date.parse` 失敗即視為非法：下單與取消回傳 `{ ok: false }`，tick 回傳空陣列。
- 已付款（CONFIRMED）的訂單顧客能否取消？→ 可以。需求 6 說取消後付款服務要退款，表示取消可發生在付款之後；訂單服務只負責發 `OrderCancelled`，退款與放回庫存由同事的服務依該事件處理。
- 已結束（REJECTED / FAILED / CANCELLED）的訂單再取消？→ 回傳 `{ ok: false }`，不再發 `OrderCancelled`（避免重複退款／重複放回庫存）。
- 取消不存在的訂單？→ `{ ok: false }`。
- 15 分鐘逾時的邊界？→ `now - placedAt >= 15 分鐘` 即逾時（滿 15 分鐘仍 PENDING 就取消）；只有 PENDING 的訂單會被逾時取消，cancelReason 為 `TIMEOUT`。
- 逾時判定以誰的時間為準？→ 以 `tick(now)` 的 now 與下單輸入的 `at` 比較；不使用系統時鐘。tick 不假設單調遞增，單純比較時間差。
- 逾時取消後才送達的 `PaymentSucceeded`（亂序）？→ 訂單維持 CANCELLED，不改回 CONFIRMED；付款服務會收到 `OrderCancelled` 負責退款。訂單服務無法分辨「付款真的晚了」與「事件傳遞晚了」，一律以訂單目前狀態為準。
- 顧客取消後才送達的 `PaymentSucceeded`？→ 同上，維持 CANCELLED（CUSTOMER）。
- 同一事件重複送達？→ 以事件 `id` 去重，處理過的 id 直接回傳空陣列；另外狀態轉移只允許從 PENDING 出發，即使 id 不同的重複語意事件也不會改變已結束的訂單。
- 訂單服務收到 `OrderPlaced` / `StockReserved` / `StockReleased` / `PaymentRefunded` / `OrderCancelled`？→ 不需改變狀態，直接回傳空陣列（`StockReserved` 不另設中間狀態，`PENDING` 已涵蓋）。
- 收到不認識 orderId 的事件？→ 忽略，回傳空陣列，不建立訂單。
- 收到 `PaymentSucceeded` 但金額與訂單金額不符？→ 不檢查，仍視為付款成功（金額一致性屬付款服務責任）。
- 事件 `id` 如何保證全系統唯一？→ `order-` 前綴 + `crypto.randomUUID()`，前綴避免與同事服務的 id 撞名。
- `getOrder` 對不存在的訂單？→ 回傳 `undefined`；非取消狀態不帶 `cancelReason` 欄位。
- 訂單狀態一旦進入 CONFIRMED / REJECTED / FAILED / CANCELLED 是否還會變？→ 只有 CONFIRMED 可再變為 CANCELLED（顧客取消）；其餘皆為終態。

## 產出檔案

- `src/order.ts` — OrderService 實作
- `tests/features/order.feature` — 34 個情境（下單、事件推進、顧客取消、逾時、重複／亂序、事件 id 唯一）
- `tests/steps/order.steps.ts` — step definitions
- `BENCH-LOG.md`

## 測試結果

`npm test`：34 scenarios (34 passed)、185 steps (185 passed)。`npx tsc --noEmit` 無錯誤。
