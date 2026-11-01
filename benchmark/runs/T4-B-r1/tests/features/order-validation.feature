Feature: Order placement validation and lookups
  Invalid or duplicate placements are refused without creating an order or
  emitting any event. Unknown orders, SKUs and customers read as absent / zero.

  Background:
    Given stock "A" is 10
    And customer "c1" has balance 100

  Scenario: Duplicate order id is refused
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When "c1" places order "o1" for 1 of "A" at amount 10 at "2026-06-15T12:01:00Z"
    Then the command fails with reason "DUPLICATE_ORDER"
    And the last call emitted no events
    And exactly 1 "OrderPlaced" events were emitted for "o1"
    And order "o1" has status "PENDING"

  Scenario: Zero quantity is refused
    When "c1" places order "o1" for 0 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And the last call emitted no events
    And order "o1" is not found

  Scenario: Negative quantity is refused
    When "c1" places order "o1" for -1 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Non-integer quantity is refused
    When "c1" places order "o1" for 1.5 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Zero amount is refused
    When "c1" places order "o1" for 1 of "A" at amount 0 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Non-integer amount is refused
    When "c1" places order "o1" for 1 of "A" at amount 10.5 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Empty order id is refused
    When "c1" places order "" for 1 of "A" at amount 10 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And the last call emitted no events

  Scenario: Empty customer id is refused
    When "" places order "o1" for 1 of "A" at amount 10 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Empty sku is refused
    When "c1" places order "o1" for 1 of "" at amount 10 at "2026-06-15T12:00:00Z"
    Then the command fails with reason "INVALID_INPUT"
    And order "o1" is not found

  Scenario: Unknown order, sku and customer
    Then order "nope" is not found
    And available stock of "Z" is 0
    And balance of "nobody" is 0
