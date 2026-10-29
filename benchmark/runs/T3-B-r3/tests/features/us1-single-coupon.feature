Feature: US1 單張優惠券結帳
  結帳時使用一張同租戶優惠券，回傳折扣後金額、折扣總額與實際套用代碼。

  Scenario: PERCENT 10% 以折扣前金額計算
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type    | value |
      | T1       | P10  | PERCENT | 10    |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 900、折扣 100、套用代碼 "P10"

  Scenario: FIXED 150 元
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type  | value |
      | T1       | F150 | FIXED | 150   |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣 150、套用代碼 "F150"

  Scenario: FIXED 折扣剛好等於訂單金額時折扣後為 0
    Given 租戶 "T1" 的訂單金額為 100 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type  | value |
      | T1       | F100 | FIXED | 100   |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 0、折扣 100、套用代碼 "F100"

  Scenario: PERCENT 折扣有小數時無條件捨去
    Given 租戶 "T1" 的訂單金額為 333 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type    | value |
      | T1       | P15  | PERCENT | 15    |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 284、折扣 49、套用代碼 "P15"

  Scenario: PERCENT 100% 折扣後為 0
    Given 租戶 "T1" 的訂單金額為 999 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type    | value |
      | T1       | FREE | PERCENT | 100   |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 0、折扣 999、套用代碼 "FREE"

  Scenario: 沒有帶任何優惠券時成功且不折扣
    Given 租戶 "T1" 的訂單金額為 500 元
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 500、折扣 0、套用代碼 ""

  Scenario: 套券不會修改輸入資料
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | tenantId | code | type    | value | stackable |
      | T1       | A    | PERCENT | 10    | true      |
      | T1       | B    | FIXED   | 50    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣 150、套用代碼 "A,B"
    And 輸入資料未被修改
