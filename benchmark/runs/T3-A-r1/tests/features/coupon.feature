Feature: 多租戶優惠券結帳套用
  系統服務多個租戶，結帳時依規則套用優惠券，回傳折扣後金額、折扣總額與實際套用的代碼；
  任一張優惠券無法套用時整筆失敗並回傳原因。

  Background:
    Given 現在時間是 "2026-06-15T12:00:00Z"
    And 租戶 "t1" 的訂單金額為 1000

  # ---------- 基本套用 ----------

  Scenario: 未傳入任何優惠券
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 1000、折扣總額 0
    And 實際套用的優惠券代碼為 ""

  Scenario: 套用單張百分比折扣
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 900、折扣總額 100
    And 實際套用的優惠券代碼為 "P10"

  Scenario: 套用單張固定金額折扣
    Given 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | F150 | FIXED | 150   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣總額 150
    And 實際套用的優惠券代碼為 "F150"

  Scenario: 百分比折扣的零頭無條件捨去（整數元）
    Given 租戶 "t1" 的訂單金額為 999
    And 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P15  | PERCENT | 15    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣總額 149

  # ---------- 租戶隔離 ----------

  Scenario: 優惠券屬於其他租戶時不得使用
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t2       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "TENANT_MISMATCH"
    And 失敗原因提及優惠券 "P10"

  Scenario: 多張券中只要有一張屬於其他租戶即整筆失敗
    Given 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | S1   | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t2       | S2   | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "TENANT_MISMATCH"
    And 失敗原因提及優惠券 "S2"

  # ---------- 有效期間 ----------

  Scenario: 優惠券尚未生效
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-07-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "NOT_YET_VALID"

  Scenario: 優惠券已過期
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-05-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "EXPIRED"

  Scenario: 現在時間剛好等於起始時間可使用（含邊界）
    Given 現在時間是 "2026-06-01T00:00:00Z"
    And 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-06-01T00:00:00Z | 2026-06-30T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 900、折扣總額 100

  Scenario: 現在時間剛好等於結束時間可使用（含邊界）
    Given 現在時間是 "2026-06-30T23:59:59Z"
    And 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-06-01T00:00:00Z | 2026-06-30T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 900、折扣總額 100

  # ---------- 疊加規則 ----------

  Scenario: 多張可疊加優惠券可同時使用，百分比皆以折扣前金額計算
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | F50  | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | P20  | PERCENT | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 650、折扣總額 350
    And 實際套用的優惠券代碼為 "P10,F50,P20"

  Scenario: 兩張不可疊加優惠券不得同時使用
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | N1   | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
      | t1       | N2   | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "NOT_STACKABLE"
    And 失敗原因提及優惠券 "N1"

  Scenario: 不可疊加優惠券不得與可疊加優惠券同時使用
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | S1   | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | N1   | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "NOT_STACKABLE"
    And 失敗原因提及優惠券 "N1"

  Scenario: 單張不可疊加優惠券可單獨使用
    Given 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | N1   | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 950、折扣總額 50
    And 實際套用的優惠券代碼為 "N1"

  # ---------- 金額下限 ----------

  Scenario: 固定金額折扣超過訂單金額時折扣後金額為 0
    Given 租戶 "t1" 的訂單金額為 80
    And 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | F100 | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 0、折扣總額 80
    And 實際套用的優惠券代碼為 "F100"

  Scenario: 多張固定金額折扣合計超過訂單金額時折扣總額以訂單金額為上限
    Given 租戶 "t1" 的訂單金額為 120
    And 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | F100 | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | F50  | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 0、折扣總額 120
    And 實際套用的優惠券代碼為 "F100,F50"

  # ---------- 最低消費 ----------

  Scenario: 訂單金額未達優惠券最低消費
    Given 租戶 "t1" 的訂單金額為 499
    And 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     | 500            |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "MIN_ORDER_NOT_MET"
    And 失敗原因提及優惠券 "P10"

  Scenario: 訂單金額剛好達到最低消費可使用
    Given 租戶 "t1" 的訂單金額為 500
    And 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P10  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     | 500            |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 450、折扣總額 50

  Scenario: 最低消費以折扣前的訂單金額判斷
    Given 租戶 "t1" 的訂單金額為 500
    And 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | F100 | FIXED | 100   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | F20  | FIXED | 20    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      | 500            |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 380、折扣總額 120
    And 實際套用的優惠券代碼為 "F100,F20"

  # ---------- 代碼唯一 ----------

  Scenario: 同一張優惠券代碼重複傳入
    Given 傳入以下優惠券
      | tenantId | code | type  | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | F50  | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
      | t1       | F50  | FIXED | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "DUPLICATE_CODE"
    And 失敗原因提及優惠券 "F50"

  # ---------- 失敗原因依傳入順序取第一個 ----------

  Scenario: 多張券皆有問題時回傳傳入順序中第一張的失敗原因
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | OLD  | PERCENT | 10    | 2026-01-01T00:00:00Z | 2026-05-31T23:59:59Z | true      |                |
      | t2       | X    | FIXED   | 50    | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | true      |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "EXPIRED"
    And 失敗原因提及優惠券 "OLD"

  # ---------- 輸入合法性 ----------

  Scenario: 訂單金額不是整數
    Given 租戶 "t1" 的訂單金額為 100.5
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "INVALID_INPUT"

  Scenario: 訂單金額為負數
    Given 租戶 "t1" 的訂單金額為 -1
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "INVALID_INPUT"

  Scenario: 百分比折扣超過 100
    Given 傳入以下優惠券
      | tenantId | code | type    | value | validFrom            | validTo              | stackable | minOrderAmount |
      | t1       | P101 | PERCENT | 101   | 2026-01-01T00:00:00Z | 2026-12-31T23:59:59Z | false     |                |
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "INVALID_COUPON"

  Scenario: 現在時間格式不合法
    Given 現在時間是 "not-a-date"
    When 結帳套用優惠券
    Then 套用失敗，原因代碼為 "INVALID_INPUT"
