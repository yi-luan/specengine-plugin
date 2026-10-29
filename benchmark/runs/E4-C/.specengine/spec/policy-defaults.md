# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 數值超過上限或超過可用餘額時一律整筆拒絕並回傳失敗原因，不自動截斷至上限、不自動折到用完 | POINTS_REDEMPTION | resolved/features/點數折抵_點數不足時的系統反應.md、resolved/features/點數折抵_超過30%上限時的系統反應.md | 2026-10-20 |
| POLICY-002 | 非法輸入（負數、非正金額、應為整數卻帶小數、NaN／Infinity 等）一律拒絕並回傳失敗原因，不自動修正、取整或容錯吞掉 | POINTS_REDEMPTION | resolved/features/點數折抵_折抵點數為負數時.md、resolved/features/點數折抵_訂單金額或餘額非法時.md、resolved/features/點數折抵_訂單金額或餘額非整數時.md | 2026-10-20 |
| POLICY-003 | 比例或百分比計算出小數時一律無條件捨去取整（對計算方保守） | POINTS_REDEMPTION | resolved/features/點數折抵_30%上限的小數取整方式.md | 2026-10-20 |
| POLICY-004 | 單一結果只能帶一個失敗原因時，依固定檢查順序回報第一個命中的錯誤（輸入合法性 → 數值格式 → 餘額 → 上限），不合併、不比嚴重度 | POINTS_REDEMPTION | resolved/features/點數折抵_多個錯誤同時發生時回報哪一個.md | 2026-10-20 |
| POLICY-005 | 失敗原因以固定英文大寫代碼回傳（例如 INVALID_POINTS），顯示文字由呼叫端對應 | POINTS_REDEMPTION | resolved/data/點數折抵_非整數點數被拒絕時的失敗原因文案.md | 2026-10-20 |
