Feature: 多台伺服器併發搶購與故障情境 (FR-006, FR-010, FR-012)

  Background:
    Given the clock is at "2026-06-15T12:30:00Z"

  Scenario: 十位顧客同時搶最後一件，只有一人成功
    Given sale "S1" is open with quantity "1", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When 10 customers each grab 1 from sale "S1" at the same time
    Then exactly 1 grabs succeeded
    And the remaining count is 0
    And the successful grabs in sale "S1" total at most 1 units

  Scenario: 八位顧客同時搶五件，恰好五人成功且不超賣
    Given sale "S1" is open with quantity "5", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When 8 customers each grab 1 from sale "S1" at the same time
    Then exactly 5 grabs succeeded
    And the remaining count is 0
    And the successful grabs in sale "S1" total at most 5 units

  Scenario: 三位顧客各搶 2 件同時搶 6 件庫存，三人都成功（名額足夠時不因併發失敗）
    Given sale "S1" is open with quantity "6", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When 3 customers each grab 2 from sale "S1" at the same time
    Then exactly 3 grabs succeeded
    And the remaining count is 0

  Scenario: 三位顧客各搶 2 件同時搶 4 件庫存，恰好兩人成功、第三人回 SOLD_OUT
    Given sale "S1" is open with quantity "4", per-customer limit "5", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When 3 customers each grab 2 from sale "S1" at the same time
    Then exactly 2 grabs succeeded
    And the remaining count is 0
    And the successful grabs in sale "S1" total at most 4 units

  Scenario: 同一請求在第一次尚未決定時重送，回 REQUEST_IN_PROGRESS 且不保留件數
    Given sale "S1" is open with quantity "2", per-customer limit "2", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    And server 0 pauses before writing a key containing "flash:cslot:"
    When server 0 starts grabbing 1 from sale "S1" as customer "c1" with request "r1"
    And server 1 customer "c1" grabs 1 from sale "S1" with request "r1"
    Then the result fails with reason "REQUEST_IN_PROGRESS"
    And the remaining count is 2
    When server 0 resumes
    Then the stalled grab result is ok
    And the remaining count is 1

  Scenario: 同一顧客同時送出六個不同請求，限購為三件
    Given sale "S1" is open with quantity "10", per-customer limit "3", from "2026-06-15T12:00:00Z" to "2026-06-15T13:00:00Z"
    When customer "c1" sends 6 grabs of 1 from sale "S1" at the same time
    Then exactly 3 grabs succeeded
    And customer "c1" holds at most 3 units in sale "S1"
    And the remaining count is 7

  Scenario: 伺服器在搶購中途卡住，其他伺服器完成搶購與排程後，恢復的伺服器不會超賣或重複扣件
    Given sale "S1" is open with quantity "2", per-customer limit "2", from "2026-06-15T12:00:00Z" to "2026-06-15T13:30:00Z"
    And server 0 pauses before writing a key containing "flash:slot:"
    When server 0 starts grabbing 1 from sale "S1" as customer "c1" with request "r1"
    And the clock advances 11 minutes
    And the sweep runs on server 1
    And server 1 customer "c2" grabs 2 from sale "S1" with request "r2"
    Then the grab result is ok
    When server 0 resumes
    Then the stalled grab fails with reason "SOLD_OUT"
    And the remaining count is 0
    And the successful grabs in sale "S1" total at most 2 units
