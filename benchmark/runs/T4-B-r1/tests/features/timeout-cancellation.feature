Feature: Automatic timeout cancellation
  A PENDING order whose payment has not completed 15 minutes after placement is
  cancelled with reason TIMEOUT when time advances to or past the deadline.

  Background:
    Given stock "A" is 10
    And customer "c1" has balance 100

  Scenario: Exactly 15 minutes after placement cancels the order
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When time advances to "2026-06-15T12:15:00Z"
    Then the last call emitted exactly one "OrderCancelled" event for "o1"
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"

  Scenario: One second before the deadline does nothing
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When time advances to "2026-06-15T12:14:59Z"
    Then the last call emitted no events
    And order "o1" has status "PENDING"

  Scenario: A CONFIRMED order is not timed out
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "CONFIRMED"
    When time advances to "2026-06-15T12:30:00Z"
    Then the last call emitted no events
    And order "o1" has status "CONFIRMED"

  Scenario: A REJECTED order is not timed out
    Given stock "A" is 1
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "REJECTED"
    When time advances to "2026-06-15T12:30:00Z"
    Then the last call emitted no events
    And order "o1" has status "REJECTED"

  Scenario: A FAILED order is not timed out
    Given customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "FAILED"
    When time advances to "2026-06-15T12:30:00Z"
    Then the last call emitted no events
    And order "o1" has status "FAILED"

  Scenario: A customer-cancelled order is not timed out again
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When time advances to "2026-06-15T12:30:00Z"
    Then the last call emitted no events
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"

  Scenario: Timeout cancellation happens only once
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And time advances to "2026-06-15T12:15:00Z"
    When time advances to "2026-06-15T12:20:00Z"
    Then the last call emitted no events
    And exactly 1 "OrderCancelled" events were emitted for "o1"
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"

  Scenario: Only orders past their own deadline are cancelled
    Given "c1" places order "o1" for 2 of "A" at amount 30 at "2026-06-15T12:00:00Z"
    And "c1" places order "o2" for 2 of "A" at amount 30 at "2026-06-15T12:10:00Z"
    When time advances to "2026-06-15T12:15:00Z"
    Then the last call emitted 1 events
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    And order "o2" has status "PENDING"
    When time advances to "2026-06-15T12:25:00Z"
    Then the last call emitted exactly one "OrderCancelled" event for "o2"
    And order "o2" has status "CANCELLED" with cancel reason "TIMEOUT"

  Scenario: Timeout after the charge went through refunds and releases stock
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And balance of "c1" is 50
    When time advances to "2026-06-15T12:15:00Z"
    Then order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    When all emitted events are broadcast until quiet
    Then order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    And balance of "c1" is 100
    And available stock of "A" is 10
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"
    And exactly 1 "PaymentRefunded" events were emitted for "o1"
    And exactly 1 "StockReleased" events were emitted for "o1"

  Scenario: Timeout of an unpaid reserved order releases stock without any charge or refund
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And available stock of "A" is 8
    When time advances to "2026-06-15T12:15:00Z"
    And the inventory service handles the "OrderCancelled" event for "o1"
    And the payment service handles the "OrderCancelled" event for "o1"
    Then order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    And available stock of "A" is 10
    And balance of "c1" is 100
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    And exactly 1 "StockReleased" events were emitted for "o1"
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "PaymentRefunded" events were emitted for "o1"
