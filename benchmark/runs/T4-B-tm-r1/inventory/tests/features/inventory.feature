Feature: Inventory service reserves and releases stock
  The inventory service reserves stock when an order is placed, returns it when the order fails
  or is cancelled, and stays correct when the event bus delivers events twice or out of order.

  Background:
    Given the inventory service starts with:
      | sku | qty |
      | A   | 10  |
      | B   | 2   |
      | C   | 5   |

  # ---------------------------------------------------------------- User Story 1 (FR-001..003)

  @us1
  Scenario: Reserve stock when the quantity is available
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    Then the service emits exactly one "StockReserved" for order "O1"
    And available stock for "A" is 7

  @us1
  Scenario: Reject the order when stock is insufficient
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "B" and qty 3
    Then the service emits exactly one "StockRejected" for order "O1"
    And available stock for "B" is 2

  @us1
  Scenario: Reserve the exact remaining quantity
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "B" and qty 2
    Then the service emits exactly one "StockReserved" for order "O1"
    And available stock for "B" is 0

  @us1
  Scenario: Reject an order for a SKU that is not in stock
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "Z" and qty 1
    Then the service emits exactly one "StockRejected" for order "O1"
    And available stock for "Z" is 0

  @us1
  Scenario: Two orders compete for the same SKU in arrival order
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "C" and qty 3
    Then the service emits exactly one "StockReserved" for order "O1"
    And available stock for "C" is 2
    When the service handles an OrderPlaced event "e2" for order "O2" with sku "C" and qty 3
    Then the service emits exactly one "StockRejected" for order "O2"
    And available stock for "C" is 2

  @us1
  Scenario: Reject an order with quantity zero
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 0
    Then the service emits exactly one "StockRejected" for order "O1"
    And available stock for "A" is 10

  @us1
  Scenario: Reject an order with a negative quantity
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty -1
    Then the service emits exactly one "StockRejected" for order "O1"
    And available stock for "A" is 10

  # ---------------------------------------------------------------- User Story 2 (FR-004..006)

  @us2
  Scenario: Release reserved stock when payment fails
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "PaymentFailed" event "e2" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    And available stock for "A" is 10

  @us2
  Scenario: Release reserved stock when the order is cancelled
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "OrderCancelled" event "e2" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    And available stock for "A" is 10

  @us2
  Scenario: Cancelling a rejected order changes nothing
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "B" and qty 3
    And the service handles a "OrderCancelled" event "e2" for order "O1"
    Then the service emits nothing
    And available stock for "B" is 2

  @us2
  Scenario: Payment failure on a rejected order changes nothing
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "B" and qty 3
    And the service handles a "PaymentFailed" event "e2" for order "O1"
    Then the service emits nothing
    And available stock for "B" is 2

  @us2
  Scenario: A reservation is returned only once
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "PaymentFailed" event "e2" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    When the service handles a "OrderCancelled" event "e3" for order "O1"
    Then the service emits nothing
    And available stock for "A" is 10

  @us2
  Scenario: Cancelling a paid order still returns its reserved stock
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "PaymentSucceeded" event "e2" for order "O1"
    And the service handles a "OrderCancelled" event "e3" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    And available stock for "A" is 10

  # ---------------------------------------------------------------- User Story 3 (FR-007..009)

  @us3
  Scenario: A redelivered OrderPlaced is ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    Then the service emits exactly one "StockReserved" for order "O1"
    When the same event is delivered again
    Then the service emits nothing
    And available stock for "A" is 7

  @us3
  Scenario: A redelivered PaymentFailed is ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "PaymentFailed" event "e2" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    When the same event is delivered again
    Then the service emits nothing
    And available stock for "A" is 10

  @us3
  Scenario: A redelivered OrderCancelled is ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "OrderCancelled" event "e2" for order "O1"
    Then the service emits exactly one "StockReleased" for order "O1"
    When the same event is delivered again
    Then the service emits nothing
    And available stock for "A" is 10

  @us3
  Scenario: A cancellation that arrives before the order is remembered
    When the service handles a "OrderCancelled" event "e2" for order "O1"
    Then the service emits nothing
    And available stock for "A" is 10
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    Then the service emits nothing
    And available stock for "A" is 10

  @us3
  Scenario: A payment failure that arrives before the order is remembered
    When the service handles a "PaymentFailed" event "e2" for order "O1"
    Then the service emits nothing
    And available stock for "A" is 10
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    Then the service emits nothing
    And available stock for "A" is 10

  @us3
  Scenario: A second OrderPlaced for the same order with a new id is ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    Then the service emits exactly one "StockReserved" for order "O1"
    When the service handles an OrderPlaced event "e9" for order "O1" with sku "A" and qty 3
    Then the service emits nothing
    And available stock for "A" is 7

  @us3
  Scenario: A second OrderPlaced for a rejected order with a new id is ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "B" and qty 3
    Then the service emits exactly one "StockRejected" for order "O1"
    When the service handles an OrderPlaced event "e9" for order "O1" with sku "B" and qty 1
    Then the service emits nothing
    And available stock for "B" is 2

  @us3
  Scenario: Other orders are unaffected by a terminated order
    When the service handles a "OrderCancelled" event "e2" for order "O1"
    And the service handles an OrderPlaced event "e3" for order "O2" with sku "A" and qty 4
    Then the service emits exactly one "StockReserved" for order "O2"
    And available stock for "A" is 6

  # ---------------------------------------------------------------- User Story 4 (FR-010)

  @us4
  Scenario Outline: Events that are not the inventory's concern are ignored
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "<type>" event "e2" for order "O1"
    Then the service emits nothing
    And available stock for "A" is 7

    Examples:
      | type             |
      | PaymentSucceeded |
      | PaymentRefunded  |
      | StockReserved    |
      | StockRejected    |
      | StockReleased    |

  # ---------------------------------------------------------------- Event ids (FR-011)

  @ids
  Scenario: Emitted event ids are unique and deterministic
    When the service handles an OrderPlaced event "e1" for order "O1" with sku "A" and qty 3
    And the service handles a "PaymentFailed" event "e2" for order "O1"
    And the service handles an OrderPlaced event "e3" for order "O2" with sku "B" and qty 5
    And the service handles an OrderPlaced event "e4" for order "O3" with sku "A" and qty 1
    And the service handles a "OrderCancelled" event "e5" for order "O3"
    Then every emitted event id is unique and follows the inventory id scheme
    And available stock for "A" is 10
