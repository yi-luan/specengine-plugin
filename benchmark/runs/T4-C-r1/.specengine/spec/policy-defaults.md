# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 指令失敗的 reason 一律用全大寫 SNAKE_CASE 錯誤碼（如 ORDER_NOT_FOUND、NOT_CANCELLABLE），依情況分碼，不用人類可讀句子 | ORDER_SAGA | resolved/features/ORDER_SAGA_取消訂單_拒絕時的原因文案.md | 2026-11-01 |
| POLICY-002 | 以呼叫端提供的識別字重複建立實體時拒絕並回傳 DUPLICATE_* 錯誤碼，既有實體不變、不發事件；不做冪等吞掉、不覆蓋 | ORDER_SAGA | resolved/features/ORDER_SAGA_下單_重複的訂單編號.md | 2026-11-01 |
| POLICY-003 | 指令輸入驗證：數量與金額必須為正整數、識別字不得為空字串；不合法一律回傳 INVALID_INPUT，不建立任何實體、不發事件 | ORDER_SAGA | resolved/features/ORDER_SAGA_下單_數量與金額的輸入驗證.md | 2026-11-01 |
| POLICY-004 | 時限判定採「大於等於」：經過時間剛好等於時限即視為逾時 | ORDER_SAGA | resolved/features/ORDER_SAGA_逾時_剛好15分鐘的邊界.md | 2026-11-01 |
| POLICY-005 | 事件亂序時，服務若先收到某實體的終結事件，必須記住該實體已結束；之後晚到的上游事件不再處理、回傳空陣列，不做「先處理再補償」。若先收到的是中間事件而缺少處理所需的上游資料，則暫存並等上游事件到達後再處理，不忽略 | ORDER_SAGA | resolved/features/ORDER_SAGA_亂序_終結事件先於上游事件到達.md；resolved/features/ORDER_SAGA_亂序_付款服務先收到StockReserved.md | 2026-11-01 |
| POLICY-006 | 實體進入終態後不可逆：之後任何事件都不改變其狀態，回傳空陣列 | ORDER_SAGA | resolved/features/ORDER_SAGA_終態訂單收到後續結果事件.md | 2026-11-01 |
| POLICY-007 | 重複送達的事件（相同 id）不產生第二次效果，且回傳空陣列，不重播原本的輸出 | ORDER_SAGA | resolved/features/ORDER_SAGA_重複事件_回傳值.md | 2026-11-01 |
