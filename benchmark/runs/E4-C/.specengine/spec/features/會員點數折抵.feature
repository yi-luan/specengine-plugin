Feature: 會員點數折抵
  會員結帳時可以用點數折抵現金，1 點折抵 1 元；折抵點數必須是整數，折抵金額不得超過訂單金額的 35%（上限為訂單金額 × 35% 無條件捨去取整）。
  折抵成功回傳折抵後的應付金額與剩餘點數；不成功回傳固定代碼的失敗原因。

  @rule:R-POINTS_REDEMPTION-000
  Rule: 主流程：以整數點數折抵訂單金額
    Scenario: 正常折抵
      Given 會員點數餘額為 "500"
      And 訂單金額為 "1000"
      When 會員輸入折抵點數 "200"
      Then 折抵結果為 "成功"
      And 應付金額為 "800"
      And 剩餘點數為 "300"

  @rule:R-POINTS_REDEMPTION-001
  Rule: 折抵點數剛好等於 35% 上限時允許
    Scenario Outline: 剛好等於折抵上限
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "成功"
      And 應付金額為 "<final_amount>"
      And 剩餘點數為 "<remaining_points>"

      Examples:
        | balance | order_amount | points | final_amount | remaining_points |
        | 500     | 1000         | 350    | 650          | 150              |
        | 500     | 101          | 35     | 66           | 465              |

  @rule:R-POINTS_REDEMPTION-002
  Rule: 折抵點數不是整數時拒絕
    Scenario Outline: 非整數折抵點數
      Given 會員點數餘額為 "500"
      And 訂單金額為 "1000"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "INVALID_POINTS"

      Examples:
        | points |
        | 10.5   |
        | 0.5    |

  @rule:R-POINTS_REDEMPTION-003
  Rule: 折抵點數超過點數餘額時整筆拒絕
    Scenario Outline: 點數不足
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "1000"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "INSUFFICIENT_POINTS"

      Examples:
        | balance | points |
        | 100     | 101    |
        | 0       | 1      |

  @rule:R-POINTS_REDEMPTION-004
  Rule: 折抵點數超過 35% 上限時整筆拒絕
    Scenario Outline: 超過折抵上限
      Given 會員點數餘額為 "500"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "EXCEEDS_LIMIT"

      Examples:
        | order_amount | points |
        | 1000         | 351    |
        | 101          | 36     |

  @rule:R-POINTS_REDEMPTION-005
  Rule: 折抵點數為負數時拒絕
    Scenario Outline: 負數折抵點數
      Given 會員點數餘額為 "500"
      And 訂單金額為 "1000"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "INVALID_POINTS"

      Examples:
        | points |
        | -10    |
        | -1     |

  @rule:R-POINTS_REDEMPTION-006
  Rule: 折抵 0 點視為成功且不扣點
    Scenario: 折抵 0 點
      Given 會員點數餘額為 "500"
      And 訂單金額為 "1000"
      When 會員輸入折抵點數 "0"
      Then 折抵結果為 "成功"
      And 應付金額為 "1000"
      And 剩餘點數為 "500"

  @rule:R-POINTS_REDEMPTION-007
  Rule: 訂單金額或點數餘額非法時拒絕
    Scenario Outline: 非法的訂單金額或點數餘額
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "INVALID_INPUT"

      Examples:
        | balance | order_amount | points |
        | 100     | 0            | 0      |
        | 100     | -100         | 10     |
        | 100     | 100.5        | 10     |
        | -1      | 1000         | 10     |
        | 99.9    | 1000         | 10     |

  @rule:R-POINTS_REDEMPTION-008
  Rule: 多個錯誤同時發生時依固定順序回報第一個
    Scenario Outline: 多重錯誤的回報優先序
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "失敗"
      And 失敗原因為 "<reason>"

      Examples:
        | balance | order_amount | points | reason              |
        | 100     | 1000         | 351    | INSUFFICIENT_POINTS |
        | 100     | 0            | -5     | INVALID_INPUT       |
        | -1      | 1000         | 10.5   | INVALID_INPUT       |
        | 100     | 100          | 10.5   | INVALID_POINTS      |
