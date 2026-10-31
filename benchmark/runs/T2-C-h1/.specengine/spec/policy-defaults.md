| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 數值（金額、數量）必須為正整數；非整數或非正數一律拒絕並回傳 INVALID_AMOUNT，不做截斷或進位 | ORDER_STATE_MACHINE | resolved/data/訂單狀態機_金額與編號的合法值.md | 2026-10-31 |
| POLICY-002 | 操作失敗一律回傳 ok 為 false 與英文錯誤代碼，傳入的物件不被修改；不靜默忽略 | ORDER_STATE_MACHINE | resolved/data/訂單狀態機_失敗原因的回傳形式.md | 2026-10-31 |
| POLICY-003 | 狀態不允許的操作一律拒絕（INVALID_TRANSITION），不忽略、不拋例外 | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_非法狀態操作的處理.md | 2026-10-31 |
| POLICY-004 | 超過上限的操作整筆拒絕，不截斷至上限（REFUND_EXCEEDS_PAID） | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_退款超過剩餘可退額度的反應.md | 2026-10-31 |
