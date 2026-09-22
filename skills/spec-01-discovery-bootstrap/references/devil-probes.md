# 高風險工程探測清單 (Engineering Risk Probes)

強制針對需求進行以下 5 個高風險工程維度的「極限壓力測試」，找出隱含缺失：

1. **計算精度與數值 (Math Precision & Boundaries)**：涉及比例、除法或百分比時，小數點如何取捨？（`floor`, `ceil`, `round`?）點數 (int) 與金額 (decimal) 轉換是否有精度遺失？
2. **非法狀態與冪等性 (State & Idempotency)**：同一動作短時間重複觸發（如快速連點）如何處理？在非預期狀態下（如已取消、已退款）強制發動觸發事件時的行為。
3. **臨界點與零值處理 (Threshold Boundaries)**：剛好等於上限 vs 差 1 點超過上限，系統行為是否一致？數值為 0（如折抵 0 點、訂單總額 0 元）時的防禦。凡涉及長度/數量/金額上限的盲點，MCQ 選項必須同時涵蓋「上限值是多少」與「超過上限時系統該怎麼反應」（拒絕並報錯／自動截斷或修飾至上限／忽略並警告），不可只問上限數值本身，否則會在 spec-05 實作階段才發現超界行為未定義。
4. **錯誤復原與副作用 (Side Effects & Rollback)**：主流程或第三方服務失敗時，已扣除的數據是否需要 Transaction Rollback？記錄 Audit Log 或通知失敗時，主交易是否應阻斷？
5. **資料生命週期 (Data Lifecycle & Audit)**：實體被刪除或取消時，歷史紀錄是 Hard Delete、Soft Delete 還是保留 Audit Log？
