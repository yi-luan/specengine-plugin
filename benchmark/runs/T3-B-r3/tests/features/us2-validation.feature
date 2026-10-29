Feature: US2 使用條件檢查與失敗原因
  任一張券不合格就整筆拒絕（all-or-nothing），並依固定優先序回報第一個命中的原因：
  INVALID_INPUT → INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED
  → MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT

  Rule: INVALID_INPUT — 請求本身不合法

    Scenario Outline: 訂單金額為 0、負數或非整數時拒絕
      Given 訂單金額的原始值為 "<amount>"
      And 結帳帶入以下優惠券:
        | code | type  | value |
        | F10  | FIXED | 10    |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

      Examples:
        | amount  |
        | 0       |
        | -100    |
        | 100.5   |
        | null    |

    Scenario: 訂單金額為字串時拒絕
      Given 訂單金額的原始值為 "\"100\""
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: 訂單金額為 0 且沒帶券仍拒絕
      Given 租戶 "T1" 的訂單金額為 0 元
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: 租戶為空字串時拒絕
      Given 租戶的原始值為 "\"\""
      And 訂單金額的原始值為 "1000"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: 租戶不是字串時拒絕
      Given 租戶的原始值為 "123"
      And 訂單金額的原始值為 "1000"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: 結帳時間無法解析時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳時間為 "not-a-date"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: 優惠券清單不是陣列時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 優惠券清單的原始值為 "null"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

  Rule: INVALID_COUPON — 券本身不合法

    Scenario Outline: 券值不合法時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | code | type   | value   |
        | BAD  | <type> | <value> |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_COUPON"

      Examples:
        | type    | value |
        | PERCENT | 0     |
        | PERCENT | 101   |
        | PERCENT | -5    |
        | PERCENT | 10.5  |
        | FIXED   | 0     |
        | FIXED   | -1    |
        | FIXED   | 9.9   |
        | FIXED   | abc   |
        | BOGUS   | 10    |

    Scenario Outline: 券的其他欄位不合法時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | code   | type  | value | validFrom   | validTo   | stackable   | minOrderAmount |
        | <code> | FIXED | 10    | <validFrom> | <validTo> | <stackable> | <min>          |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_COUPON"

      Examples:
        | code | validFrom            | validTo              | stackable | min  |
        |      | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | true      |      |
        | C1   | garbage              | 2026-12-31T00:00:00Z | true      |      |
        | C2   | 2026-01-01T00:00:00Z | garbage              | true      |      |
        | C3   | 2026-12-31T00:00:00Z | 2026-01-01T00:00:00Z | true      |      |
        | C4   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | yes       |      |
        | C5   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | true      | -1   |
        | C6   | 2026-01-01T00:00:00Z | 2026-12-31T00:00:00Z | true      | 99.5 |

    Scenario: 券的租戶不是字串時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 優惠券清單的原始值為 "[{\"tenantId\":1,\"code\":\"X\",\"type\":\"FIXED\",\"value\":10,\"validFrom\":\"2026-01-01T00:00:00Z\",\"validTo\":\"2026-12-31T00:00:00Z\",\"stackable\":true}]"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_COUPON"

    Scenario: 優惠券清單中有非物件元素時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 優惠券清單的原始值為 "[42]"
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_COUPON"

  Rule: TENANT_MISMATCH — 券只能用在同租戶訂單

    Scenario: 跨租戶的券被拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | tenantId | code | type  | value |
        | T2       | F10  | FIXED | 10    |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "TENANT_MISMATCH"

    Scenario: 一張合格加一張跨租戶時整筆拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | tenantId | code | type    | value | stackable |
        | T1       | OK   | PERCENT | 10    | true      |
        | T2       | XT   | FIXED   | 10    | true      |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "TENANT_MISMATCH"

  Rule: DUPLICATE_COUPON — 同一請求不得重複傳入同一代碼

    Scenario: 同一代碼傳入兩次時拒絕
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | code | type    | value | stackable |
        | S10  | PERCENT | 10    | true      |
        | S10  | PERCENT | 10    | true      |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "DUPLICATE_COUPON"

  Rule: COUPON_EXPIRED — 只能在有效期間內使用（含頭含尾）

    Scenario Outline: 有效期間判斷
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳時間為 "<now>"
      And 結帳帶入以下優惠券:
        | code | type  | value | validFrom            | validTo              |
        | JAN  | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-01-31T23:59:59Z |
      When 結帳套用優惠券
      Then <outcome>

      Examples:
        | now                       | outcome                                              |
        | 2026-02-01T00:00:00Z      | 套用失敗，原因為 "COUPON_EXPIRED"                     |
        | 2025-12-31T23:59:59Z      | 套用失敗，原因為 "COUPON_EXPIRED"                     |
        | 2026-01-01T00:00:00Z      | 套用成功，折扣後金額 900、折扣 100、套用代碼 "JAN"     |
        | 2026-01-31T23:59:59Z      | 套用成功，折扣後金額 900、折扣 100、套用代碼 "JAN"     |
        | 2026-01-31T23:59:59.001Z  | 套用失敗，原因為 "COUPON_EXPIRED"                     |
        | 2026-02-01T07:59:59+08:00 | 套用成功，折扣後金額 900、折扣 100、套用代碼 "JAN"     |

  Rule: MIN_ORDER_NOT_MET — 以折扣前訂單金額判定，等於可以

    Scenario Outline: 最低消費判斷
      Given 租戶 "T1" 的訂單金額為 <amount> 元
      And 結帳帶入以下優惠券:
        | code | type  | value | minOrderAmount |
        | M500 | FIXED | 50    | 500            |
      When 結帳套用優惠券
      Then <outcome>

      Examples:
        | amount | outcome                                             |
        | 499    | 套用失敗，原因為 "MIN_ORDER_NOT_MET"                  |
        | 500    | 套用成功，折扣後金額 450、折扣 50、套用代碼 "M500"     |

    Scenario: 最低消費用折扣前金額，不受前一張券影響
      Given 租戶 "T1" 的訂單金額為 500 元
      And 結帳帶入以下優惠券:
        | code | type  | value | stackable | minOrderAmount |
        | A    | FIXED | 100   | true      |                |
        | M500 | FIXED | 50    | true      | 500            |
      When 結帳套用優惠券
      Then 套用成功，折扣後金額 350、折扣 150、套用代碼 "A,M500"

    Scenario: 最低消費為 0 視為無限制
      Given 租戶 "T1" 的訂單金額為 1 元
      And 結帳帶入以下優惠券:
        | code | type  | value | minOrderAmount |
        | Z    | FIXED | 1     | 0              |
      When 結帳套用優惠券
      Then 套用成功，折扣後金額 0、折扣 1、套用代碼 "Z"

  Rule: DISCOUNT_EXCEEDS_AMOUNT — 折扣不得使金額低於 0

    Scenario: FIXED 折扣超過訂單金額時拒絕
      Given 租戶 "T1" 的訂單金額為 100 元
      And 結帳帶入以下優惠券:
        | code | type  | value |
        | F300 | FIXED | 300   |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "DISCOUNT_EXCEEDS_AMOUNT"

  Rule: 同時違反多條規則時依優先序回報第一個命中的原因

    Scenario: INVALID_INPUT 優先於 INVALID_COUPON
      Given 訂單金額的原始值為 "-1"
      And 結帳帶入以下優惠券:
        | code | type    | value |
        | BAD  | PERCENT | 500   |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_INPUT"

    Scenario: INVALID_COUPON 優先於 TENANT_MISMATCH（不論券的順序）
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | tenantId | code | type  | value |
        | T2       | XT   | FIXED | 10    |
        | T1       | BAD  | FIXED | 0     |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "INVALID_COUPON"

    Scenario: TENANT_MISMATCH 優先於 DUPLICATE_COUPON
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | tenantId | code | type  | value |
        | T1       | D    | FIXED | 10    |
        | T1       | D    | FIXED | 10    |
        | T2       | XT   | FIXED | 10    |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "TENANT_MISMATCH"

    Scenario: DUPLICATE_COUPON 優先於 COUPON_EXPIRED
      Given 租戶 "T1" 的訂單金額為 1000 元
      And 結帳帶入以下優惠券:
        | code | type  | value | validTo              |
        | OLD  | FIXED | 10    | 2026-01-31T00:00:00Z |
        | D    | FIXED | 10    | 2026-12-31T00:00:00Z |
        | D    | FIXED | 10    | 2026-12-31T00:00:00Z |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "DUPLICATE_COUPON"

    Scenario: COUPON_EXPIRED 優先於 MIN_ORDER_NOT_MET
      Given 租戶 "T1" 的訂單金額為 100 元
      And 結帳帶入以下優惠券:
        | code | type  | value | minOrderAmount | validTo              |
        | M    | FIXED | 10    | 500            | 2026-12-31T00:00:00Z |
        | OLD  | FIXED | 10    |                | 2026-01-31T00:00:00Z |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "COUPON_EXPIRED"

    Scenario: MIN_ORDER_NOT_MET 優先於 NOT_STACKABLE
      Given 租戶 "T1" 的訂單金額為 100 元
      And 結帳帶入以下優惠券:
        | code | type  | value | stackable | minOrderAmount |
        | N1   | FIXED | 10    | false     |                |
        | M    | FIXED | 10    | true      | 500            |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "MIN_ORDER_NOT_MET"

    Scenario: NOT_STACKABLE 優先於 DISCOUNT_EXCEEDS_AMOUNT
      Given 租戶 "T1" 的訂單金額為 100 元
      And 結帳帶入以下優惠券:
        | code | type  | value | stackable |
        | N1   | FIXED | 300   | false     |
        | S1   | FIXED | 300   | true      |
      When 結帳套用優惠券
      Then 套用失敗，原因為 "NOT_STACKABLE"
