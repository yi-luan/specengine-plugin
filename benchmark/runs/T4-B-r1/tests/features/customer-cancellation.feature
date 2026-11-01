Feature: Customer cancellation with compensation
  A customer may cancel a PENDING or CONFIRMED order. The order service emits
  OrderCancelled; inventory puts reserved stock back (StockReleased) and payment
  refunds any charged amount (PaymentRefunded). Other states cannot be cancelled.

  Background:
    Given stock "A" is 10
    And customer "c1" has balance 100

  Scenario: Cancelling a PENDING order
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    Then the command succeeds
    And the last call emitted exactly one "OrderCancelled" event for "o1"
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"

  Scenario: Inventory releases the reservation on OrderCancelled
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And available stock of "A" is 8
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the inventory service handles the "OrderCancelled" event for "o1"
    Then the last call emitted exactly one "StockReleased" event for "o1"
    And available stock of "A" is 10

  Scenario: Payment refunds the charged amount on OrderCancelled
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "StockReserved" event for "o1"
    And balance of "c1" is 50
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the payment service handles the "OrderCancelled" event for "o1"
    Then the last call emitted exactly one "PaymentRefunded" event for "o1" with amount 50
    And balance of "c1" is 100

  Scenario: Payment emits nothing on OrderCancelled when nothing was charged
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the payment service handles the "OrderPlaced" event for "o1"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the payment service handles the "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100

  Scenario: Inventory emits nothing on OrderCancelled when nothing was reserved
    Given stock "A" is 1
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the inventory service handles the "OrderCancelled" event for "o1"
    Then the last call emitted no events
    And available stock of "A" is 1

  Scenario: Cancelling a CONFIRMED order refunds and restores stock end to end
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "CONFIRMED"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    Then the command succeeds
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    When all emitted events are broadcast until quiet
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And available stock of "A" is 10
    And balance of "c1" is 100
    And exactly 1 "OrderCancelled" events were emitted for "o1"
    And exactly 1 "StockReleased" events were emitted for "o1"
    And exactly 1 "PaymentRefunded" events were emitted for "o1"

  Scenario: Cancelling a PENDING order before payment releases stock without any charge or refund
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    And the payment service handles the "OrderPlaced" event for "o1"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And the payment service handles the "OrderCancelled" event for "o1"
    And the inventory service handles the "OrderCancelled" event for "o1"
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And available stock of "A" is 10
    And balance of "c1" is 100
    When the payment service handles the "StockReserved" event for "o1"
    Then the last call emitted no events
    And balance of "c1" is 100
    And exactly 1 "StockReleased" events were emitted for "o1"
    And exactly 0 "PaymentSucceeded" events were emitted for "o1"
    And exactly 0 "PaymentRefunded" events were emitted for "o1"

  Scenario: Cancelling a PENDING order after a delayed charge still nets out to a full refund
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the inventory service handles the "OrderPlaced" event for "o1"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And all emitted events are broadcast until quiet
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And available stock of "A" is 10
    And balance of "c1" is 100
    And exactly 1 "StockReleased" events were emitted for "o1"
    And exactly 1 "PaymentSucceeded" events were emitted for "o1"
    And exactly 1 "PaymentRefunded" events were emitted for "o1"

  Scenario: A REJECTED order cannot be cancelled
    Given stock "A" is 1
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "REJECTED"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    Then the command fails with reason "NOT_CANCELLABLE"
    And the last call emitted no events
    And order "o1" has status "REJECTED"
    And exactly 0 "OrderCancelled" events were emitted for "o1"

  Scenario: A FAILED order cannot be cancelled
    Given customer "c1" has balance 10
    And "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And all emitted events are broadcast until quiet
    And order "o1" has status "FAILED"
    When the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    Then the command fails with reason "NOT_CANCELLABLE"
    And order "o1" has status "FAILED"
    And exactly 0 "OrderCancelled" events were emitted for "o1"

  Scenario: An already CANCELLED order cannot be cancelled again
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    And the customer cancels order "o1" at "2026-06-15T12:05:00Z"
    When the customer cancels order "o1" at "2026-06-15T12:06:00Z"
    Then the command fails with reason "NOT_CANCELLABLE"
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And exactly 1 "OrderCancelled" events were emitted for "o1"

  Scenario: An unknown order cannot be cancelled
    When the customer cancels order "o9" at "2026-06-15T12:05:00Z"
    Then the command fails with reason "ORDER_NOT_FOUND"
    And the last call emitted no events
    And order "o9" is not found

  Scenario: A customer cancellation after the deadline but before tick is still CUSTOMER
    Given "c1" places order "o1" for 2 of "A" at amount 50 at "2026-06-15T12:00:00Z"
    When the customer cancels order "o1" at "2026-06-15T12:30:00Z"
    Then the command succeeds
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
