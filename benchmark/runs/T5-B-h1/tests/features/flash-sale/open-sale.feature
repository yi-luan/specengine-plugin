Feature: 商家開一檔限量搶購 (US1, FR-001, FR-002)

  Background:
    Given the clock is at "2026-06-15T11:00:00Z"

  Scenario: 有效參數開檔成功，剩餘件數等於限量件數
    When I open sale "S1" with quantity "5", per-customer limit "2", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    Then the result is ok
    And the remaining count of sale "S1" is 5

  Scenario: 重複的搶購編號被拒絕且原搶購不受影響
    Given sale "S1" is open with quantity "5", per-customer limit "2", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When I take a snapshot of the store
    And I open sale "S1" with quantity "9", per-customer limit "9", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    Then the result fails with reason "DUPLICATE_SALE"
    And the store is unchanged since the snapshot
    And the remaining count of sale "S1" is 5

  Scenario Outline: 不合法的開檔參數被拒絕且不寫入任何資料
    When I take a snapshot of the store
    And I open sale "<saleId>" with quantity "<quantity>", per-customer limit "<limit>", from "<from>" to "<to>"
    Then the result fails with reason "INVALID_INPUT"
    And the store is unchanged since the snapshot

    Examples: 件數與限購
      | saleId | quantity | limit | from                 | to                   |
      | S1     | 0        | 2     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | -3       | 2     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | 1.5      | 2     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | abc      | 2     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | 5        | 0     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | 5        | 2.5   | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |

    Examples: 編號與時段
      | saleId | quantity | limit | from                 | to                   |
      |        | 5        | 2     | 2026-06-15T12:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | 5        | 2     | 2026-06-15T13:00:00Z | 2026-06-15T13:00:00Z |
      | S1     | 5        | 2     | 2026-06-15T13:00:00Z | 2026-06-15T12:00:00Z |
