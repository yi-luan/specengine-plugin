# BENCH-LOG（T4-A-h1）

## 時間

- 開始：2026-11-01 02:35:32
- 結束：2026-11-01 02:37:52

## 假設

- 下單時 qty 必須為正整數、amount 必須為非負整數、at 必須可解析為時間；不合法回傳 `INVALID_INPUT`。
- 重複的 orderId 回傳 `DUPLICATE_ORDER`，不建立第二張訂單。
- 顧客可取消的狀態為 PENDING（處理中）與 CONFIRMED（已確認，需退款）；其餘狀態（REJECTED、FAILED、CANCELLED）取消時回傳 `INVALID_STATE`。
- 逾時判定：下單時間 + 15 分鐘（含）仍為 PENDING 就自動取消，cancelReason 為 `TIMEOUT`；14 分 59 秒時不取消。已確認（已付款）的訂單不會逾時。
- 顧客取消時 cancelReason 為 `CUSTOMER`。
- 事件 id 採「服務前綴 + 全系統共用遞增序號」（order-N、inv-N、pay-N），保證全系統唯一。
- 每個服務以 event id 去重，並以狀態判斷冪等，重複送達不會重複扣款、放回庫存或發出重複事件。
- 事件亂序：庫存與付款服務允許 OrderCancelled 先於 OrderPlaced 抵達；之後抵達的 OrderPlaced 不再保留庫存、不再扣款。付款服務在收到 StockReserved 之前不扣款，且要同時知道金額與顧客才扣款。
- 付款失敗（PaymentFailed）時庫存服務放回庫存並發出 `StockReleased`（依規格第 5 點）。
- 顧客取消時庫存服務放回庫存，但不發出 `StockReleased`（規格只指定付款失敗時發出）。
- 付款服務在顧客取消且已扣款時退款並發出 `PaymentRefunded`；尚未扣款的取消只標記為已取消，不發事件。
- 訂單服務收到 PaymentSucceeded / PaymentFailed / StockRejected 時只在 PENDING 狀態轉換，其他狀態忽略（例如已取消的訂單收到 PaymentSucceeded 時不改狀態，退款由取消流程負責）。
- 庫存的「可用數量」在保留時即扣減，確認訂單後仍保持扣減，取消或付款失敗時才放回。
- 付款餘額不足判定為 balance < amount 才失敗；餘額等於金額時可扣款。
- 未知的 customerId 餘額視為 0；未知的 sku 可用庫存視為 0。
- 測試用的事件匯流排（tests/support/bus.ts）：每個事件廣播給三個服務，服務回傳的事件排入佇列；支援整批重送（同一事件連送兩次）與反轉待送達佇列以模擬亂序。
- 測試採用 cucumber feature（tests/features/order-flow.feature）使用英文關鍵字與中文步驟文字。

## 產出檔案

- src/shop.ts（新增，產品代碼：三個服務與工廠函式、Event 型別等）
- tests/support/bus.ts（新增，記憶體事件匯流排）
- tests/support/world.ts（新增，cucumber World）
- tests/steps/order.steps.ts（新增，step definitions）
- tests/features/order-flow.feature（新增，13 個情境）
- BENCH-LOG.md（新增）

## npm test 摘要

- `13 scenarios (13 passed)`
- `101 steps (101 passed)`
- 另執行 `npm run typecheck`（tsc --noEmit）通過。

## 工具錯誤

- 無。
- 注意：node_modules 為指向專案外部的符號連結（由環境提供），本次僅使用其執行測試，未修改其內容。
