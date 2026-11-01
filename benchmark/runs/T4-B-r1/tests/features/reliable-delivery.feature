Feature: Reliable delivery semantics
  Events may arrive more than once (same or different id) and in any order.
  Every service converges to the same final state, performs each step at most
  once per order, and never changes a terminal order. Event ids are unique.

  Background:
    Given stock "A" is 10
    And customer "c1" has balance 100

  Scenario: The same OrderPlaced delivered twice reserves stock once
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the inventory service handles the "OrderPlaced" event for "o1" again
    Then the last call emitted no events
    And available stock of "A" is 8
    And exactly 1 "StockReserved" events were emitted for "o1"

  Scenario: The same StockReserved delivered twice charges once
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    When the payment service handles the "StockReserved" event for "o1" again
    Then the last call emitted no events
    And balance of "c1" is 50
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"

  Scenario: A re-sent StockReserved with a different id is still a duplicate
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    When the payment service handles a fresh "StockReserved" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 50
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"

  Scenario: A re-sent OrderPlaced with a different id is still a duplicate
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the inventory service handles a fresh "OrderPlaced" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 8

  Scenario: The same PaymentSucceeded delivered twice confirms once
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "CONFIRMED"
    When the order service handles the "PaymentSucceeded" event for "o1" again
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"

  Scenario: StockReserved arriving before OrderPlaced at payment charges once after both
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    When the payment service handles the "OrderPlaced" event for "o1"
    Then the last call emitted exactly one "PaymentSucceeded" event for "o1" with amount 50
    And balance of "c1" is 50
    When the payment service handles the "StockReserved" event for "o1" again
    Then the last call emitted no events
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"

  Scenario: OrderCancelled arriving before OrderPlaced at inventory prevents the reservation
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the inventory service handles the "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 10
    When the inventory service handles the "OrderPlaced" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 10
    And exactly 0 "StockReserved" events were emitted for "o1"
    And exactly 0 "StockRejected" events were emitted for "o1"
    And exactly 0 "StockReleased" events were emitted for "o1"

  Scenario: OrderCancelled arriving before StockReserved at payment prevents the charge
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the payment service handles the "OrderCancelled" event for "o1"
    Then the last call emitted no events
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "PaymentFailed" events were emitted for "o1"

  Scenario: OrderCancelled arriving before OrderPlaced at payment prevents the charge
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And the payment service handles the "OrderCancelled" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    When the payment service handles the "OrderPlaced" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"

  Scenario: Late PaymentSucceeded after a timeout cancellation does not revive the order
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And balance of "c1" is 50
    And time advances to "2026-06-15T12:15:00Z"
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    When the order service handles the "PaymentSucceeded" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    When the payment service handles the "OrderCancelled" event for "o1"
    Then the last call emitted exactly one "PaymentRefunded" event for "o1" with amount 50
    And balance of "c1" is 100
    When the payment service handles the "OrderCancelled" event for "o1" again
    Then the last call emitted no events
    And balance of "c1" is 100
    When the inventory service handles the "OrderCancelled" event for "o1"
    Then the last call emitted exactly one "StockReleased" event for "o1"
    And available stock of "A" is 10
    When the inventory service handles the "OrderCancelled" event for "o1" again
    Then the last call emitted no events
    And available stock of "A" is 10

  Scenario: Late PaymentSucceeded after a customer cancellation does not revive the order
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the order service handles the "PaymentSucceeded" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    When all emitted events are broadcast until quiet
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And balance of "c1" is 100
    And available stock of "A" is 10
    And exactly 1 "PaymentRefunded" events were emitted for "o1"
    And exactly 1 "StockReleased" events were emitted for "o1"

  Scenario: Stock released for PaymentFailed is not released again on OrderCancelled
    Given customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And the inventory service handles the "PaymentFailed" event for "o1"
    And available stock of "A" is 10
    When the inventory service handles a synthetic "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 10
    And exactly 1 "StockReleased" events were emitted for "o1"
    When the inventory service handles the "PaymentFailed" event for "o1" again
    Then the last call emitted no events
    And available stock of "A" is 10

  Scenario: A refund is never issued twice
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And all emitted events are broadcast until quiet
    And balance of "c1" is 100
    When the payment service handles a fresh "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    And exactly 1 "PaymentRefunded" events were emitted for "o1"

  Scenario: A REJECTED order ignores every later event
    Given stock "A" is 1
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "REJECTED"
    When the order service handles a synthetic "PaymentSucceeded" event for "o1" with amount 50
    Then the last call emitted no events
    And order "o1" has status "REJECTED"
    When the order service handles a synthetic "PaymentFailed" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "REJECTED"
    When the order service handles a synthetic "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "REJECTED"
    And order "o1" has no cancel reason

  Scenario: A FAILED order ignores every later event
    Given customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "FAILED"
    When the order service handles a synthetic "PaymentSucceeded" event for "o1" with amount 50
    Then the last call emitted no events
    And order "o1" has status "FAILED"
    When the order service handles a synthetic "StockRejected" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "FAILED"

  Scenario: A CONFIRMED order only changes through cancellation
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "CONFIRMED"
    When the order service handles a synthetic "PaymentFailed" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"
    When the order service handles a synthetic "StockRejected" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"
    When the order service handles a synthetic "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"

  Scenario: Events for an unknown order are ignored by every service
    When the order service handles a synthetic "PaymentSucceeded" event for "ghost" with amount 5
    Then the last call emitted no events
    And order "ghost" is not found
    When the inventory service handles a synthetic "PaymentFailed" event for "ghost"
    Then the last call emitted no events
    And available stock of "A" is 10
    When the payment service handles a synthetic "StockReserved" event for "ghost"
    Then the last call emitted no events
    And balance of "c1" is 100

  Scenario: Every event id in a long run is unique
    Given stock "A" is 100
    When 40 orders are placed by "c1" for 1 of "A" at amount 2 at "2026-06-15T12:00:00Z" and broadcast
    Then at least 100 events were emitted
    And all emitted event ids are unique
    And available stock of "A" is 60
    And balance of "c1" is 20
