# BENCH-LOG（T4-A-tm-h1 付款服務）

- 開始時間：2026-11-01 02:44:14
- 結束時間：2026-11-01 02:45:38

## 假設

- 付款服務只靠廣播事件得知訂單的顧客與金額：收到 OrderPlaced 才記錄 customerId 與 amount，之後不再覆寫。
- StockReserved 早於 OrderPlaced 到達時：先記下已保留，等 OrderPlaced 到齊才扣款（不因缺資訊而丟棄）。
- OrderPlaced 與 StockReserved 都到齊後才扣款；扣款後 balance >= amount 則成功，否則發出 PaymentFailed，餘額不變。
- 同一張訂單只做一次扣款決定（成功或失敗），之後重複的 StockReserved（不論事件 id 是否相同）不再扣款。
- 同一事件 id 重複送達時直接忽略（回傳空陣列）。
- 訂單在扣款前已收到 OrderCancelled（含取消先於下單到達）：之後到達的 StockReserved 不扣款，也不發任何事件。
- 已扣款的訂單收到 OrderCancelled：退還 amount 給顧客並發出 PaymentRefunded(orderId, amount)；只退一次，重複取消不再退款。
- 付款失敗（PaymentFailed）或尚未扣款的訂單被取消：不退款、不發任何事件。
- 顧客不存在於初始 balances 時，餘額視為 0；扣款一律因餘額不足而失敗。
- 初始 balances 會被複製一份，服務內部不修改呼叫端傳入的物件。
- 付款服務自行產生的事件 id 使用 `payment-` 前綴加 randomUUID，確保與其他服務不衝突。
- 金額與數量假設為整數且由上游保證合法，付款服務不另做金額驗證（不檢查負數或非整數）。
- 付款服務不處理 StockRejected、StockReleased、PaymentFailed 等事件，直接回傳空陣列。
- 在測試中以 Step Definitions 自行模擬其他服務送來的事件（OrderPlaced、StockReserved、OrderCancelled），不依賴 order.ts 與 inventory.ts。

## 產出檔案

- src/payment.ts（實作 createPaymentService）
- tests/features/payment.feature（11 個場景）
- tests/steps/payment.steps.ts（Step Definitions 與 Before 重置）

## npm test 摘要

- 11 scenarios (11 passed)
- 70 steps (70 passed)
- `npx tsc --noEmit` 無錯誤

## 工具錯誤

- Write 工具第一次寫入 src/payment.ts 時因未先 Read 而失敗，已 Read 後重寫成功。除此之外無其他工具錯誤。
