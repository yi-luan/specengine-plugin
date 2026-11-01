# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 數量超過可用上限（庫存不足、超過個人額度）一律整筆拒絕並回傳原因代碼，不自動截斷、不部分成交；剛好等於上限視為合法 | FLASH_SALE | resolved/features/限量搶購_剩餘不足時的反應.md、resolved/features/限量搶購_超過限購時的反應.md | 2026-11-02 |
| POLICY-002 | 帶請求編號的寫入操作重送時採冪等回放：前次成功則回傳相同結果且不重複產生副作用；前次失敗則視為新請求重新評估 | FLASH_SALE | resolved/features/限量搶購_同一請求重送的處理.md | 2026-11-02 |
| POLICY-003 | 外部系統（金流等）的成功通知重複送達時回傳成功、不改任何狀態（冪等） | FLASH_SALE | resolved/features/限量搶購_重複付款通知的回應.md | 2026-11-02 |
| POLICY-004 | 時間區間一律半開：開始時刻（含）生效、結束時刻（含）失效；到期時刻（含）即視為已到期 | FLASH_SALE | resolved/features/限量搶購_時間邊界的歸屬.md | 2026-11-02 |
| POLICY-005 | 伺服器故障造成的資源帳目不一致，以「不超賣／不重複發放」為優先，不做可能雙重補償的自動回收 | FLASH_SALE | resolved/features/限量搶購_伺服器當機造成的件數遺失.md | 2026-11-02 |
| POLICY-006 | 以既有識別重複建立實體一律拒絕並回傳原因代碼，不覆寫、不改任何資料 | FLASH_SALE | resolved/features/限量搶購_重複開同一搶購編號.md | 2026-11-02 |
| POLICY-007 | 輸入參數不合法（非正整數、空字串、時間順序或格式錯誤）一律拒絕並回傳 INVALID_INPUT，不改任何資料 | FLASH_SALE | resolved/features/限量搶購_開檔參數不合法的反應.md、resolved/features/限量搶購_搶購輸入不合法的反應.md | 2026-11-02 |
| POLICY-008 | 操作失敗的原因以英文大寫底線代碼表示（如 SOLD_OUT），一情境一碼，不回傳人類可讀句子 | FLASH_SALE | resolved/data/限量搶購_失敗原因文案格式.md | 2026-11-02 |
| POLICY-009 | 交易類紀錄永久保存、不自動清除，清理屬營運維護範圍 | FLASH_SALE | resolved/data/限量搶購_保留紀錄保存期限.md | 2026-11-02 |
