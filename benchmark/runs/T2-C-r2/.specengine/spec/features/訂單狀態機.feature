Feature: 訂單狀態機
  訂單從建立、付款、出貨到取消或退款的狀態轉換。所有操作皆為純函式：不修改傳入的訂單，成功時回傳新的訂單物件，失敗時回傳固定失敗原因代碼。

  @rule:R-ORDER_STATE_MACHINE-000
  Rule: 主流程：以大於 0 的金額建立訂單
    Scenario: 建立訂單成功
      When 客戶以金額 "1000" 建立編號 "ORD-1" 的訂單
      Then 操作結果為 "成功"
      And 訂單編號為 "ORD-1"
      And 訂單狀態為 "CREATED"
      And 訂單金額為 "1000"
      And 已付金額為 "0"
      And 累計退款金額為 "0"

  @rule:R-ORDER_STATE_MACHINE-001
  Rule: 建立訂單金額不得為 0 或負數
    Scenario Outline: 建立訂單金額不合法
      When 客戶以金額 "<amount>" 建立編號 "ORD-1" 的訂單
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"

      Examples:
        | amount |
        | 0      |
        | -100   |

  @rule:R-ORDER_STATE_MACHINE-002
  Rule: 已建立訂單以等額付款後變為已付款
    Scenario: 付款金額等於訂單金額
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 客戶付款 "1000"
      Then 操作結果為 "成功"
      And 訂單狀態為 "PAID"
      And 已付金額為 "1000"
      And 累計退款金額為 "0"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-003
  Rule: 付款金額大於 0 但不等於訂單金額時拒絕，不允許部分付款
    Scenario Outline: 少付或多付
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 客戶付款 "<amount>"
      Then 操作失敗，失敗原因為 "AMOUNT_MISMATCH"
      And 傳入的訂單未被修改

      Examples:
        | amount |
        | 900    |
        | 1100   |
        | 1      |

  @rule:R-ORDER_STATE_MACHINE-004
  Rule: 已付款訂單出貨後變為已出貨
    Scenario: 出貨成功
      Given 一筆狀態為 "PAID" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 商家出貨
      Then 操作結果為 "成功"
      And 訂單狀態為 "SHIPPED"
      And 已付金額為 "1000"
      And 累計退款金額為 "0"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-005
  Rule: 已建立訂單取消後變為已取消，金額欄位皆為 0
    Scenario: 取消未付款訂單
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 客戶取消訂單
      Then 操作結果為 "成功"
      And 訂單狀態為 "CANCELLED"
      And 已付金額為 "0"
      And 累計退款金額為 "0"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-006
  Rule: 已付款訂單取消後變為已取消並退還全部已付金額
    Scenario: 取消已付款訂單
      Given 一筆狀態為 "PAID" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 客戶取消訂單
      Then 操作結果為 "成功"
      And 訂單狀態為 "CANCELLED"
      And 已付金額為 "1000"
      And 累計退款金額為 "1000"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-007
  Rule: 已出貨訂單部分退款後維持已出貨，累計退款金額累加
    Scenario Outline: 部分退款
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "<refunded>"
      When 客戶申請退款 "<amount>"
      Then 操作結果為 "成功"
      And 訂單狀態為 "SHIPPED"
      And 已付金額為 "1000"
      And 累計退款金額為 "<expected>"
      And 傳入的訂單未被修改

      Examples:
        | refunded | amount | expected |
        | 0        | 300    | 300      |
        | 600      | 399    | 999      |

  @rule:R-ORDER_STATE_MACHINE-008
  Rule: 累計退款超過已付金額時整筆拒絕，不截斷
    Scenario Outline: 退款超過剩餘可退金額
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "<refunded>"
      When 客戶申請退款 "<amount>"
      Then 操作失敗，失敗原因為 "REFUND_EXCEEDS_PAID"
      And 傳入的訂單未被修改

      Examples:
        | refunded | amount |
        | 0        | 1001   |
        | 600      | 500    |
        | 999      | 2      |

  @rule:R-ORDER_STATE_MACHINE-009
  Rule: 累計退款達到已付金額時變為已退款
    Scenario Outline: 退款剛好達到已付金額
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "<refunded>"
      When 客戶申請退款 "<amount>"
      Then 操作結果為 "成功"
      And 訂單狀態為 "REFUNDED"
      And 已付金額為 "1000"
      And 累計退款金額為 "1000"
      And 傳入的訂單未被修改

      Examples:
        | refunded | amount |
        | 0        | 1000   |
        | 600      | 400    |

    Scenario: 分兩次退款累計達到已付金額
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 客戶申請退款 "600"
      And 客戶申請退款 "400"
      Then 操作結果為 "成功"
      And 訂單狀態為 "REFUNDED"
      And 累計退款金額為 "1000"

  @rule:R-ORDER_STATE_MACHINE-010
  Rule: 狀態不允許且金額同時有錯時只回報狀態錯誤
    Scenario Outline: 多重錯誤以狀態檢查優先
      Given 一筆狀態為 "<status>" 的訂單，訂單金額 "1000"、已付金額 "<paid>"、累計退款金額 "<refunded>"
      When 對訂單執行 "<operation>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

      Examples:
        | status    | paid | refunded | operation | amount |
        | CANCELLED | 0    | 0        | 付款      | 999    |
        | PAID      | 1000 | 0        | 退款      | 0      |
        | CREATED   | 0    | 0        | 退款      | -5     |
        | REFUNDED  | 1000 | 1000     | 退款      | 5000   |

  @rule:R-ORDER_STATE_MACHINE-011
  Rule: 已取消訂單的任何操作一律拒絕
    Scenario Outline: 對已取消訂單操作
      Given 一筆狀態為 "CANCELLED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 對訂單執行 "<operation>" 操作，金額 "1000"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

      Examples:
        | operation |
        | 付款      |
        | 出貨      |
        | 退款      |
        | 取消      |

  @rule:R-ORDER_STATE_MACHINE-012
  Rule: 已退款訂單的任何操作一律拒絕
    Scenario Outline: 對已退款訂單操作
      Given 一筆狀態為 "REFUNDED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "1000"
      When 對訂單執行 "<operation>" 操作，金額 "1000"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

      Examples:
        | operation |
        | 退款      |
        | 出貨      |
        | 取消      |
        | 付款      |

  @rule:R-ORDER_STATE_MACHINE-013
  Rule: 已付款未出貨的訂單不能直接退款，要走取消
    Scenario: 對已付款訂單申請退款
      Given 一筆狀態為 "PAID" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 客戶申請退款 "300"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-014
  Rule: 退款金額不得為 0 或負數
    Scenario Outline: 退款金額不合法
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 客戶申請退款 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"
      And 傳入的訂單未被修改

      Examples:
        | amount |
        | 0      |
        | -1     |

  @rule:R-ORDER_STATE_MACHINE-015
  Rule: 已出貨訂單不能取消
    Scenario: 取消已出貨訂單
      Given 一筆狀態為 "SHIPPED" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 客戶取消訂單
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-016
  Rule: 已建立未付款的訂單不能出貨
    Scenario: 對未付款訂單出貨
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 商家出貨
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

  @rule:R-ORDER_STATE_MACHINE-017
  Rule: 重複付款或重複出貨一律拒絕，不視為冪等
    Scenario Outline: 重複操作
      Given 一筆狀態為 "<status>" 的訂單，訂單金額 "1000"、已付金額 "1000"、累計退款金額 "0"
      When 對訂單執行 "<operation>" 操作，金額 "1000"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

      Examples:
        | status  | operation |
        | PAID    | 付款      |
        | SHIPPED | 出貨      |

  @rule:R-ORDER_STATE_MACHINE-018
  Rule: 未明列為允許的狀態與操作組合一律視為狀態不允許
    Scenario Outline: 未明列的狀態與操作組合
      Given 一筆狀態為 "<status>" 的訂單，訂單金額 "1000"、已付金額 "<paid>"、累計退款金額 "0"
      When 對訂單執行 "<operation>" 操作，金額 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_TRANSITION"
      And 傳入的訂單未被修改

      Examples:
        | status  | paid | operation | amount |
        | CREATED | 0    | 退款      | 100    |
        | SHIPPED | 1000 | 付款      | 1000   |

  @rule:R-ORDER_STATE_MACHINE-019
  Rule: 付款金額為 0 或負數時先回報金額不合法
    Scenario Outline: 付款金額不合法
      Given 一筆狀態為 "CREATED" 的訂單，訂單金額 "1000"、已付金額 "0"、累計退款金額 "0"
      When 客戶付款 "<amount>"
      Then 操作失敗，失敗原因為 "INVALID_AMOUNT"
      And 傳入的訂單未被修改

      Examples:
        | amount |
        | 0      |
        | -1     |
