# BENCH-LOG — T2-A-r1 訂單狀態機

- 開始時間：2026-10-20 02:45:15
- 中斷時間：約 2026-10-20 02:47（外部 API 限額，非專案問題）
- 恢復時間：2026-10-20 07:24:44
- 結束時間：2026-10-20 07:25:18

## 假設

- 「金額皆為整數元」要不要主動驗證？→ 決定：createOrder / pay / refund 的金額若非整數（Number.isInteger 為 false）一律回傳失敗，原因為「…必須為整數元」。
- 訂單編號 id 是否允許空字串？→ 決定：id 為空字串或僅空白時 createOrder 失敗，原因「訂單編號不可為空」。
- 已付款訂單取消時「退還全部已付金額」要如何反映在 Order 欄位？→ 決定：paidAmount 保留為歷史紀錄不歸零，refundedAmount 設為 paidAmount（退還全額），status 改為 CANCELLED。
- 已退款（REFUNDED）的訂單能否再退款？→ 決定：不能，refund 只接受 SHIPPED 狀態；REFUNDED 時回傳失敗（累計已達上限，無餘額可退）。
- 退款金額是否允許 0 或負數？→ 決定：不允許，refund 的 amount 必須 > 0，否則失敗「退款金額必須大於 0」。
- 付款金額非整數時先報哪個錯？→ 決定：先檢查狀態，再檢查整數，最後檢查是否等於訂單金額；所以 1000.5 回「付款金額必須為整數元」而非「必須等於訂單金額」。
- 失敗原因（reason）格式？→ 決定：繁體中文短句，狀態類錯誤帶上目前狀態的中文名稱（例如「訂單狀態為「已出貨」，只有「已付款」的訂單可以出貨」）；金額類錯誤帶上實際數字。
- 已取消（CANCELLED）訂單的 paidAmount/refundedAmount 若由 CREATED 取消？→ 決定：兩者皆維持 0。
- 測試放置方式？→ 決定：cucumber feature（zh-TW 關鍵字）放 tests/features/order.feature，steps 放 tests/steps/order.steps.ts，自訂 World 放 tests/support/world.ts；cucumber.cjs 已含 tests/features/**/*.feature 路徑，不需改設定。

## 產出檔案

- src/order.ts
- tests/features/order.feature
- tests/steps/order.steps.ts
- tests/support/world.ts
- BENCH-LOG.md

## npm test 最終結果

- 38 scenarios (38 passed)
- 210 steps (210 passed)
- tsc --noEmit 無錯誤
