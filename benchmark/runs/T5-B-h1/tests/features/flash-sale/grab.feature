Feature: 顧客搶購並保留件數 10 分鐘 (US2, FR-003 至 FR-006, FR-011, FR-015)

  Background:
    Given the clock is at "2026-06-15T12:30:00Z"
    And sale "S1" is open with quantity "5", per-customer limit "3", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"

  Scenario: 時段內搶購成功，回傳保留編號與到期時間，剩餘件數減少
    When customer "c1" grabs 2 from sale "S1" with request "r1"
    Then the grab result is ok
    And the hold expires at "2026-06-15T12:40:00Z"
    And the remaining count is 3

  Scenario: 剩餘件數剛好等於要搶的件數時可以搶到
    Given sale "S2" is open with quantity "5", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When customer "c1" grabs 5 from sale "S2" with request "r1"
    Then the grab result is ok
    And the remaining count of sale "S2" is 0

  Scenario: 剩餘件數不足時整筆拒絕，不部分保留
    Given sale "S2" is open with quantity "2", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When customer "c1" grabs 3 from sale "S2" with request "r1"
    Then the result fails with reason "SOLD_OUT"
    And the remaining count of sale "S2" is 2

  Scenario: 超過每位顧客限購件數時整筆拒絕
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    When customer "c1" grabs 2 from sale "S1" with request "r2"
    Then the result fails with reason "LIMIT_EXCEEDED"
    And the remaining count is 3

  Scenario: 限購件數在保留期內持續計入，不同顧客互不影響
    Given customer "c1" holds 3 from sale "S1" as hold "h1"
    When customer "c2" grabs 2 from sale "S1" with request "r2"
    Then the grab result is ok
    And the remaining count is 0

  Scenario: 搶購開始前被拒絕，且不寫入任何資料
    Given the clock is at "2026-06-15T11:59:59Z"
    When I take a snapshot of the store
    And customer "c1" grabs 1 from sale "S1" with request "r1"
    Then the result fails with reason "NOT_STARTED"
    And the store is unchanged since the snapshot

  Scenario: 開始時刻（含）起可以搶
    Given the clock is at "2026-06-15T12:00:00Z"
    When customer "c1" grabs 1 from sale "S1" with request "r1"
    Then the grab result is ok

  Scenario: 結束時刻（含）起不可搶
    Given the clock is at "2026-06-15T13:00:00Z"
    When I take a snapshot of the store
    And customer "c1" grabs 1 from sale "S1" with request "r1"
    Then the result fails with reason "ENDED"
    And the store is unchanged since the snapshot

  Scenario Outline: 輸入不合法或搶購編號不存在時被拒絕，且不寫入任何資料
    When I take a snapshot of the store
    And customer "<customer>" grabs <qty> from sale "<sale>" with request "r1"
    Then the result fails with reason "<reason>"
    And the store is unchanged since the snapshot

    Examples:
      | customer | qty | sale | reason         |
      | c1       | 0   | S1   | INVALID_INPUT  |
      | c1       | -1  | S1   | INVALID_INPUT  |
      |          | 1   | S1   | INVALID_INPUT  |
      | c1       | 1   | NOPE | SALE_NOT_FOUND |

  Scenario: 同一請求重送回傳相同保留，件數只扣一次
    When customer "c1" grabs 2 from sale "S1" with request "r1"
    And the same request is sent again
    Then the replayed result equals the first result
    And the remaining count is 3

  Scenario: 同一請求編號但顧客不同被視為衝突
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    When customer "c2" grabs 2 from sale "S1" with request "req-h1"
    Then the result fails with reason "REQUEST_CONFLICT"
    And the remaining count is 3

  Scenario: 同一請求編號但件數不同被視為衝突
    Given customer "c1" holds 2 from sale "S1" as hold "h1"
    When customer "c1" grabs 1 from sale "S1" with request "req-h1"
    Then the result fails with reason "REQUEST_CONFLICT"
    And the remaining count is 3
