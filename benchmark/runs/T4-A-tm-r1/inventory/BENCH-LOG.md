# BENCH-LOG — T4-A-tm-r1 inventory（庫存服務）

- 開始：2026-11-01 02:52:04
- 結束：2026-11-01 02:54:29

## 假設

- OrderPlaced 重複送達怎麼處理？→ 以 orderId 判斷已處理過就回傳空陣列，不重複扣庫存、也不重發事件（下游靠匯流排的至少一次送達，不靠本服務重發）。
- PaymentFailed / OrderCancelled 比 OrderPlaced 先到時怎麼辦？→ 記住該訂單已結束（RELEASED）、回傳空陣列；之後再收到 OrderPlaced 不保留、不發事件，避免為已取消／失敗的訂單發出 StockReserved 觸發付款。
- 訂單取消（OrderCancelled）放回庫存時要不要發 StockReleased？→ 需求只在付款失敗明寫要發，但取消同樣是「放回保留的庫存」，一律發出 StockReleased，讓整合端可觀察；只有真的放回庫存時才發。
- PaymentFailed 與 OrderCancelled 都到、或同一事件重複到，會不會放回兩次？→ 不會；每張訂單只放回一次，之後的釋放事件回傳空陣列。
- 被拒絕（StockRejected）的訂單收到釋放事件？→ 沒有保留過，回傳空陣列、庫存不變。
- PaymentSucceeded 要不要「確認」保留？→ 不另做處理（回傳空陣列）。保留在付款成功後仍存在，因需求 6 允許付款後取消並退款，取消時仍需放回庫存。
- 數量不是正整數（0、負數、非整數）的 OrderPlaced？→ 視為無效，發出 StockRejected、庫存不變。
- 不存在的 SKU？→ 可用庫存視為 0；getAvailable 回傳 0，下單則 StockRejected。
- 事件 id 如何保證全系統唯一？→ `inv-` 前綴 + `crypto.randomUUID()`，前綴避免與同事服務撞名。
- 傳入的 stock 物件會不會被修改？→ 不會；建立服務時複製一份到內部 Map。
- 服務要不要處理 StockReserved / StockRejected / StockReleased / PaymentRefunded？→ 不關心，直接回傳空陣列。

## 產出檔案

- `src/inventory.ts` — InventoryService 實作
- `tests/features/inventory.feature` — 18 個情境（繁中 Gherkin）
- `tests/steps/inventory.steps.ts` — Step Definitions
- `tests/support/world.ts` — Cucumber World（模擬同事服務送來的事件）

## 測試結果

- `npm test`：18 scenarios (18 passed), 98 steps (98 passed)
- `npx tsc --noEmit`：無錯誤

## 工具錯誤

- 第一次 `tsc --noEmit` 在測試輔助函式有一個型別錯誤（以字串變數當 union 的 `type` 欄位），改為逐一 case 回傳字面量後解決。測試本身一開始就全綠。
