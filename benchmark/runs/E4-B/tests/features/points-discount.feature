Feature: Member points discount at checkout
  Members can pay part of an order with points at a rate of 1 point = 1 dollar.
  Points must be whole numbers, the discount may not exceed 35% of the order
  (rounded down; raised from 30% by change request E4), and a successful
  redemption deducts the points from the balance.
  Failures report exactly one fixed reason code, checked in the order
  INVALID_INPUT, INVALID_POINTS, INSUFFICIENT_POINTS, EXCEEDS_LIMIT.

  @US1
  Scenario Outline: Successful redemption
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses <points> points
    Then the redemption succeeds with amount payable <final> and remaining points <remaining>

    Examples:
      | order | balance | points | final | remaining |
      | 1000  | 500     | 200    | 800   | 300       |
      | 1000  | 500     | 350    | 650   | 150       |
      | 100   | 30      | 30     | 70    | 0         |

  @US2
  Scenario Outline: Redemption over the 35% cap is refused as a whole
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses <points> points
    Then the redemption fails with reason "EXCEEDS_LIMIT"

    Examples:
      | order | balance | points |
      | 1000  | 500     | 351    |
      | 1001  | 500     | 351    |
      | 10    | 10      | 4      |

  @US2
  Scenario Outline: Cap boundary and rounding down
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses <points> points
    Then the redemption succeeds with amount payable <final> and remaining points <remaining>

    Examples:
      | order | balance | points | final | remaining |
      | 1001  | 500     | 350    | 651   | 150       |
      | 10    | 10      | 3      | 7     | 7         |
      | 1     | 5       | 0      | 1     | 5         |
      | 1000  | 500     | 301    | 699   | 199       |

  @US2
  Scenario: Zero points is a successful no-op
    Given an order of 1000 dollars
    And a member with 500 points
    When the member uses 0 points
    Then the redemption succeeds with amount payable 1000 and remaining points 500

  @US3
  Scenario Outline: Insufficient balance is refused as a whole
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses <points> points
    Then the redemption fails with reason "INSUFFICIENT_POINTS"

    Examples:
      | order | balance | points |
      | 1000  | 100     | 150    |
      | 1000  | 0       | 1      |

  @US3
  Scenario Outline: Invalid points quantity is refused
    Given an order of 1000 dollars
    And a member with 500 points
    When the member uses <points> points
    Then the redemption fails with reason "INVALID_POINTS"

    Examples:
      | points |
      | 10.5   |
      | -5     |
      | -0.5   |

  @US3
  Scenario Outline: Invalid order amount or balance is refused
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses 10 points
    Then the redemption fails with reason "INVALID_INPUT"

    Examples:
      | order  | balance |
      | 0      | 500     |
      | -100   | 500     |
      | 1000.5 | 500     |
      | 1000   | -1      |
      | 1000   | 10.5    |

  @US3
  Scenario Outline: First violated rule in the fixed order is reported
    Given an order of <order> dollars
    And a member with <balance> points
    When the member uses <points> points
    Then the redemption fails with reason "<reason>"

    Examples:
      | order | balance | points | reason              |
      | 0     | 500     | 10.5   | INVALID_INPUT       |
      | -5    | -5      | -5     | INVALID_INPUT       |
      | 1000  | 100     | 150.5  | INVALID_POINTS      |
      | 100   | 10      | 50     | INSUFFICIENT_POINTS |
      | 100   | 100     | 50     | EXCEEDS_LIMIT       |

  @US3
  Scenario: Failure result carries no amount or points
    Given an order of 1000 dollars
    And a member with 500 points
    When the member uses 351 points
    Then the redemption fails with reason "EXCEEDS_LIMIT"
    And the result carries no amount or points
