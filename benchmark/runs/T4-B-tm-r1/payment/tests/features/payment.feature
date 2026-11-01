Feature: Payment service
  The payment service charges a customer once stock has been reserved for an order,
  refunds the charge when the order is cancelled, and stays correct when the event bus
  delivers events more than once or out of order.

  Background:
    Given a payment service with balances:
      | customer | balance |
      | alice    | 100     |
      | bob      | 50      |
      | carol    | 60      |

  # ---------------------------------------------------------------------------
  # US1 - Charge the customer once stock is reserved
  # ---------------------------------------------------------------------------

  Scenario: Sufficient balance is charged and PaymentSucceeded is emitted
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    Then exactly one PaymentSucceeded is emitted for order "o1" with amount 60
    And customer "alice" now has balance 40

  Scenario: Insufficient balance leaves the balance untouched and emits PaymentFailed
    When the service receives OrderPlaced for order "o2" by customer "bob" amount 60
    And the service receives StockReserved for order "o2"
    Then exactly one PaymentFailed is emitted for order "o2"
    And customer "bob" now has balance 50

  Scenario: A balance exactly equal to the amount is sufficient
    When the service receives OrderPlaced for order "o3" by customer "carol" amount 60
    And the service receives StockReserved for order "o3"
    Then exactly one PaymentSucceeded is emitted for order "o3" with amount 60
    And customer "carol" now has balance 0

  Scenario: An order with amount 0 always succeeds
    When the service receives OrderPlaced for order "o4" by customer "bob" amount 0
    And the service receives StockReserved for order "o4"
    Then exactly one PaymentSucceeded is emitted for order "o4" with amount 0
    And customer "bob" now has balance 50

  Scenario: An unknown customer has balance 0 and cannot be charged
    When the service receives OrderPlaced for order "o5" by customer "dave" amount 10
    And the service receives StockReserved for order "o5"
    Then exactly one PaymentFailed is emitted for order "o5"
    And customer "dave" now has balance 0

  Scenario: OrderPlaced alone emits nothing and changes no balance
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    Then no event is emitted
    And customer "alice" now has balance 100

  Scenario Outline: Event types the service does not act on are ignored
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives <type> for order "o1"
    Then no event is emitted
    And customer "alice" now has balance 100

    Examples:
      | type             |
      | StockRejected    |
      | StockReleased    |
      | PaymentSucceeded |
      | PaymentFailed    |
      | PaymentRefunded  |

  Scenario: Several orders of one customer draw on the same balance in arrival order
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives OrderPlaced for order "o6" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    Then exactly one PaymentSucceeded is emitted for order "o1" with amount 60
    When the service receives StockReserved for order "o6"
    Then exactly one PaymentFailed is emitted for order "o6"
    And customer "alice" now has balance 40

  # ---------------------------------------------------------------------------
  # US2 - Refund when an order is cancelled
  # ---------------------------------------------------------------------------

  Scenario: Cancelling a charged order refunds the full amount once
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderCancelled for order "o1"
    Then exactly one PaymentRefunded is emitted for order "o1" with amount 60
    And customer "alice" now has balance 100

  Scenario: Cancelling an order whose charge failed emits nothing
    When the service receives OrderPlaced for order "o2" by customer "bob" amount 60
    And the service receives StockReserved for order "o2"
    And the service receives OrderCancelled for order "o2"
    Then no event is emitted
    And customer "bob" now has balance 50

  Scenario: Cancelling before any reservation emits nothing and a later reservation does not charge
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives OrderCancelled for order "o1"
    Then no event is emitted
    When the service receives StockReserved for order "o1"
    Then no event is emitted
    And customer "alice" now has balance 100

  Scenario: A cancellation that arrives before the order details blocks the charge
    When the service receives OrderCancelled for order "o1"
    Then no event is emitted
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    Then no event is emitted
    When the service receives StockReserved for order "o1"
    Then no event is emitted
    And customer "alice" now has balance 100

  Scenario: A refund restores exactly what was charged
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderPlaced for order "o1" by customer "alice" amount 90
    Then no event is emitted
    When the service receives OrderCancelled for order "o1"
    Then exactly one PaymentRefunded is emitted for order "o1" with amount 60
    And customer "alice" now has balance 100

  Scenario: A second cancellation after a refund does nothing
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderCancelled for order "o1"
    And the service receives OrderCancelled for order "o1"
    Then no event is emitted
    And customer "alice" now has balance 100
    And 2 events were emitted in total for order "o1"

  # ---------------------------------------------------------------------------
  # US3 - Duplicate and out-of-order delivery
  # ---------------------------------------------------------------------------

  Scenario: A redelivered StockReserved after a successful charge is ignored
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the same StockReserved event for order "o1" is delivered again
    Then no event is emitted
    And customer "alice" now has balance 40
    And 1 events were emitted in total for order "o1"

  Scenario: A redelivered OrderCancelled after a refund is ignored
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderCancelled for order "o1"
    And the same OrderCancelled event for order "o1" is delivered again
    Then no event is emitted
    And customer "alice" now has balance 100
    And 2 events were emitted in total for order "o1"

  Scenario: A redelivered StockReserved after charge and refund does not charge again
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderCancelled for order "o1"
    And the same StockReserved event for order "o1" is delivered again
    Then no event is emitted
    And customer "alice" now has balance 100
    And 2 events were emitted in total for order "o1"

  Scenario: A redelivered StockReserved after a failed charge is ignored even once the balance would suffice
    When the service receives OrderPlaced for order "o7" by customer "bob" amount 10
    And the service receives StockReserved for order "o7"
    Then exactly one PaymentSucceeded is emitted for order "o7" with amount 10
    When the service receives OrderPlaced for order "o2" by customer "bob" amount 45
    And the service receives StockReserved for order "o2"
    Then exactly one PaymentFailed is emitted for order "o2"
    When the service receives OrderCancelled for order "o7"
    Then customer "bob" now has balance 50
    When the same StockReserved event for order "o2" is delivered again
    Then no event is emitted
    And customer "bob" now has balance 50

  Scenario: A fresh StockReserved after a failed charge does not retry the charge
    When the service receives OrderPlaced for order "o7" by customer "bob" amount 10
    And the service receives StockReserved for order "o7"
    And the service receives OrderPlaced for order "o2" by customer "bob" amount 45
    And the service receives StockReserved for order "o2"
    And the service receives OrderCancelled for order "o7"
    Then customer "bob" now has balance 50
    When the service receives StockReserved for order "o2"
    Then no event is emitted
    And customer "bob" now has balance 50
    And 1 events were emitted in total for order "o2"

  Scenario: A duplicate OrderPlaced with a different amount does not change the stored details
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives OrderPlaced for order "o1" by customer "alice" amount 90
    Then no event is emitted
    When the service receives StockReserved for order "o1"
    Then exactly one PaymentSucceeded is emitted for order "o1" with amount 60
    And customer "alice" now has balance 40

  Scenario: A reservation that arrives before the order details is charged when the details arrive
    When the service receives StockReserved for order "o1"
    Then no event is emitted
    And customer "alice" now has balance 100
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    Then exactly one PaymentSucceeded is emitted for order "o1" with amount 60
    And customer "alice" now has balance 40

  Scenario: A reservation that arrives before the details fails when the balance is insufficient
    When the service receives StockReserved for order "o2"
    Then no event is emitted
    When the service receives OrderPlaced for order "o2" by customer "bob" amount 60
    Then exactly one PaymentFailed is emitted for order "o2"
    And customer "bob" now has balance 50

  Scenario: Reservation, then cancellation, then order details never charges
    When the service receives StockReserved for order "o1"
    Then no event is emitted
    When the service receives OrderCancelled for order "o1"
    Then no event is emitted
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    Then no event is emitted
    And customer "alice" now has balance 100

  Scenario: A redelivered event of an ignored type is still ignored
    When the service receives StockRejected for order "o1"
    And the same StockRejected event for order "o1" is delivered again
    Then no event is emitted
    And customer "alice" now has balance 100

  Scenario: Every emitted event carries a unique id
    When the service receives OrderPlaced for order "o1" by customer "alice" amount 60
    And the service receives StockReserved for order "o1"
    And the service receives OrderCancelled for order "o1"
    And the service receives OrderPlaced for order "o8" by customer "alice" amount 10
    And the service receives StockReserved for order "o8"
    And the service receives OrderPlaced for order "o2" by customer "bob" amount 60
    And the service receives StockReserved for order "o2"
    Then all emitted event ids are unique
    And 2 events were emitted in total for order "o1"
    And 1 events were emitted in total for order "o8"
    And 1 events were emitted in total for order "o2"
    And customer "alice" now has balance 90
    And customer "bob" now has balance 50
