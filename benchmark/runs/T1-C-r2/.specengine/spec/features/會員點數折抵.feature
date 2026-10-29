Feature: 會員點數折抵
  會員結帳時可以用點數折抵現金，1 點折抵 1 元，折抵點數必須是整數；
  單筆訂單的折抵金額不得超過訂單金額的 30%（折抵上限 = 訂單金額 × 30% 無條件捨去取整數）。
  失敗原因檢查順序固定：INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT。

  @rule:R-POINTS_REDEMPTION-000
  Rule: 主流程：前置檢查全部通過時折抵成功，回傳應付金額與剩餘點數
    Scenario Outline: 折抵成功（含剛好等於上限、折抵 0 點、餘額剛好用完）
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "成功"
      And 應付金額為 "<final_amount>"
      And 剩餘點數為 "<remaining_points>"

      Examples:
        | balance | order_amount | points | final_amount | remaining_points |
        | 1000    | 1000         | 300    | 700          | 700              |
        | 500     | 1000         | 100    | 900          | 400              |
        | 100     | 500          | 0      | 500          | 100              |
        | 100     | 101          | 30     | 71           | 70               |
        | 50      | 200          | 50     | 150          | 0                |

  @rule:R-POINTS_REDEMPTION-001
  Rule: 折抵點數不是整數或為負數時整筆拒絕，失敗原因 INVALID_POINTS（先於點數不足與上限檢查）
    Scenario Outline: 折抵點數格式非法
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "不成功"
      And 失敗原因為 "INVALID_POINTS"
      And 點數餘額維持 "<balance>"

      Examples:
        | balance | order_amount | points |
        | 100     | 500          | 10.5   |
        | 100     | 500          | -10    |
        | 10      | 500          | 10.5   |
        | 1000    | 100          | 50.5   |
        | 100     | 500          | -0.5   |

  @rule:R-POINTS_REDEMPTION-002
  Rule: 折抵金額超過折抵上限時整筆拒絕不截斷，失敗原因 EXCEEDS_LIMIT
    Scenario Outline: 折抵金額超過訂單金額 30% 上限
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "不成功"
      And 失敗原因為 "EXCEEDS_LIMIT"
      And 點數餘額維持 "<balance>"

      Examples:
        | balance | order_amount | points |
        | 1000    | 1000         | 301    |
        | 1000    | 101          | 31     |
        | 500     | 1000         | 500    |
        | 10      | 3            | 1      |

  @rule:R-POINTS_REDEMPTION-003
  Rule: 折抵點數超過點數餘額時整筆拒絕不自動折到餘額用完，失敗原因 INSUFFICIENT_POINTS（先於上限檢查）
    Scenario Outline: 點數不足
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "不成功"
      And 失敗原因為 "INSUFFICIENT_POINTS"
      And 點數餘額維持 "<balance>"

      Examples:
        | balance | order_amount | points |
        | 100     | 1000         | 101    |
        | 0       | 1000         | 1      |
        | 100     | 200          | 150    |

  @rule:R-POINTS_REDEMPTION-004
  Rule: 訂單金額為 0、負數或非整數，或點數餘額為負數或非整數時整筆拒絕，失敗原因 INVALID_INPUT（最先檢查）
    Scenario Outline: 輸入非法
      Given 會員點數餘額為 "<balance>"
      And 訂單金額為 "<order_amount>"
      When 會員輸入折抵點數 "<points>"
      Then 折抵結果為 "不成功"
      And 失敗原因為 "INVALID_INPUT"
      And 點數餘額維持 "<balance>"

      Examples:
        | balance | order_amount | points |
        | 100     | 0            | 10     |
        | 100     | -500         | 10     |
        | -1      | 500          | 0      |
        | 100     | 100.5        | 10     |
        | 50.5    | 500          | 10     |
        | -1      | 0            | 10.5   |
