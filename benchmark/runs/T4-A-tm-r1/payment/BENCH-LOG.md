# BENCH-LOG — T4-A-tm-r1 payment

- 開始時間：2026-11-01 02:52:05
- 結束時間：2026-11-01 02:54:01

## 假設

- StockReserved 只帶 orderId，顧客與金額要從 OrderPlaced 取得；事件可能亂序，所以兩者都收到（且未取消、未扣過）時才扣款，無論哪個先到。
- 事件 id 重複送達：用已處理過的事件 id 集合去重，第二次直接回傳空陣列。
- 同一張訂單收到不同 id 的重複 StockReserved / OrderPlaced：以訂單狀態為準只扣款一次，重複的回傳空陣列（不重發 PaymentSucceeded；重送由事件匯流排負責）。
- 重複 OrderPlaced 內容若不一致：以第一次收到的為準。
- 扣款失敗（PaymentFailed）後不重試，之後再收到 StockReserved 回傳空陣列。
- 不認識的顧客視為餘額 0，getBalance 回傳 0，扣款會失敗。
- 金額必須是非負整數：0 元扣款成功（PaymentSucceeded amount 0，餘額不變）；負數或非整數金額視為扣款失敗發 PaymentFailed。
- OrderCancelled：只有「已成功扣款且尚未退款」才退款並發 PaymentRefunded；付款失敗或尚未扣款的訂單取消時不發任何事件。
- OrderCancelled 先於 StockReserved / OrderPlaced 到達：記下已取消，之後即使條件齊備也不扣款（避免扣了再退）。
- 重複的 OrderCancelled 只退款一次。
- 取消原因（顧客取消或 15 分鐘逾時）由訂單服務判斷，付款服務一律只看 OrderCancelled，不自己計時。
- StockRejected、StockReleased 與付款服務自己的三種事件一律忽略回傳空陣列。
- 事件 id 用 `pay-` 前綴加 crypto.randomUUID() 以確保全系統唯一。
- 建立服務時傳入的 balances 物件會被複製，不改動呼叫端的物件。

## 產出檔案

- src/payment.ts
- tests/features/payment.feature
- tests/steps/payment.steps.ts
- BENCH-LOG.md

## npm test

22 scenarios (22 passed), 136 steps (136 passed)。`tsc --noEmit` 對 payment 相關檔案無錯誤。

## 工具錯誤

- Write 第一次寫 src/payment.ts 被拒（需先 Read），Read 後重寫成功。
