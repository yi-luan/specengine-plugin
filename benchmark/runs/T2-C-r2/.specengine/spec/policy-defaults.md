# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 操作失敗原因一律用固定英文代碼（不用白話句子）；同一操作踩到多個錯時的檢查順序固定為：先狀態是否允許 → 再金額本身是否合法 → 最後金額比對，只回報第一個命中的代碼 | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md | 2026-10-20 |
| POLICY-002 | 數值超過上限（如退款累計超過已付金額）一律整筆拒絕並回報固定代碼，不自動截斷至上限 | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_單次退款超過剩餘可退金額的反應.md | 2026-10-20 |
| POLICY-003 | 金額類輸入為 0 或負數一律視為不合法拒絕（INVALID_AMOUNT），不視為冪等成功 | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_退款金額為零或負數.md | 2026-10-20 |
| POLICY-004 | 狀態機類模組：凡行為矩陣未明列為允許的「狀態 × 操作」組合，一律視為狀態不允許而拒絕（INVALID_TRANSITION），不預設冪等成功 | ORDER_STATE_MACHINE | resolved/features/訂單狀態機_矩陣未列的狀態與操作組合.md | 2026-10-20 |
