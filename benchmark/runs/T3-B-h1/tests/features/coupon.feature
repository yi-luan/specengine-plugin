# language: zh-TW
功能: 多租戶優惠券

  背景:
    假設 現在時間為 "2026-06-01T00:00:00Z"
    並且 訂單租戶為 "A"
    並且 訂單金額為 1000

  # ---- User Story 1：單張優惠券結帳套用（FR-001 至 FR-003、FR-007、FR-008、FR-010）----

  場景: 百分比券以折扣前金額計算
    假設 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | SAVE10 | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 100
    並且 折扣後金額為 900
    並且 套用代碼依序為 "SAVE10"

  場景: 固定金額券扣除固定金額
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | OFF300 | FIXED | 300 | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 300
    並且 折扣後金額為 700
    並且 套用代碼依序為 "OFF300"

  場景: 已過期的優惠券拒絕套用
    假設 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | OLD10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-05-31T23:59:59Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "COUPON_EXPIRED"

  場景: 尚未生效的優惠券拒絕套用
    假設 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | LATER10 | PERCENT | 10   | 2026-07-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "COUPON_EXPIRED"

  場景: 有效期間起迄時刻皆包含在內
    假設 現在時間為 "2026-06-01T00:00:00Z"
    並且 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | EDGE | FIXED | 100   | 2026-06-01T00:00:00Z | 2026-06-01T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 100

  場景: 未達最低消費拒絕套用
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | MIN1K | FIXED | 100  | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       | 1001           |
    當 執行結帳
    那麼 結果為失敗，原因為 "MIN_ORDER_NOT_MET"

  場景: 最低消費恰等於訂單金額時可以使用
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | MIN1K | FIXED | 300  | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       | 1000           |
    當 執行結帳
    那麼 結果為成功
    並且 折扣後金額為 700

  場景: 優惠券不可用於其他租戶的訂單
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | B      | BONLY | PERCENT | 10   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "TENANT_MISMATCH"

  場景: 沒有提交任何優惠券時為無折扣成功
    假設 沒有提交任何優惠券
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 0
    並且 折扣後金額為 1000
    並且 套用代碼依序為 ""

  # ---- User Story 2：多張優惠券合併計算（FR-004、FR-005、FR-010、FR-013）----

  場景: 可疊加的多張券合併計算
    假設 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | SAVE10 | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
      | A      | OFF100 | FIXED   | 100   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 200
    並且 折扣後金額為 800
    並且 套用代碼依序為 "SAVE10,OFF100"

  場景: 單張不可疊加券可以單獨使用
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | ONLY | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | no        |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 100

  場景: 兩張不可疊加券一起使用整筆拒絕
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | NS1  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | no        |                |
      | A      | NS2  | FIXED   | 100   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | no        |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "NOT_STACKABLE"

  場景: 不可疊加券與可疊加券混用整筆拒絕
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | NS1  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | no        |                |
      | A      | S1   | FIXED   | 100   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "NOT_STACKABLE"

  場景: 同一張券重複提交整筆拒絕
    假設 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | SAVE10 | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
      | A      | SAVE10 | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "DUPLICATE_COUPON"

  場景: 多張券任一失敗時整筆拒絕並回傳第一張失敗券的原因
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | OLD  | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-05-31T23:59:59Z | yes       |                |
      | A      | MIN  | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       | 5000           |
    當 執行結帳
    那麼 結果為失敗，原因為 "COUPON_EXPIRED"

  場景: 套用代碼依傳入順序列出
    假設 提交以下優惠券:
      | tenant | code   | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | OFF100 | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
      | A      | SAVE10 | PERCENT | 10  | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 套用代碼依序為 "OFF100,SAVE10"

  場景: 多張固定金額券合計超過訂單金額時折扣總額以訂單金額為上限
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | A800 | FIXED | 800   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
      | A      | B500 | FIXED | 500   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 1000
    並且 折扣後金額為 0
    並且 套用代碼依序為 "A800,B500"

  # ---- User Story 3：固定金額與金額規則（FR-006、FR-012；Clarifications Q3）----

  場景: 固定金額大於訂單金額時折扣後金額不為負
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | BIG  | FIXED | 1500  | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 1000
    並且 折扣後金額為 0

  場景: 百分比折扣的小數結果無條件捨去為整數元
    假設 訂單金額為 999
    並且 提交以下優惠券:
      | tenant | code   | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | SAVE10 | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為成功
    並且 折扣總額為 99
    並且 折扣後金額為 900

  場景: 百分比值為 0 視為無效券
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | ZERO | PERCENT | 0     | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "INVALID_COUPON"

  場景: 百分比值超過 100 視為無效券
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | OVER | PERCENT | 101   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "INVALID_COUPON"

  場景: 百分比值非整數視為無效券
    假設 提交以下優惠券:
      | tenant | code  | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | FRAC  | PERCENT | 10.5  | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "INVALID_COUPON"

  場景: 固定金額為 0 視為無效券
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | F0   | FIXED | 0     | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "INVALID_COUPON"

  場景: 固定金額為負數視為無效券
    假設 提交以下優惠券:
      | tenant | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | FNEG | FIXED | -50   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "INVALID_COUPON"

  場景: 同一張券的兩次重複提交即使券值不合法也先回傳重複的原因
    假設 提交以下優惠券:
      | tenant | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | A      | DUP  | PERCENT | 0     | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
      | A      | DUP  | PERCENT | 0     | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |                |
    當 執行結帳
    那麼 結果為失敗，原因為 "DUPLICATE_COUPON"
