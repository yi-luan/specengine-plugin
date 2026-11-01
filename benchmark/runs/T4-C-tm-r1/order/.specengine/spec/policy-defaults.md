# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 時間門檻以「≥」判定：到達門檻的那一刻即視為逾時／觸發，不等到超過 | ORDER_SERVICE | resolved/features/訂單服務_逾時15分鐘的邊界.md | 2026-11-01 |
| POLICY-002 | 實體進入最終狀態後不可逆；遲到或亂序的狀態事件一律忽略，不改狀態、不發事件、不拋錯 | ORDER_SERVICE | resolved/features/訂單服務_最終狀態後再收到狀態事件.md | 2026-11-01 |
| POLICY-003 | 對已結束的實體重複執行結束類動作（例如對已取消訂單再取消）一律拒絕並回固定原因碼，不採冪等成功 | ORDER_SERVICE | resolved/features/訂單服務_重複取消.md | 2026-11-01 |
| POLICY-004 | 以呼叫端指定的識別字建立實體時，識別字重複一律拒絕並回固定原因碼，不覆蓋、不冪等 | ORDER_SERVICE | resolved/features/訂單服務_重複訂單編號下單.md | 2026-11-01 |
| POLICY-005 | 數值與必填字串輸入不合法（非正整數、空字串）一律拒絕並回單一固定原因碼 `INVALID_INPUT`，不自動修飾、截斷或放行 | ORDER_SERVICE | resolved/features/訂單服務_數量不合法的下單.md、resolved/features/訂單服務_金額不合法的下單.md | 2026-11-01 |
| POLICY-006 | 命令失敗的 reason 為全大寫 SNAKE_CASE 原因碼（機器可讀），不是自然語言句子 | ORDER_SERVICE | resolved/features/訂單服務_已結束訂單的取消.md | 2026-11-01 |
