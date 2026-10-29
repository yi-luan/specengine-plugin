# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 回傳給呼叫端的失敗原因一律採固定的全大寫 SNAKE_CASE 英文代碼，每種失敗一個代碼，顯示文字由呼叫端對應 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_Q15_失敗原因的格式.md | 2026-10-20 |
| POLICY-002 | 以起迄時間戳定義的有效期間一律含頭含尾（起 ≤ 當下 ≤ 迄），直接以時間戳比較 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_Q03_有效期間邊界.md | 2026-10-20 |
| POLICY-003 | 同一請求中重複出現同一識別項（例如同一張券）視為輸入錯誤，整筆拒絕，不自動去重 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_Q11_同一張券重複傳入.md | 2026-10-20 |
| POLICY-004 | 百分比折抵算出小數時，每一筆折抵額各自無條件捨去取整數，再加總 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_Q07_百分比折扣的小數取捨.md | 2026-10-20 |
| POLICY-005 | 折抵總額超過可折抵的金額時一律整筆拒絕並回報，不自動截斷；剛好等於可接受 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_Q08_折扣超過訂單金額.md | 2026-10-20 |
| POLICY-006 | 金額類輸入必須為正整數（> 0 且為整數），0、負數、非整數一律拒絕並回報，不自動修正 | MULTI_TENANT_COUPON | resolved/data/多租戶優惠券_Q12_訂單金額的合法範圍.md | 2026-10-20 |
