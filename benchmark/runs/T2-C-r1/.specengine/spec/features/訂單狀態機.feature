Feature: 訂單狀態機
  訂單在 CREATED、PAID、SHIPPED、CANCELLED、REFUNDED 五個狀態之間依付款、出貨、取消、退款操作轉移。
  所有操作皆為純函式：成功時回傳新的訂單物件，失敗時回傳固定英文代碼的失敗原因。金額皆為整數元。

  @rule:R-ORDER_STATE_MACHINE-000
  Rule: 主流程：建立訂單、等額付款、出貨
    Scenario: 建立後付款再出貨
      When 操作者建立訂單，識別字 "o-1"、金額 "1000"
      Then 操作成功
      And 回傳訂單的狀態為 "CREATED"
      And 回傳訂單的訂單金額為 "1000"
      And 回傳訂單的已付金額為 "0"
      And 回傳訂單的累計退款金額為 "0"
      When 操作者付款 "1000"
      Then 操作成功
      And 回傳訂單的狀態為 "PAID"
      And 回傳訂單的已付金額為 "1000"
      And 傳入的訂單內容與呼叫前相同
      When 操作者出貨
      Then 操作成功
      And 回傳訂單的狀態為 "SHIPPED"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-001
  Rule: 建立訂單的金額必須是正整數
    Scenario Outline: 建立金額不合法
      When 操作者建立訂單，識別字 "o-1"、金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"

      Examples:
        | amount   |
        | 0        |
        | -1       |
        | 10.5     |
        | NaN      |
        | Infinity |

  @rule:R-ORDER_STATE_MACHINE-002
  Rule: 付款金額必須等於訂單金額，不允許部分付款
    Scenario Outline: 少付或多付
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額為 "1000"、已付金額為 "0"、累計退款金額為 "0"
      When 操作者付款 "<amount>"
      Then 操作失敗，失敗原因為 "AMOUNT_MISMATCH"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | amount |
        | 999    |
        | 1      |
        | 1001   |

  @rule:R-ORDER_STATE_MACHINE-003
  Rule: 已建立的訂單可以取消
    Scenario: 取消尚未付款的訂單
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額為 "1000"、已付金額為 "0"、累計退款金額為 "0"
      When 操作者取消訂單
      Then 操作成功
      And 回傳訂單的狀態為 "CANCELLED"
      And 回傳訂單的已付金額為 "0"
      And 回傳訂單的累計退款金額為 "0"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-004
  Rule: 已付款的訂單取消時退還全部已付金額
    Scenario: 取消已付款的訂單
      Given 一筆狀態為 "PAID" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "0"
      When 操作者取消訂單
      Then 操作成功
      And 回傳訂單的狀態為 "CANCELLED"
      And 回傳訂單的已付金額為 "1000"
      And 回傳訂單的累計退款金額為 "1000"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-005
  Rule: 已出貨的訂單可以分次部分退款，狀態維持已出貨
    Scenario Outline: 部分退款
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "<refunded>"
      When 操作者退款 "<amount>"
      Then 操作成功
      And 回傳訂單的狀態為 "SHIPPED"
      And 回傳訂單的累計退款金額為 "<expected>"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | refunded | amount | expected |
        | 0        | 300    | 300      |
        | 300      | 400    | 700      |
        | 0        | 999    | 999      |

  @rule:R-ORDER_STATE_MACHINE-006
  Rule: 累計退款金額達到已付金額時狀態變為已退款
    Scenario Outline: 退款達到已付金額
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "<refunded>"
      When 操作者退款 "<amount>"
      Then 操作成功
      And 回傳訂單的狀態為 "REFUNDED"
      And 回傳訂單的累計退款金額為 "1000"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | refunded | amount |
        | 0        | 1000   |
        | 700      | 300    |
        | 999      | 1      |

  @rule:R-ORDER_STATE_MACHINE-007
  Rule: 退款金額超過剩餘可退金額時整筆拒絕
    Scenario Outline: 退款超過剩餘可退金額
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "<refunded>"
      When 操作者退款 "<amount>"
      Then 操作失敗，失敗原因為 "REFUND_EXCEEDS_PAID"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | refunded | amount |
        | 0        | 1001   |
        | 700      | 301    |
        | 999      | 2      |

  @rule:R-ORDER_STATE_MACHINE-008
  Rule: 所有操作皆為純函式，成功時回傳新物件且不修改傳入的訂單
    Scenario Outline: 成功操作不修改傳入物件
      Given 一筆狀態為 "<status>" 的訂單，訂單金額為 "1000"、已付金額為 "<paid>"、累計退款金額為 "0"
      When 操作者對訂單執行 "<op>" 操作，金額 "<amount>"
      Then 操作成功
      And 回傳的訂單不是傳入的同一個物件
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | status  | paid | op     | amount |
        | CREATED | 0    | pay    | 1000   |
        | PAID    | 1000 | ship   | -      |
        | PAID    | 1000 | cancel | -      |
        | SHIPPED | 1000 | refund | 100    |

  @rule:R-ORDER_STATE_MACHINE-009
  Rule: 已出貨的訂單不能取消
    Scenario: 取消已出貨的訂單
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "0"
      When 操作者取消訂單
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-010
  Rule: 已取消的訂單不能再做任何操作
    Scenario Outline: 對已取消的訂單操作
      Given 一筆狀態為 "CANCELLED" 的訂單，訂單金額為 "1000"、已付金額為 "0"、累計退款金額為 "0"
      When 操作者對訂單執行 "<op>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | op     | amount |
        | pay    | 1000   |
        | ship   | -      |
        | cancel | -      |
        | refund | 100    |

  @rule:R-ORDER_STATE_MACHINE-011
  Rule: 已退款的訂單不能再做任何操作
    Scenario Outline: 對已退款的訂單操作
      Given 一筆狀態為 "REFUNDED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "1000"
      When 操作者對訂單執行 "<op>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | op     | amount |
        | pay    | 1000   |
        | ship   | -      |
        | cancel | -      |
        | refund | 100    |

  @rule:R-ORDER_STATE_MACHINE-012
  Rule: 其他需求未允許的狀態轉移一律拒絕
    Scenario Outline: 未允許的狀態與操作組合
      Given 一筆狀態為 "<status>" 的訂單，訂單金額為 "1000"、已付金額為 "<paid>"、累計退款金額為 "0"
      When 操作者對訂單執行 "<op>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | status  | paid | op     | amount |
        | PAID    | 1000 | pay    | 1000   |
        | SHIPPED | 1000 | pay    | 1000   |
        | SHIPPED | 1000 | ship   | -      |
        | CREATED | 0    | refund | 100    |

  @rule:R-ORDER_STATE_MACHINE-013
  Rule: 已建立但尚未付款的訂單不能出貨
    Scenario: 出貨尚未付款的訂單
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額為 "1000"、已付金額為 "0"、累計退款金額為 "0"
      When 操作者出貨
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-014
  Rule: 已付款但尚未出貨的訂單不能直接退款
    Scenario: 退款尚未出貨的訂單
      Given 一筆狀態為 "PAID" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "0"
      When 操作者退款 "100"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

  @rule:R-ORDER_STATE_MACHINE-015
  Rule: 退款金額必須是正整數
    Scenario Outline: 退款金額不合法
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額為 "1000"、已付金額為 "1000"、累計退款金額為 "0"
      When 操作者退款 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | amount |
        | 0      |
        | -5     |
        | 10.5   |
        | NaN    |

  @rule:R-ORDER_STATE_MACHINE-016
  Rule: 付款金額必須是正整數，金額合法性先於金額比對
    Scenario Outline: 付款金額不合法
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額為 "1000"、已付金額為 "0"、累計退款金額為 "0"
      When 操作者付款 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | amount |
        | 0      |
        | -1     |
        | 10.5   |
        | NaN    |

  @rule:R-ORDER_STATE_MACHINE-017
  Rule: 狀態錯誤與金額錯誤並存時只回第一個踩到的失敗原因
    Scenario Outline: 狀態檢查優先於金額檢查
      Given 一筆狀態為 "<status>" 的訂單，訂單金額為 "1000"、已付金額為 "<paid>"、累計退款金額為 "<refunded>"
      When 操作者對訂單執行 "<op>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單內容與呼叫前相同

      Examples:
        | status    | paid | refunded | op     | amount |
        | CANCELLED | 0    | 0        | pay    | 0      |
        | CANCELLED | 0    | 0        | pay    | 999    |
        | REFUNDED  | 1000 | 1000     | refund | 5000   |
        | PAID      | 1000 | 0        | refund | 0      |
        | SHIPPED   | 1000 | 0        | pay    | -1     |
