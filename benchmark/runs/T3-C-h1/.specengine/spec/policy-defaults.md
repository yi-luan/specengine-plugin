| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 百分比折扣以折扣前金額計算，每張各自無條件捨去為整數 | COUPON | resolved/features/優惠券_百分比折扣取整方式.md | 2026-10-31 |
| POLICY-002 | 折扣或金額超過上限一律整筆拒絕並回傳代碼，不截斷；剛好等於上限視為可以 | COUPON | resolved/features/優惠券_單張固定折扣超過訂單金額.md | 2026-10-31 |
| POLICY-003 | 有效期間含起迄時刻（起 ≤ now ≤ 迄） | COUPON | resolved/features/優惠券_期間邊界時刻.md | 2026-10-31 |
| POLICY-004 | 輸入金額為 0、負數或非整數一律以 INVALID_INPUT 整筆拒絕 | COUPON | resolved/features/優惠券_訂單金額非法輸入.md | 2026-10-31 |
| POLICY-005 | 多張券其中任一張不符合條件時整筆拒絕，不做部分套用 | COUPON | resolved/features/優惠券_任一張券不符合條件時.md | 2026-10-31 |
| POLICY-006 | 同一次呼叫中代碼重複一律以 DUPLICATE_COUPON 整筆拒絕 | COUPON | resolved/features/優惠券_重複代碼輸入.md | 2026-10-31 |
| POLICY-007 | 設定本身不合法的券（值、期間）一律以 INVALID_COUPON 整筆拒絕 | COUPON | resolved/data/優惠券_有效期間設定錯誤.md | 2026-10-31 |
