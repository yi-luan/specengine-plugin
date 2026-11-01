Feature: 商品頁顯示剩餘可搶件數 (US5, FR-009)

  Background:
    Given the clock is at "2026-06-15T12:30:00Z"
    And sale "S1" is open with quantity "5", per-customer limit "3", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"

  Scenario: 剛開檔時剩餘件數等於限量件數
    Then the remaining count is 5

  Scenario: 保留中與已成交的件數都會被扣除
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    And customer "c2" holds 1 from sale "S1" as hold "h2"
    When payment notice for hold "h1" arrives
    Then the remaining count is 2
    And hold "h1" status is "PAID"
    And hold "h2" status is "HELD"

  Scenario: 保留被釋放後，件數計入剩餘可搶件數
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    When the clock advances 10 minutes
    Then the remaining count is 3
    When the sweep runs on server 2
    Then the remaining count is 5
    And hold "h1" status is "EXPIRED"

  Scenario: 每台伺服器讀到的剩餘件數一致
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    Then the remaining count on server 0 is 3
    And the remaining count on server 1 is 3
    And the remaining count on server 2 is 3
