Feature: 付款成交 (US3, FR-007, FR-015)

  Background:
    Given the clock is at "2026-06-15T12:30:00Z"
    And sale "S1" is open with quantity "5", per-customer limit "3", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    And customer "c1" holds 2 from sale "S1" as hold "h1"

  Scenario: 保留中且未到期，付款成功通知使保留變為已成交
    When payment notice for hold "h1" arrives
    Then the result is ok
    And hold "h1" status is "PAID"
    And the remaining count is 3

  Scenario: 同一筆付款通知重複送達，結果一致且件數不變
    When payment notice for hold "h1" arrives 3 times
    Then all payment notices succeed
    And hold "h1" status is "PAID"
    And the remaining count is 3

  Scenario: 到期時刻（含）之後的付款被拒絕，即使排程尚未釋放
    When the clock advances 10 minutes
    And I take a snapshot of the store
    And payment notice for hold "h1" arrives
    Then the result fails with reason "HOLD_EXPIRED"
    And the store is unchanged since the snapshot
    And hold "h1" status is "HELD"
    And the remaining count is 3

  Scenario: 到期前一秒的付款仍然成功
    When the clock advances 9 minutes
    And the clock advances 59 seconds
    And payment notice for hold "h1" arrives
    Then the result is ok
    And hold "h1" status is "PAID"

  Scenario: 搶購結束後，保留期內的付款仍然成交
    Given the clock is at "2026-06-15T12:55:00Z"
    And customer "c3" holds 1 from sale "S1" as hold "h2"
    When the clock advances 5 minutes
    And payment notice for hold "h2" arrives
    Then the result is ok
    And hold "h2" status is "PAID"

  Scenario: 保留不存在的付款通知被拒絕
    When payment notice for unknown hold arrives
    Then the result fails with reason "HOLD_NOT_FOUND"
    And the remaining count is 3

  Scenario: 已被排程釋放的保留，付款被拒絕
    When the clock advances 10 minutes
    And the sweep runs on server 1
    And payment notice for hold "h1" arrives
    Then the result fails with reason "HOLD_EXPIRED"
    And hold "h1" status is "EXPIRED"
    And the remaining count is 5

  Scenario: 不同伺服器收到同一付款通知，結果一致
    When server 1 receives payment notice for hold "h1"
    And server 2 receives payment notice for hold "h1"
    Then the result is ok
    And hold "h1" status is "PAID"
    And the remaining count is 3
