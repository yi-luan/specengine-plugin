Feature: Successful purchase
  A customer places an order; inventory reserves stock, payment charges the
  customer, and the order becomes CONFIRMED. Services talk only through events.

  Background:
    Given stock "A" is 10
    And customer "c1" has balance 100

  Scenario: Placing an order creates it as PENDING and emits OrderPlaced
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    Then the command succeeds
    And the last call emitted exactly one "OrderPlaced" event for "o1"
    And the OrderPlaced event carries customer "c1", sku "A", qty 2, amount 50, at "2026-06-15T12:00:00Z"
    And order "o1" has status "PENDING"
    And order "o1" has no cancel reason

  Scenario: Inventory reserves stock on OrderPlaced
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When the inventory service handles the "OrderPlaced" event for "o1"
    Then the last call emitted exactly one "StockReserved" event for "o1"
    And available stock of "A" is 8

  Scenario: Payment charges the customer on StockReserved
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted exactly one "PaymentSucceeded" event for "o1" with amount 50
    And balance of "c1" is 50

  Scenario: Order becomes CONFIRMED on PaymentSucceeded
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    When the order service handles the "PaymentSucceeded" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"
    And order "o1" has no cancel reason

  Scenario: End to end purchase through broadcast
    When "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "CONFIRMED"
    And available stock of "A" is 8
    And balance of "c1" is 50
    And exactly 1 "OrderPlaced" events were emitted for "o1"
    And exactly 1 "StockReserved" events were emitted for "o1"
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "StockRejected" events were emitted for "o1"
    And exactly 0 "PaymentFailed" events were emitted for "o1"
    And exactly 0 "StockReleased" events were emitted for "o1"
    And exactly 0 "PaymentRefunded" events were emitted for "o1"
    And exactly 0 "OrderCancelled" events were emitted for "o1"

  Scenario: Two orders for the same SKU and customer are handled independently
    When "c1" places order "o1" for 2 of "A" at amount 30 at "2026-06-15T12:00:00Z"
    And "c1" places order "o2" for 3 of "A" at amount 40 at "2026-06-15T12:01:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "CONFIRMED"
    And order "o2" has status "CONFIRMED"
    And available stock of "A" is 5
    And balance of "c1" is 30

  Scenario: Services ignore event types they do not handle
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the order service handles the "OrderPlaced" event for "o1"
    Then the last call emitted no events
    When the order service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "PENDING"
    When the inventory service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 8
    When the inventory service handles a synthetic "PaymentSucceeded" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 8
    When the payment service handles a synthetic "StockRejected" event for "o1"
    Then the last call emitted no events
    When the payment service handles a synthetic "StockReleased" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
