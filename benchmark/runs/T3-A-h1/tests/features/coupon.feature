Feature: 多租戶優惠券

  Background:
    Given 訂單所屬租戶為 "T1"，訂單金額為 1000 元，結帳時間為 "2026-06-01T00:00:00Z"

  Scenario: 百分比折扣以折扣前金額計算
    Given 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 折扣後金額為 900
    And 折扣總額為 100
    And 實際套用的優惠券為 "P10"

  Scenario: 固定金額折扣
    Given 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "F50"
    Then 折扣後金額為 950
    And 折扣總額為 50
    And 實際套用的優惠券為 "F50"

  Scenario: 固定金額折扣不得使訂單金額低於 0
    Given 訂單金額為 300 元
    And 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F500 | T1       | FIXED | 500   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "F500"
    Then 折扣後金額為 0
    And 折扣總額為 300

  Scenario: 不同租戶的優惠券不能使用
    Given 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T2       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 套用失敗，原因為 "TENANT_MISMATCH"

  Scenario: 尚未到有效期間的優惠券不能使用
    Given 結帳時間為 "2025-12-31T23:59:59Z"
    And 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 套用失敗，原因為 "NOT_YET_VALID"

  Scenario: 超過有效期間的優惠券不能使用
    Given 結帳時間為 "2027-01-01T00:00:01Z"
    And 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 套用失敗，原因為 "EXPIRED"

  Scenario: 有效期間起訖兩端的時間點仍可使用
    Given 結帳時間為 "2026-12-31T23:59:59Z"
    And 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 折扣後金額為 900

  Scenario: 未達最低消費的優惠券不能使用
    Given 訂單金額為 999 元
    And 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     | 1000           |
    When 套用優惠券 "F50"
    Then 套用失敗，原因為 "BELOW_MIN_ORDER"

  Scenario: 剛好達到最低消費的優惠券可以使用
    Given 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     | 1000           |
    When 套用優惠券 "F50"
    Then 折扣後金額為 950

  Scenario: 不可疊加的優惠券不能與其他優惠券同時使用
    Given 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10  | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 套用優惠券 "P10,F50"
    Then 套用失敗，原因為 "NON_STACKABLE_CONFLICT"

  Scenario: 兩張不可疊加的優惠券不能同時使用
    Given 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      | P20  | T1       | PERCENT | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10,P20"
    Then 套用失敗，原因為 "NON_STACKABLE_CONFLICT"

  Scenario: 可疊加的優惠券可以多張同時使用
    Given 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | F50  | T1       | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 套用優惠券 "P10,F50"
    Then 折扣後金額為 850
    And 折扣總額為 150
    And 實際套用的優惠券為 "P10,F50"

  Scenario: 多張百分比折扣都以折扣前金額計算，合計不得使金額為負
    Given 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P60A | T1       | PERCENT | 60    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | P60B | T1       | PERCENT | 60    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 套用優惠券 "P60A,P60B"
    Then 折扣後金額為 0
    And 折扣總額為 1000
    And 實際套用的優惠券為 "P60A,P60B"

  Scenario: 百分比折扣無條件捨去到整數元
    Given 訂單金額為 999 元
    And 下列優惠券:
      | code | tenantId | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | P10  | T1       | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "P10"
    Then 折扣後金額為 900
    And 折扣總額為 99

  Scenario: 折扣已用完的優惠券不計入實際套用
    Given 訂單金額為 300 元
    And 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F300 | T1       | FIXED | 300   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 套用優惠券 "F300,F50"
    Then 折扣後金額為 0
    And 折扣總額為 300
    And 實際套用的優惠券為 "F300"

  Scenario: 同一代碼重複傳入時失敗
    Given 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 套用優惠券 "F50,F50"
    Then 套用失敗，原因為 "DUPLICATE_CODE"

  Scenario: 未傳入任何優惠券時回傳原價
    When 套用優惠券 ""
    Then 折扣後金額為 1000
    And 折扣總額為 0
    And 實際套用的優惠券為 ""

  Scenario: 訂單金額非整數時失敗
    Given 訂單金額為 10.5 元
    And 下列優惠券:
      | code | tenantId | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | F50  | T1       | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 套用優惠券 "F50"
    Then 套用失敗，原因為 "INVALID_ORDER_AMOUNT"
