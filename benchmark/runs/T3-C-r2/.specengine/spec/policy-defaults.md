# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 有效期間（起、迄）一律含頭含尾：起 ≤ 當下時間 ≤ 迄 即為有效，以時間戳比較 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_有效期間邊界是否含頭含尾.md | 2026-10-20 |
| POLICY-002 | 比例計算產生小數時，每一筆項目各自無條件捨去取整數後再加總 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_百分比折扣小數如何取捨.md | 2026-10-20 |
| POLICY-003 | 數值超過上限一律整筆拒絕並回報原因，不自動截斷；剛好等於上限視為合法 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_折扣總額超過訂單金額時的反應.md | 2026-10-20 |
| POLICY-004 | 同一個項目在單次請求中重複出現，一律整筆拒絕，不自動去重 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_同一張券傳入兩次.md | 2026-10-20 |
| POLICY-005 | 多個失敗同時發生時，依模組定義的固定檢查順序只回報第一個命中的原因；順序由輸入合法性先於業務規則 | MULTI_TENANT_COUPON | resolved/features/多租戶優惠券_多個錯誤同時發生的檢查順序.md | 2026-10-20 |
| POLICY-006 | 金額輸入須為正整數元，0、負數或非整數一律拒絕 | MULTI_TENANT_COUPON | resolved/data/多租戶優惠券_訂單金額為零負數或非整數.md | 2026-10-20 |
