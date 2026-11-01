| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 輸入不合法時一律拒絕並回報原因，不建立實體、不發事件，不自動修正數值 | ORDER_SERVICE | resolved/data/輸入合法性.md | 2026-11-01 |
| POLICY-002 | 重複的建立請求（相同識別碼）一律拒絕並回報原因，既有實體與狀態不變 | ORDER_SERVICE | resolved/data/重複訂單編號.md | 2026-11-01 |
| POLICY-003 | 操作不存在的實體時回傳失敗原因（不存在），不靜默成功 | ORDER_SERVICE | resolved/features/不存在訂單的取消.md | 2026-11-01 |
| POLICY-004 | 時間門檻判定採「大於或等於門檻即觸發」 | ORDER_SERVICE | resolved/features/逾時取消的臨界點.md | 2026-11-01 |
| POLICY-005 | 事件晚到時，若實體已進入終態則以終態為準，事件不得使其復活 | ORDER_SERVICE | resolved/features/取消後才收到付款成功.md | 2026-11-01 |
| POLICY-006 | 同一事件（相同 id）重複送達時冪等忽略，不改狀態、不發事件 | ORDER_SERVICE | resolved/features/重複事件的處理.md | 2026-11-01 |
| POLICY-007 | 終態不被後續事件覆寫；事件先後順序不影響終態 | ORDER_SERVICE | resolved/features/亂序事件的狀態覆寫.md | 2026-11-01 |
| POLICY-008 | 跨服務發出的事件 id 採 UUID v4，不依賴服務間協調 | ORDER_SERVICE | resolved/data/事件識別碼產生方式.md | 2026-11-01 |
