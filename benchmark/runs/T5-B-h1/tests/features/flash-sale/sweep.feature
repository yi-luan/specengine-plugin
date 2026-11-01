Feature: 到期未付款的保留釋放 (US4, FR-008)

  Background:
    Given the clock is at "2026-06-15T12:30:00Z"
    And sale "S1" is open with quantity "5", per-customer limit "3", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    And customer "c1" holds 2 from sale "S1" as hold "h1"

  Scenario: 到期未付款的保留被釋放，件數與限購額度歸還
    When the clock advances 10 minutes
    And the sweep runs on server 0
    Then hold "h1" status is "EXPIRED"
    And the remaining count is 5
    When customer "c1" grabs 3 from sale "S1" with request "r9"
    Then the grab result is ok

  Scenario: 尚未到期的保留保持保留中
    When the clock advances 9 minutes
    And the sweep runs on server 0
    Then hold "h1" status is "HELD"
    And the remaining count is 3

  Scenario: 已成交的保留不會被釋放
    When payment notice for hold "h1" arrives
    And the clock advances 10 minutes
    And the sweep runs on all servers
    Then hold "h1" status is "PAID"
    And the remaining count is 3

  Scenario: 多台伺服器同時執行排程，件數只歸還一次
    When the clock advances 10 minutes
    And the sweep runs on all servers
    And the sweep runs on all servers
    Then hold "h1" status is "EXPIRED"
    And the remaining count on server 2 is 5
    And the remaining count on server 1 is 5

  Scenario: 排程在決定釋放後當機，下一次排程仍會完成釋放
    When the clock advances 10 minutes
    And server 1 will crash once on its next write to a key containing "flash:freed:"
    And the sweep runs on server 1 and may crash
    Then the sweep on server 1 reported a crash
    When the sweep runs on server 0
    Then hold "h1" status is "EXPIRED"
    And the remaining count is 5
