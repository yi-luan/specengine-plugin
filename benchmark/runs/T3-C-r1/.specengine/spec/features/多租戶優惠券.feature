Feature: 多租戶優惠券
  結帳呼叫端呼叫 applyCoupons，對同一租戶的訂單套用一張或多張優惠券，
  回傳折扣後金額、折扣總額與依傳入順序的實際套用優惠券代碼；失敗時整筆拒絕並回傳失敗原因。
  未另行指定時，優惠券有效期間為 2026-01-01T00:00:00Z 至 2026-12-31T23:59:59Z，且未設定最低消費金額。

  Background:
    Given 訂單屬租戶 "T1"
    And 結帳時間為 "2026-06-01T00:00:00Z"

  @rule:R-MULTI_TENANT_COUPON-000
  Rule: 主流程：單張固定金額折扣券成功套用
    Scenario: 固定金額折扣
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C1" 結帳
      Then 套用成功，折扣總額為 "100"，折扣後金額為 "900"
      And 實際套用的優惠券代碼依序為 "C1"

  @rule:R-MULTI_TENANT_COUPON-001
  Rule: 百分比折扣以折扣前的訂單金額計算
    Scenario: 百分比折扣
      Given 訂單金額為 "1000"
      And 有一張優惠券 "P10"：租戶 "T1"、類型 "PERCENT"、值 "10"、可疊加 "是"
      When 以優惠券 "P10" 結帳
      Then 套用成功，折扣總額為 "100"，折扣後金額為 "900"
      And 實際套用的優惠券代碼依序為 "P10"

  @rule:R-MULTI_TENANT_COUPON-002
  Rule: 優惠券只能用在同一租戶的訂單
    Scenario: 有一張券屬於別的租戶時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 有一張優惠券 "C-OTHER"：租戶 "T2"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C1,C-OTHER" 結帳
      Then 套用失敗，失敗原因為 "TENANT_MISMATCH"

  @rule:R-MULTI_TENANT_COUPON-003
  Rule: 優惠券只能在有效期間內使用
    Scenario Outline: 結帳時間在有效期間外時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 結帳時間為 "<now>"
      When 以優惠券 "C1" 結帳
      Then 套用失敗，失敗原因為 "COUPON_EXPIRED"

      Examples:
        | now                  |
        | 2025-12-31T23:59:59Z |
        | 2027-01-01T00:00:00Z |

  @rule:R-MULTI_TENANT_COUPON-004
  Rule: 不可疊加的優惠券一張訂單只能用一張
    Scenario: 兩張不可疊加券同時使用時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "NS-A"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "否"
      And 有一張優惠券 "NS-B"：租戶 "T1"、類型 "FIXED"、值 "50"、可疊加 "否"
      When 以優惠券 "NS-A,NS-B" 結帳
      Then 套用失敗，失敗原因為 "NOT_STACKABLE"

  @rule:R-MULTI_TENANT_COUPON-005
  Rule: 可疊加的優惠券可以多張同時使用
    Scenario: 百分比各自以原始金額計算後加總，再加上固定金額
      Given 訂單金額為 "1000"
      And 有一張優惠券 "P10"：租戶 "T1"、類型 "PERCENT"、值 "10"、可疊加 "是"
      And 有一張優惠券 "F100"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 有一張優惠券 "P5"：租戶 "T1"、類型 "PERCENT"、值 "5"、可疊加 "是"
      When 以優惠券 "P10,F100,P5" 結帳
      Then 套用成功，折扣總額為 "250"，折扣後金額為 "750"
      And 實際套用的優惠券代碼依序為 "P10,F100,P5"

  @rule:R-MULTI_TENANT_COUPON-006
  Rule: 折扣不得使訂單金額低於 0
    Scenario: 單張固定金額折扣超過訂單金額時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "F1500"：租戶 "T1"、類型 "FIXED"、值 "1500"、可疊加 "是"
      When 以優惠券 "F1500" 結帳
      Then 套用失敗，失敗原因為 "DISCOUNT_EXCEEDS_AMOUNT"

    Scenario: 多張可疊加券合計超過訂單金額時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "F600"：租戶 "T1"、類型 "FIXED"、值 "600"、可疊加 "是"
      And 有一張優惠券 "F500"：租戶 "T1"、類型 "FIXED"、值 "500"、可疊加 "是"
      When 以優惠券 "F600,F500" 結帳
      Then 套用失敗，失敗原因為 "DISCOUNT_EXCEEDS_AMOUNT"

  @rule:R-MULTI_TENANT_COUPON-007
  Rule: 折扣前訂單金額未達最低消費金額者不能使用該券
    Scenario Outline: 未達最低消費時整筆拒絕
      Given 訂單金額為 "<order_amount>"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "C1" 的最低消費金額為 "<min_order_amount>"
      When 以優惠券 "C1" 結帳
      Then 套用失敗，失敗原因為 "MIN_ORDER_NOT_MET"

      Examples:
        | order_amount | min_order_amount |
        | 1000         | 2000             |
        | 1000         | 1001             |

  @rule:R-MULTI_TENANT_COUPON-008
  Rule: 達到或剛好等於最低消費金額時可以使用
    Scenario Outline: 達到最低消費時成功套用
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "C1" 的最低消費金額為 "<min_order_amount>"
      When 以優惠券 "C1" 結帳
      Then 套用成功，折扣總額為 "100"，折扣後金額為 "900"
      And 實際套用的優惠券代碼依序為 "C1"

      Examples:
        | min_order_amount |
        | 500              |
        | 1000             |

  @rule:R-MULTI_TENANT_COUPON-009
  Rule: 不可疊加的優惠券可以單獨使用
    Scenario: 單張不可疊加券單獨使用
      Given 訂單金額為 "1000"
      And 有一張優惠券 "NS100"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "否"
      When 以優惠券 "NS100" 結帳
      Then 套用成功，折扣總額為 "100"，折扣後金額為 "900"
      And 實際套用的優惠券代碼依序為 "NS100"

  @rule:R-MULTI_TENANT_COUPON-010
  Rule: 有效期間含頭含尾
    Scenario Outline: 結帳時間剛好等於有效期間起或迄時仍有效
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "C1" 的有效期間為 "2026-01-01T00:00:00Z" 至 "2026-12-31T23:59:59Z"
      And 結帳時間為 "<now>"
      When 以優惠券 "C1" 結帳
      Then 套用成功，折扣總額為 "100"，折扣後金額為 "900"
      And 實際套用的優惠券代碼依序為 "C1"

      Examples:
        | now                  |
        | 2026-01-01T00:00:00Z |
        | 2026-12-31T23:59:59Z |

  @rule:R-MULTI_TENANT_COUPON-011
  Rule: 不可疊加的優惠券不得與其他券混用
    Scenario: 不可疊加券與可疊加券混用時整筆拒絕
      Given 訂單金額為 "1000"
      And 有一張優惠券 "NS100"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "否"
      And 有一張優惠券 "P10"：租戶 "T1"、類型 "PERCENT"、值 "10"、可疊加 "是"
      When 以優惠券 "NS100,P10" 結帳
      Then 套用失敗，失敗原因為 "NOT_STACKABLE"

  @rule:R-MULTI_TENANT_COUPON-012
  Rule: 同一張券重複傳入時整筆拒絕
    Scenario: 同一張券傳兩次
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C1,C1" 結帳
      Then 套用失敗，失敗原因為 "DUPLICATE_COUPON"

  @rule:R-MULTI_TENANT_COUPON-013
  Rule: 百分比折扣額各自無條件捨去取整數
    Scenario: 百分比算出小數時各自捨去後加總
      Given 訂單金額為 "333"
      And 有一張優惠券 "P10"：租戶 "T1"、類型 "PERCENT"、值 "10"、可疊加 "是"
      And 有一張優惠券 "P5"：租戶 "T1"、類型 "PERCENT"、值 "5"、可疊加 "是"
      When 以優惠券 "P10,P5" 結帳
      Then 套用成功，折扣總額為 "49"，折扣後金額為 "284"
      And 實際套用的優惠券代碼依序為 "P10,P5"

  @rule:R-MULTI_TENANT_COUPON-014
  Rule: 折扣總額剛好等於訂單金額時可以
    Scenario: 折扣後金額為 0
      Given 訂單金額為 "1000"
      And 有一張優惠券 "F1000"：租戶 "T1"、類型 "FIXED"、值 "1000"、可疊加 "是"
      When 以優惠券 "F1000" 結帳
      Then 套用成功，折扣總額為 "1000"，折扣後金額為 "0"
      And 實際套用的優惠券代碼依序為 "F1000"

  @rule:R-MULTI_TENANT_COUPON-015
  Rule: 訂單金額或結帳時間不合法時整筆拒絕
    Scenario Outline: 訂單金額不是正整數
      Given 訂單金額為 "<order_amount>"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C1" 結帳
      Then 套用失敗，失敗原因為 "INVALID_INPUT"

      Examples:
        | order_amount |
        | 0            |
        | -1           |
        | 100.5        |

    Scenario: 結帳時間不合法
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 結帳時間為 "not-a-date"
      When 以優惠券 "C1" 結帳
      Then 套用失敗，失敗原因為 "INVALID_INPUT"

  @rule:R-MULTI_TENANT_COUPON-016
  Rule: 沒傳任何券時成功且不折扣
    Scenario: 不使用任何優惠券
      Given 訂單金額為 "1000"
      When 不使用任何優惠券結帳
      Then 套用成功，折扣總額為 "0"，折扣後金額為 "1000"
      And 實際套用的優惠券代碼依序為 ""

  @rule:R-MULTI_TENANT_COUPON-017
  Rule: 優惠券設定不合法時整筆拒絕
    Scenario Outline: 折扣值不合法
      Given 訂單金額為 "1000"
      And 有一張優惠券 "BAD"：租戶 "T1"、類型 "<type>"、值 "<value>"、可疊加 "是"
      When 以優惠券 "BAD" 結帳
      Then 套用失敗，失敗原因為 "INVALID_COUPON"

      Examples:
        | type    | value |
        | PERCENT | 0     |
        | PERCENT | 101   |
        | PERCENT | 10.5  |
        | FIXED   | 0     |
        | FIXED   | -50   |
        | FIXED   | 10.5  |

    Scenario Outline: 有效期間不合法或顛倒
      Given 訂單金額為 "1000"
      And 有一張優惠券 "BAD"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "BAD" 的有效期間為 "<valid_from>" 至 "<valid_to>"
      When 以優惠券 "BAD" 結帳
      Then 套用失敗，失敗原因為 "INVALID_COUPON"

      Examples:
        | valid_from           | valid_to             |
        | abc                  | 2026-12-31T23:59:59Z |
        | 2026-01-01T00:00:00Z | abc                  |
        | 2026-12-31T23:59:59Z | 2026-01-01T00:00:00Z |

    Scenario Outline: 最低消費金額不合法
      Given 訂單金額為 "1000"
      And 有一張優惠券 "BAD"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "BAD" 的最低消費金額為 "<min_order_amount>"
      When 以優惠券 "BAD" 結帳
      Then 套用失敗，失敗原因為 "INVALID_COUPON"

      Examples:
        | min_order_amount |
        | -100             |
        | 99.5             |

  @rule:R-MULTI_TENANT_COUPON-018
  Rule: 多個錯誤同時發生時依固定順序回報第一個
    Scenario: 訂單金額不合法優先於租戶不符
      Given 訂單金額為 "0"
      And 有一張優惠券 "C-OTHER"：租戶 "T2"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C-OTHER" 結帳
      Then 套用失敗，失敗原因為 "INVALID_INPUT"

    Scenario: 券值不合法優先於租戶不符
      Given 訂單金額為 "1000"
      And 有一張優惠券 "BAD"：租戶 "T1"、類型 "PERCENT"、值 "101"、可疊加 "是"
      And 有一張優惠券 "C-OTHER"：租戶 "T2"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C-OTHER,BAD" 結帳
      Then 套用失敗，失敗原因為 "INVALID_COUPON"

    Scenario: 租戶不符優先於重複傳入
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 有一張優惠券 "C-OTHER"：租戶 "T2"、類型 "FIXED"、值 "100"、可疊加 "是"
      When 以優惠券 "C1,C1,C-OTHER" 結帳
      Then 套用失敗，失敗原因為 "TENANT_MISMATCH"

    Scenario: 重複傳入優先於期間外
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "C1" 的有效期間為 "2025-01-01T00:00:00Z" 至 "2025-12-31T23:59:59Z"
      When 以優惠券 "C1,C1" 結帳
      Then 套用失敗，失敗原因為 "DUPLICATE_COUPON"

    Scenario: 期間外優先於未達最低消費
      Given 訂單金額為 "1000"
      And 有一張優惠券 "C1"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "C1" 的最低消費金額為 "2000"
      And 有一張優惠券 "OLD"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "是"
      And 優惠券 "OLD" 的有效期間為 "2025-01-01T00:00:00Z" 至 "2025-12-31T23:59:59Z"
      When 以優惠券 "C1,OLD" 結帳
      Then 套用失敗，失敗原因為 "COUPON_EXPIRED"

    Scenario: 未達最低消費優先於不可疊加
      Given 訂單金額為 "1000"
      And 有一張優惠券 "NS-A"：租戶 "T1"、類型 "FIXED"、值 "100"、可疊加 "否"
      And 優惠券 "NS-A" 的最低消費金額為 "2000"
      And 有一張優惠券 "NS-B"：租戶 "T1"、類型 "FIXED"、值 "50"、可疊加 "否"
      When 以優惠券 "NS-A,NS-B" 結帳
      Then 套用失敗，失敗原因為 "MIN_ORDER_NOT_MET"

    Scenario: 不可疊加優先於折扣超過訂單金額
      Given 訂單金額為 "1000"
      And 有一張優惠券 "NS-A"：租戶 "T1"、類型 "FIXED"、值 "600"、可疊加 "否"
      And 有一張優惠券 "NS-B"：租戶 "T1"、類型 "FIXED"、值 "500"、可疊加 "否"
      When 以優惠券 "NS-A,NS-B" 結帳
      Then 套用失敗，失敗原因為 "NOT_STACKABLE"
