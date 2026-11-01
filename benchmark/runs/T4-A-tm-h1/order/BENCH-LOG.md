# BENCH-LOG（T4-A-tm-h1，訂單服務 src/order.ts）

## 時間

- 開始：2026-11-01 02:44:15
- 結束：2026-11-01 02:45:50

## 假設

- 下單欄位驗證：orderId、customerId、sku 必須為非空字串；qty 與 amount 必須為正整數（需求只說是整數，未說明 0 與負數）→ 決定：不合法即 ok:false。
- 重複的 orderId → 決定：拒絕下單（reason: DUPLICATE_ORDER）。
- 下單時間（at）無法解析為 ISO 8601 → 決定：拒絕下單（reason: INVALID_TIME）。
- 15 分鐘逾時從 OrderPlaced 的 at 起算 → 決定：經過 15 分鐘（含剛好 15 分整）仍為 PENDING 即自動取消，原因 TIMEOUT。
- 逾時只針對 PENDING 訂單 → 決定：CONFIRMED 等已完成付款的訂單不會因逾時取消。
- 顧客可取消的狀態 → 決定：只允許 PENDING 與 CONFIRMED；REJECTED、FAILED、CANCELLED 取消失敗（reason: INVALID_STATE:<狀態>），因為前二者庫存已不保留或付款已失敗，後者已取消。
- 取消 PENDING 訂單是否合法 → 決定：合法，同樣發出 OrderCancelled；庫存與付款服務各自依自己的狀態處理（未保留/未扣款時無動作）。
- 取消失敗時 → 決定：不發出任何事件，訂單狀態不變。
- StockRejected、PaymentSucceeded、PaymentFailed 的狀態轉換 → 決定：只在 PENDING 時轉換；其他狀態收到時忽略（處理亂序與重複的情況）。
- 訂單已取消後才收到 PaymentSucceeded（付款成功比取消晚到）→ 決定：訂單維持 CANCELLED，訂單服務不發任何事件；退款由付款服務依 OrderCancelled 負責，整合時需確認付款服務能處理「取消後才扣款成功」的情況。
- 重複送達 → 決定：以 event.id 去重（已處理過的 id 直接回傳空陣列），狀態轉換本身也只從 PENDING 出發，因此重複事件不改變結果。
- 收到未知 orderId 的事件 → 決定：忽略，不建立訂單。
- 訂單服務不處理的事件（StockReserved、StockReleased、PaymentRefunded、OrderPlaced 自己或他人的回送）→ 決定：忽略，回傳空陣列。
- 事件 id 格式 → 決定：`order-evt-<randomUUID>`，以隨機 UUID 保證全系統唯一。
- 非法時間傳給 tick → 決定：回傳空陣列，不改變任何訂單。
- tick 的 now 早於某筆訂單的下單時間 → 決定：不會取消（差值小於 15 分鐘）；本服務不要求 now 單調遞增。
- getOrder 的回傳格式 → 決定：只有 CANCELLED 訂單才帶 cancelReason 欄位，其餘狀態不帶該欄位。
- 沒有「付款中」或「已保留庫存」的獨立狀態 → 決定：需求的 OrderStatus 只定義五種，因此處理中統一為 PENDING。
- 測試範圍 → 決定：以 cucumber 情境（tests/features/order.feature，zh-TW）驗證，step 在 tests/steps/order.steps.ts；其他服務送來的事件由測試直接建立（StockRejected、PaymentSucceeded、PaymentFailed）。

## 產出檔案

- src/order.ts（實作 createOrderService）
- tests/features/order.feature（14 個情境）
- tests/steps/order.steps.ts（step definitions）
- BENCH-LOG.md（本檔）

## npm test 摘要

- 14 scenarios (14 passed)
- 78 steps (78 passed)
- 執行時間 0m00.018s
- `npx tsc --noEmit` 無錯誤

## 工具錯誤

- Write 寫入 src/order.ts 第一次失敗：`File has not been read yet`（未先 Read 既有檔案）。已 Read 後重寫成功，無其他錯誤。
