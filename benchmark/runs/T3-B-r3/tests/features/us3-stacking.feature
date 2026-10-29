Feature: US3 多張優惠券疊加
  可疊加的券可以多張一起用；不可疊加的券只能單獨使用。
  百分比一律以折扣前金額計算，各自無條件捨去；applied 依傳入順序。

  Scenario: 可疊加的 PERCENT 與 FIXED 同時使用
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | S10  | PERCENT | 10    | true      |
      | S50  | FIXED   | 50    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣 150、套用代碼 "S10,S50"

  Scenario: applied 依傳入順序列出
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | S50  | FIXED   | 50    | true      |
      | S10  | PERCENT | 10    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 850、折扣 150、套用代碼 "S50,S10"

  Scenario: 多張百分比都以折扣前金額計算
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | P10  | PERCENT | 10    | true      |
      | P20  | PERCENT | 20    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 700、折扣 300、套用代碼 "P10,P20"

  Scenario: FIXED 在前也不影響百分比的計算基礎
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | F500 | FIXED   | 500   | true      |
      | P10  | PERCENT | 10    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 400、折扣 600、套用代碼 "F500,P10"

  Scenario: 每張百分比折扣各自無條件捨去
    Given 租戶 "T1" 的訂單金額為 333 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | P10  | PERCENT | 10    | true      |
      | P15  | PERCENT | 15    | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 251、折扣 82、套用代碼 "P10,P15"

  Scenario: 兩張不可疊加的券不能一起用
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | N1   | PERCENT | 10    | false     |
      | N2   | FIXED   | 50    | false     |
    When 結帳套用優惠券
    Then 套用失敗，原因為 "NOT_STACKABLE"

  Scenario: 不可疊加的券不能和可疊加的券一起用
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | S1   | PERCENT | 10    | true      |
      | N1   | FIXED   | 50    | false     |
    When 結帳套用優惠券
    Then 套用失敗，原因為 "NOT_STACKABLE"

  Scenario: 只用一張不可疊加的券可以成功
    Given 租戶 "T1" 的訂單金額為 1000 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | N1   | PERCENT | 20    | false     |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 800、折扣 200、套用代碼 "N1"

  Scenario: 多張折扣加總剛好等於訂單金額時成功，折扣後為 0
    Given 租戶 "T1" 的訂單金額為 200 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | P50  | PERCENT | 50    | true      |
      | F100 | FIXED   | 100   | true      |
    When 結帳套用優惠券
    Then 套用成功，折扣後金額 0、折扣 200、套用代碼 "P50,F100"

  Scenario: 多張折扣加總超過訂單金額時整筆拒絕
    Given 租戶 "T1" 的訂單金額為 200 元
    And 結帳帶入以下優惠券:
      | code | type    | value | stackable |
      | P60  | PERCENT | 60    | true      |
      | P50  | PERCENT | 50    | true      |
    When 結帳套用優惠券
    Then 套用失敗，原因為 "DISCOUNT_EXCEEDS_AMOUNT"
