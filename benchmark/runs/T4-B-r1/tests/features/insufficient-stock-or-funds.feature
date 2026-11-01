Feature: Insufficient stock or funds
  Stock shortage rejects the order without touching stock; payment shortage
  fails the order, leaves the balance untouched and releases the reserved stock.

  Scenario: Inventory rejects when stock is short
    Given stock "A" is 1
    And customer "c1" has balance 100
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When the inventory service handles the "OrderPlaced" event for "o1"
    Then the last call emitted exactly one "StockRejected" event for "o1"
    And available stock of "A" is 1

  Scenario: Order becomes REJECTED on StockRejected
    Given stock "A" is 1
    And customer "c1" has balance 100
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the order service handles the "StockRejected" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "REJECTED"

  Scenario: Payment fails when balance is short
    Given stock "A" is 10
    And customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted exactly one "PaymentFailed" event for "o1"
    And balance of "c1" is 10

  Scenario: Order becomes FAILED on PaymentFailed
    Given stock "A" is 10
    And customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    When the order service handles the "PaymentFailed" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "FAILED"

  Scenario: Inventory releases the reservation on PaymentFailed
    Given stock "A" is 10
    And customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And available stock of "A" is 8
    When the inventory service handles the "PaymentFailed" event for "o1"
    Then the last call emitted exactly one "StockReleased" event for "o1"
    And available stock of "A" is 10

  Scenario: End to end stock shortage through broadcast
    Given stock "A" is 1
    And customer "c1" has balance 100
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "REJECTED"
    And available stock of "A" is 1
    And balance of "c1" is 100
    And exactly 1 "StockRejected" events were emitted for "o1"
    And exactly 0 "StockReserved" events were emitted for "o1"
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "PaymentFailed" events were emitted for "o1"
    And exactly 0 "StockReleased" events were emitted for "o1"

  Scenario: End to end payment failure through broadcast
    Given stock "A" is 10
    And customer "c1" has balance 10
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "FAILED"
    And available stock of "A" is 10
    And balance of "c1" is 10
    And exactly 1 "StockReserved" events were emitted for "o1"
    And exactly 1 "PaymentFailed" events were emitted for "o1"
    And exactly 1 "StockReleased" events were emitted for "o1"
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "PaymentRefunded" events were emitted for "o1"

  Scenario: Exact balance is sufficient
    Given stock "A" is 10
    And customer "c1" has balance 50
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "CONFIRMED"
    And balance of "c1" is 0

  Scenario: Exact stock is sufficient
    Given stock "A" is 2
    And customer "c1" has balance 100
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "CONFIRMED"
    And available stock of "A" is 0
