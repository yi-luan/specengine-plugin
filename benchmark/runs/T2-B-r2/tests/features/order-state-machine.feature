Feature: Order state machine
  As a shop operator
  I want orders to move through created, paid, shipped, cancelled and refunded states
  So that payments, cancellations and refunds are handled consistently

  # ---------------------------------------------------------------------------
  # User Story 1 - Create and pay for an order (FR-001..FR-004, FR-012..FR-015, FR-017)
  # ---------------------------------------------------------------------------

  @us1
  Scenario: Create an order with a positive amount
    When I create an order "o-1" with amount 100
    Then the operation succeeds
    And the order status is CREATED
    And the order amount is 100
    And the paid amount is 0
    And the refunded amount is 0

  @us1
  Scenario Outline: Create an order with an invalid amount
    When I create an order "o-1" with amount <amount>
    Then the operation fails with reason "INVALID_AMOUNT"

    Examples:
      | amount |
      | 0      |
      | -1     |
      | 10.5   |
      | NaN    |

  @us1
  Scenario: Create an order with an empty identifier
    When I create an order "" with amount 100
    Then the operation succeeds
    And the order status is CREATED

  @us1
  Scenario: Pay exactly the order amount
    Given an order "o-1" with amount 100 in status CREATED
    When I pay 100
    Then the operation succeeds
    And the order status is PAID
    And the order amount is 100
    And the paid amount is 100
    And the refunded amount is 0
    And the returned order is a new object
    And the input order is unchanged

  @us1
  Scenario Outline: Pay an amount different from the order amount
    Given an order "o-1" with amount 100 in status CREATED
    When I pay <amount>
    Then the operation fails with reason "AMOUNT_MISMATCH"
    And the input order is unchanged
    And the order status is CREATED
    And the paid amount is 0

    Examples:
      | amount |
      | 99     |
      | 101    |

  @us1
  Scenario Outline: Pay an invalid amount
    Given an order "o-1" with amount 100 in status CREATED
    When I pay <amount>
    Then the operation fails with reason "INVALID_AMOUNT"
    And the input order is unchanged

    Examples:
      | amount |
      | 0      |
      | -5     |
      | 50.5   |

  @us1
  Scenario Outline: Pay an order that is not in CREATED state
    Given an order "o-1" with amount 100 in status <status>
    When I pay 100
    Then the operation fails with reason "INVALID_TRANSITION"
    And the input order is unchanged

    Examples:
      | status    |
      | PAID      |
      | SHIPPED   |
      | CANCELLED |
      | REFUNDED  |

  @us1
  Scenario: State is checked before the amount when paying
    Given an order "o-1" with amount 100 in status CANCELLED
    When I pay -5
    Then the operation fails with reason "INVALID_TRANSITION"

  # ---------------------------------------------------------------------------
  # User Story 2 - Ship a paid order and cancel before shipping (FR-005..FR-007, FR-016)
  # ---------------------------------------------------------------------------

  @us2
  Scenario: Ship a paid order
    Given an order "o-1" with amount 100 in status PAID
    When I ship the order
    Then the operation succeeds
    And the order status is SHIPPED
    And the order amount is 100
    And the paid amount is 100
    And the refunded amount is 0
    And the returned order is a new object
    And the input order is unchanged

  @us2
  Scenario Outline: Ship an order that is not in PAID state
    Given an order "o-1" with amount 100 in status <status>
    When I ship the order
    Then the operation fails with reason "INVALID_TRANSITION"
    And the input order is unchanged
    And the order status is <status>

    Examples:
      | status    |
      | CREATED   |
      | SHIPPED   |
      | CANCELLED |
      | REFUNDED  |

  @us2
  Scenario: Cancel an order that has not been paid
    Given an order "o-1" with amount 100 in status CREATED
    When I cancel the order
    Then the operation succeeds
    And the order status is CANCELLED
    And the paid amount is 0
    And the refunded amount is 0
    And the returned order is a new object
    And the input order is unchanged

  @us2
  Scenario: Cancel a paid order refunds the full paid amount
    Given an order "o-1" with amount 100 in status PAID
    When I cancel the order
    Then the operation succeeds
    And the order status is CANCELLED
    And the paid amount is 100
    And the refunded amount is 100
    And the returned order is a new object
    And the input order is unchanged

  @us2
  Scenario Outline: Cancel an order that is shipped or already closed
    Given an order "o-1" with amount 100 in status <status>
    When I cancel the order
    Then the operation fails with reason "INVALID_TRANSITION"
    And the input order is unchanged
    And the order status is <status>

    Examples:
      | status    |
      | SHIPPED   |
      | CANCELLED |
      | REFUNDED  |

  # ---------------------------------------------------------------------------
  # User Story 3 - Refund a shipped order in instalments (FR-008..FR-012, FR-016)
  # ---------------------------------------------------------------------------

  @us3
  Scenario: Partial refund keeps the order shipped
    Given an order "o-1" with amount 100 in status SHIPPED
    When I refund 30
    Then the operation succeeds
    And the order status is SHIPPED
    And the paid amount is 100
    And the refunded amount is 30
    And the returned order is a new object
    And the input order is unchanged

  @us3
  Scenario: Refund reaching the paid amount marks the order refunded
    Given an order "o-1" with amount 100 in status SHIPPED
    And it already has 30 refunded
    When I refund 70
    Then the operation succeeds
    And the order status is REFUNDED
    And the paid amount is 100
    And the refunded amount is 100

  @us3
  Scenario: Full refund in one go
    Given an order "o-1" with amount 100 in status SHIPPED
    When I refund 100
    Then the operation succeeds
    And the order status is REFUNDED
    And the refunded amount is 100

  @us3
  Scenario: Refund exceeding the remaining balance is rejected as a whole
    Given an order "o-1" with amount 100 in status SHIPPED
    And it already has 30 refunded
    When I refund 71
    Then the operation fails with reason "REFUND_EXCEEDS_PAID"
    And the input order is unchanged
    And the order status is SHIPPED
    And the refunded amount is 30

  @us3
  Scenario: Refund larger than the paid amount is rejected
    Given an order "o-1" with amount 100 in status SHIPPED
    When I refund 101
    Then the operation fails with reason "REFUND_EXCEEDS_PAID"
    And the refunded amount is 0

  @us3
  Scenario Outline: Refund an invalid amount
    Given an order "o-1" with amount 100 in status SHIPPED
    When I refund <amount>
    Then the operation fails with reason "INVALID_AMOUNT"
    And the input order is unchanged

    Examples:
      | amount |
      | 0      |
      | -10    |
      | 2.5    |

  @us3
  Scenario Outline: Refund an order that is not shipped
    Given an order "o-1" with amount 100 in status <status>
    When I refund 10
    Then the operation fails with reason "INVALID_TRANSITION"
    And the input order is unchanged
    And the order status is <status>

    Examples:
      | status    |
      | CREATED   |
      | PAID      |
      | CANCELLED |
      | REFUNDED  |

  @us3
  Scenario: State is checked before the amount when refunding
    Given an order "o-1" with amount 100 in status CANCELLED
    When I refund -5
    Then the operation fails with reason "INVALID_TRANSITION"

  @us3
  Scenario: Full lifecycle from creation to refund in two instalments
    When I create an order "o-9" with amount 100
    Then the operation succeeds
    And the order status is CREATED
    When I pay 100
    Then the operation succeeds
    And the order status is PAID
    When I ship the order
    Then the operation succeeds
    And the order status is SHIPPED
    When I refund 40
    Then the operation succeeds
    And the order status is SHIPPED
    And the refunded amount is 40
    When I refund 60
    Then the operation succeeds
    And the order status is REFUNDED
    And the refunded amount is 100
    And the paid amount is 100
