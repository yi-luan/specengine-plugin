# BENCH-LOG：T2-A-r2 訂單狀態機

## 時間

- 開始時間：2026-10-20 02:45:15
- 中斷：約 02:47（外部 API 限額，非專案問題）
- 恢復時間：2026-10-20 07:24:45
- 結束時間：2026-10-20 07:25:25

## 假設

- 「金額皆為整數元」是否要在函式內驗證？→ 要。createOrder / pay / refund 收到非整數（含小數、NaN、Infinity、非 number）一律回傳失敗，原因含「整數」。
- 訂單編號 id 可否為空字串或全空白？→ 不可。createOrder 收到空字串／全空白／非字串回傳失敗「訂單編號不可為空」。
- 付款金額不等於訂單金額時，是先檢查狀態還是先檢查金額？→ 先檢查狀態（非 CREATED 直接失敗），再檢查金額是否為整數，最後比對是否等於訂單金額。
- 已付款訂單取消時「退還全部已付金額」要怎麼呈現在 Order 上？→ 保留 paidAmount 不變，將 refundedAmount 設為 paidAmount，狀態為 CANCELLED（不是 REFUNDED，因為需求第 7 條的 REFUNDED 只針對出貨後退款流程）。
- 已建立（未付款）訂單取消時的金額欄位？→ paidAmount 與 refundedAmount 皆維持 0。
- 退款只能在哪個狀態？→ 只有 SHIPPED 可以退款；REFUNDED（已退滿）、CANCELLED、PAID、CREATED 一律失敗，原因為狀態不允許（狀態檢查先於金額檢查）。
- 單次退款金額可否為 0 或負數？→ 不可，回傳失敗「退款金額必須大於 0」。
- 部分退款後狀態？→ 累計未達已付金額時維持 SHIPPED，剛好等於已付金額時變為 REFUNDED。
- 失敗原因（reason）的格式？→ 以繁體中文白話描述，並在金額類錯誤中附上相關數字（如訂單金額、已付金額、已退款、本次申請）。
- 成功時回傳的新 order 是淺拷貝（spread）還是深拷貝？→ Order 所有欄位皆為基本型別，用 spread 建立新物件即可；不修改傳入 order，測試有驗證傳入物件未被改動且回傳為不同參考。
- src/index.ts 要不要改？→ 改為 `export * from './order.js'` 當作入口匯出，不影響需求指定的 `src/order.ts` 介面。

## 產出檔案

- src/order.ts（產品碼，需求指定介面）
- src/index.ts（改為 re-export order.ts）
- tests/features/order.feature（zh-TW Gherkin，37 個 scenario）
- tests/steps/order.steps.ts（step definitions）
- BENCH-LOG.md

## 測試結果

- `npm test`：37 scenarios (37 passed)、167 steps (167 passed)
- `npx tsc --noEmit`：通過

## 遇到的工具錯誤

- 第一次用 Bash heredoc 一次寫入四個檔案時，Git Bash 回報 `unexpected EOF while looking for matching ''`，整條指令未執行（沒有任何檔案落地）。改用 Write 工具逐檔寫入後正常。
- 任務中途因外部 API 限額中斷（約 02:47），於 07:24:45 恢復後從中斷處（寫完檔案、尚未跑測試）繼續。
