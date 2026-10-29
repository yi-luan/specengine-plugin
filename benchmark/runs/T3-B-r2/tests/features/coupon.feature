Feature: Multi-tenant coupon application
  applyCoupons validates a checkout request against the coupon rules in a fixed
  precedence order and returns either the discounted totals or a reason code.
  Spec: specs/001-multi-tenant-coupons/spec.md

  Background:
    Given the order is for tenant "A"
    And the checkout time is "2026-06-15T12:00:00Z"

  # ---------------------------------------------------------------- US1
  @US1
  Scenario: FR-003 FR-009 single PERCENT coupon reduces the order
    Given the order amount is 1000
    And a stackable PERCENT coupon "P10" with value 10
    When the coupons are applied
    Then the result is successful with final amount 900, discount 100 and applied codes "P10"

  @US1
  Scenario: FR-002 FR-009 single FIXED coupon reduces the order
    Given the order amount is 300
    And a stackable FIXED coupon "F50" with value 50
    When the coupons are applied
    Then the result is successful with final amount 250, discount 50 and applied codes "F50"

  @US1
  Scenario: FR-013 no coupons is a successful no-op
    Given the order amount is 300
    When the coupons are applied
    Then the result is successful with final amount 300, discount 0 and applied codes ""

  @US1
  Scenario: FR-011 FR-014 percent discount is rounded down to a whole unit
    Given the order amount is 333
    And a stackable PERCENT coupon "P15" with value 15
    When the coupons are applied
    Then the result is successful with final amount 284, discount 49 and applied codes "P15"

  @US1
  Scenario: FR-003 100 percent coupon discounts the whole order
    Given the order amount is 500
    And a stackable PERCENT coupon "P100" with value 100
    When the coupons are applied
    Then the result is successful with final amount 0, discount 500 and applied codes "P100"

  # ---------------------------------------------------------------- US2
  @US2
  Scenario: FR-001 FR-010 coupon of another tenant is rejected with a fixed reason code
    Given the order amount is 1000
    And a coupon "X" of tenant "B" type PERCENT value 10 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "TENANT_MISMATCH"

  @US2
  Scenario: FR-004 coupon after its validity window is rejected
    Given the order amount is 1000
    And the checkout time is "2026-03-01T00:00:00Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "COUPON_EXPIRED"

  @US2
  Scenario: FR-004 coupon before its validity window is rejected with the same reason
    Given the order amount is 1000
    And the checkout time is "2026-01-31T23:59:59Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "COUPON_EXPIRED"

  @US2
  Scenario: FR-004 checkout exactly at validFrom is valid
    Given the order amount is 1000
    And the checkout time is "2026-02-01T00:00:00Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    When the coupons are applied
    Then the result is successful with final amount 900, discount 100 and applied codes "Y"

  @US2
  Scenario: FR-004 checkout exactly at validTo is valid
    Given the order amount is 1000
    And the checkout time is "2026-02-28T23:59:59Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    When the coupons are applied
    Then the result is successful with final amount 900, discount 100 and applied codes "Y"

  @US2
  Scenario: FR-005 order below minimum spend is rejected
    Given the order amount is 499
    And a stackable FIXED coupon "Z" with value 50 and minimum order 500
    When the coupons are applied
    Then the result fails with reason "MIN_ORDER_NOT_MET"

  @US2
  Scenario: FR-005 order equal to minimum spend qualifies
    Given the order amount is 500
    And a stackable FIXED coupon "Z" with value 50 and minimum order 500
    When the coupons are applied
    Then the result is successful with final amount 450, discount 50 and applied codes "Z"

  @US2
  Scenario: FR-005 minimum spend is judged on the pre-discount amount
    Given the order amount is 500
    And a stackable FIXED coupon "F100" with value 100
    And a stackable FIXED coupon "Z" with value 50 and minimum order 500
    When the coupons are applied
    Then the result is successful with final amount 350, discount 150 and applied codes "F100,Z"

  @US2
  Scenario: FR-015 one disqualified coupon rejects the whole checkout
    Given the order amount is 1000
    And a stackable PERCENT coupon "P10" with value 10
    And a coupon "X" of tenant "B" type PERCENT value 10 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "TENANT_MISMATCH"

  # ---------------------------------------------------------------- US3
  @US3
  Scenario: FR-003 FR-006 two stackable percent coupons are each computed on the original amount
    Given the order amount is 1000
    And a stackable PERCENT coupon "S10" with value 10
    And a stackable PERCENT coupon "S5" with value 5
    When the coupons are applied
    Then the result is successful with final amount 850, discount 150 and applied codes "S10,S5"

  @US3
  Scenario: FR-006 FR-009 FR-014 stackable fixed and percent coupons sum and keep input order
    Given the order amount is 1000
    And a stackable FIXED coupon "SF30" with value 30
    And a stackable PERCENT coupon "S10" with value 10
    When the coupons are applied
    Then the result is successful with final amount 870, discount 130 and applied codes "SF30,S10"

  @US3
  Scenario: FR-007 two non-stackable coupons are rejected
    Given the order amount is 1000
    And a non-stackable PERCENT coupon "N20" with value 20
    And a non-stackable PERCENT coupon "N30" with value 30
    When the coupons are applied
    Then the result fails with reason "NOT_STACKABLE"

  @US3
  Scenario: FR-007 a non-stackable coupon mixed with a stackable one is rejected
    Given the order amount is 1000
    And a non-stackable PERCENT coupon "N20" with value 20
    And a stackable PERCENT coupon "S10" with value 10
    When the coupons are applied
    Then the result fails with reason "NOT_STACKABLE"

  @US3
  Scenario: FR-007 a single non-stackable coupon alone is accepted
    Given the order amount is 1000
    And a non-stackable PERCENT coupon "N20" with value 20
    When the coupons are applied
    Then the result is successful with final amount 800, discount 200 and applied codes "N20"

  @US3
  Scenario: FR-012 the same coupon presented twice is rejected
    Given the order amount is 1000
    And a stackable PERCENT coupon "S10" with value 10
    And the coupon "S10" is presented again
    When the coupons are applied
    Then the result fails with reason "DUPLICATE_COUPON"

  @US3
  Scenario: FR-001 FR-012 same code under another tenant is a tenant mismatch, not a duplicate
    Given the order amount is 1000
    And a stackable PERCENT coupon "S10" with value 10
    And a coupon "S10" of tenant "B" type PERCENT value 10 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "TENANT_MISMATCH"

  # ---------------------------------------------------------------- US4
  @US4
  Scenario: FR-008 fixed discount larger than the order is rejected
    Given the order amount is 100
    And a stackable FIXED coupon "F150" with value 150
    When the coupons are applied
    Then the result fails with reason "DISCOUNT_EXCEEDS_AMOUNT"

  @US4
  Scenario: FR-008 fixed discount equal to the order yields zero
    Given the order amount is 100
    And a stackable FIXED coupon "F100" with value 100
    When the coupons are applied
    Then the result is successful with final amount 0, discount 100 and applied codes "F100"

  @US4
  Scenario: FR-008 stacked fixed discounts exceeding the order are rejected
    Given the order amount is 100
    And a stackable FIXED coupon "F60" with value 60
    And a stackable FIXED coupon "F50" with value 50
    When the coupons are applied
    Then the result fails with reason "DISCOUNT_EXCEEDS_AMOUNT"

  @US4
  Scenario: FR-008 stacked percent and fixed discounts summing to the order yield zero
    Given the order amount is 100
    And a stackable PERCENT coupon "P50" with value 50
    And a stackable FIXED coupon "F50" with value 50
    When the coupons are applied
    Then the result is successful with final amount 0, discount 100 and applied codes "P50,F50"

  # ---------------------------------------------------------------- US5
  @US5
  Scenario Outline: FR-016 invalid order amount is rejected
    Given the order amount is <amount>
    And a stackable PERCENT coupon "P10" with value 10
    When the coupons are applied
    Then the result fails with reason "INVALID_INPUT"

    Examples:
      | amount |
      | 0      |
      | -1     |
      | 10.5   |

  @US5
  Scenario Outline: FR-017 invalid coupon value is rejected
    Given the order amount is 1000
    And a stackable <type> coupon "C" with value <value>
    When the coupons are applied
    Then the result fails with reason "INVALID_COUPON"

    Examples:
      | type    | value |
      | PERCENT | 0     |
      | PERCENT | 101   |
      | PERCENT | 10.5  |
      | FIXED   | 0     |
      | FIXED   | -5    |
      | FIXED   | 10.5  |

  @US5
  Scenario: FR-018 invalid input wins over tenant mismatch
    Given the order amount is 0
    And a coupon "X" of tenant "B" type PERCENT value 10 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "INVALID_INPUT"

  @US5
  Scenario: FR-018 invalid coupon wins over tenant mismatch
    Given the order amount is 1000
    And a coupon "X" of tenant "B" type PERCENT value 101 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "INVALID_COUPON"

  @US5
  Scenario: FR-018 tenant mismatch wins over an earlier expired coupon
    Given the order amount is 1000
    And the checkout time is "2026-03-01T00:00:00Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    And a coupon "X" of tenant "B" type PERCENT value 10 valid from "2026-01-01T00:00:00Z" to "2026-12-31T23:59:59Z" stackable true
    When the coupons are applied
    Then the result fails with reason "TENANT_MISMATCH"

  @US5
  Scenario: FR-018 duplicate wins over expired
    Given the order amount is 1000
    And the checkout time is "2026-03-01T00:00:00Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable true
    And the coupon "Y" is presented again
    When the coupons are applied
    Then the result fails with reason "DUPLICATE_COUPON"

  @US5
  Scenario: FR-018 expired wins over stacking conflict
    Given the order amount is 1000
    And the checkout time is "2026-03-01T00:00:00Z"
    And a coupon "Y" of tenant "A" type PERCENT value 10 valid from "2026-02-01T00:00:00Z" to "2026-02-28T23:59:59Z" stackable false
    And a non-stackable PERCENT coupon "N20" with value 20
    When the coupons are applied
    Then the result fails with reason "COUPON_EXPIRED"

  @US5
  Scenario: FR-018 minimum spend wins over stacking conflict
    Given the order amount is 400
    And a non-stackable FIXED coupon "Z" with value 50 and minimum order 500
    And a non-stackable PERCENT coupon "N20" with value 20
    When the coupons are applied
    Then the result fails with reason "MIN_ORDER_NOT_MET"

  @US5
  Scenario: FR-018 stacking conflict wins over excessive discount
    Given the order amount is 100
    And a non-stackable FIXED coupon "F150" with value 150
    And a stackable FIXED coupon "F50" with value 50
    When the coupons are applied
    Then the result fails with reason "NOT_STACKABLE"

  @US5
  Scenario: FR-017 coupon with a non-integer minimum order is rejected
    Given the order amount is 1000
    And a stackable FIXED coupon "Z" with value 50 and minimum order 499.5
    When the coupons are applied
    Then the result fails with reason "INVALID_COUPON"
