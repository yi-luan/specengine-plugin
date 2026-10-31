Feature: 訂單狀態機
  訂單依「已建立、已付款、已出貨、已取消、已退款」流轉。
  操作成功時回傳更新後的訂單；操作失敗時回傳英文錯誤代碼，且訂單不變。

  @rule:R-ORDER_STATE_MACHINE-000
  Rule: 主流程：建立後付款、出貨
    Scenario: 建立訂單後依序付款與出貨
      When 呼叫 "建立訂單"，編號為 "O-1"，金額為 "100"
      Then 操作成功
      And 訂單狀態為 "已建立"
      When 呼叫 "付款"，金額為 "100"
      Then 操作成功
      And 訂單狀態為 "已付款"
      When 呼叫 "出貨"
      Then 操作成功
      And 訂單狀態為 "已出貨"

  @rule:R-ORDER_STATE_MACHINE-001
  Rule: 建立訂單時金額必須為正整數，建立後狀態為已建立
    Scenario: 建立訂單成功
      When 呼叫 "建立訂單"，編號為 "O-1"，金額為 "100"
      Then 操作成功
      And 訂單狀態為 "已建立"
      And 已付金額為 "0"
      And 累計退款金額為 "0"

  @rule:R-ORDER_STATE_MACHINE-002
  Rule: 建立訂單的金額不是正整數時拒絕
    Scenario Outline: 建立訂單的金額不合法
      When 呼叫 "建立訂單"，編號為 "O-1"，金額為 "<金額>"
      Then 操作失敗，原因為 "INVALID_AMOUNT"

      Examples:
        | 金額   |
        | 0      |
        | -5     |
        | 100.5  |

  @rule:R-ORDER_STATE_MACHINE-003
  Rule: 已建立的訂單付款金額等於訂單金額時，狀態變為已付款
    Scenario: 付款金額等於訂單金額
      Given 一張訂單狀態為 "已建立"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "付款"，金額為 "100"
      Then 操作成功
      And 訂單狀態為 "已付款"
      And 已付金額為 "100"

  @rule:R-ORDER_STATE_MACHINE-004
  Rule: 已建立的訂單付款金額不等於訂單金額時拒絕
    Scenario: 付款金額與訂單金額不符
      Given 一張訂單狀態為 "已建立"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "付款"，金額為 "99"
      Then 操作失敗，原因為 "AMOUNT_MISMATCH"
      And 訂單狀態為 "已建立"

  @rule:R-ORDER_STATE_MACHINE-005
  Rule: 已付款的訂單可以出貨
    Scenario: 出貨成功
      Given 一張訂單狀態為 "已付款"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "出貨"
      Then 操作成功
      And 訂單狀態為 "已出貨"

  @rule:R-ORDER_STATE_MACHINE-006
  Rule: 已建立的訂單取消後為已取消，不產生退款
    Scenario: 取消已建立的訂單
      Given 一張訂單狀態為 "已建立"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "取消"
      Then 操作成功
      And 訂單狀態為 "已取消"
      And 已付金額為 "0"
      And 累計退款金額為 "0"

  @rule:R-ORDER_STATE_MACHINE-007
  Rule: 已付款的訂單取消時退還全部已付金額
    Scenario: 取消已付款的訂單
      Given 一張訂單狀態為 "已付款"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "取消"
      Then 操作成功
      And 訂單狀態為 "已取消"
      And 已付金額為 "100"
      And 累計退款金額為 "100"

  @rule:R-ORDER_STATE_MACHINE-008
  Rule: 已出貨的訂單部分退款，累計未達已付金額時狀態維持已出貨
    Scenario: 第一次部分退款
      Given 一張訂單狀態為 "已出貨"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "退款"，金額為 "30"
      Then 操作成功
      And 訂單狀態為 "已出貨"
      And 累計退款金額為 "30"

  @rule:R-ORDER_STATE_MACHINE-009
  Rule: 已出貨的訂單累計退款達到已付金額時，狀態變為已退款
    Scenario: 最後一筆退款湊滿已付金額
      Given 一張訂單狀態為 "已出貨"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "30"
      When 呼叫 "退款"，金額為 "70"
      Then 操作成功
      And 訂單狀態為 "已退款"
      And 累計退款金額為 "100"

  @rule:R-ORDER_STATE_MACHINE-010
  Rule: 狀態不允許的操作一律以 INVALID_TRANSITION 拒絕，訂單不變
    Scenario: 已建立的訂單直接出貨
      Given 一張訂單狀態為 "已建立"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "出貨"
      Then 操作失敗，原因為 "INVALID_TRANSITION"
      And 訂單狀態為 "已建立"

    Scenario: 已出貨的訂單取消
      Given 一張訂單狀態為 "已出貨"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "取消"
      Then 操作失敗，原因為 "INVALID_TRANSITION"
      And 訂單狀態為 "已出貨"

    Scenario: 已付款未出貨即退款
      Given 一張訂單狀態為 "已付款"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "退款"，金額為 "30"
      Then 操作失敗，原因為 "INVALID_TRANSITION"
      And 訂單狀態為 "已付款"

    Scenario: 已取消的訂單再付款，即使金額不合法也先回報狀態錯誤
      Given 一張訂單狀態為 "已取消"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "付款"，金額為 "0"
      Then 操作失敗，原因為 "INVALID_TRANSITION"
      And 訂單狀態為 "已取消"

    Scenario: 已退款的訂單再退款
      Given 一張訂單狀態為 "已退款"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "100"
      When 呼叫 "退款"，金額為 "10"
      Then 操作失敗，原因為 "INVALID_TRANSITION"
      And 訂單狀態為 "已退款"

  @rule:R-ORDER_STATE_MACHINE-011
  Rule: 付款或退款金額不是正整數時，以 INVALID_AMOUNT 拒絕，訂單不變
    Scenario Outline: 付款金額不合法
      Given 一張訂單狀態為 "已建立"，訂單金額為 "100"，已付金額為 "0"，累計退款金額為 "0"
      When 呼叫 "付款"，金額為 "<金額>"
      Then 操作失敗，原因為 "INVALID_AMOUNT"
      And 訂單狀態為 "已建立"

      Examples:
        | 金額   |
        | 0      |
        | -5     |
        | 100.5  |

    Scenario: 退款金額為零
      Given 一張訂單狀態為 "已出貨"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "0"
      When 呼叫 "退款"，金額為 "0"
      Then 操作失敗，原因為 "INVALID_AMOUNT"
      And 累計退款金額為 "0"

  @rule:R-ORDER_STATE_MACHINE-012
  Rule: 退款會使累計退款金額超過已付金額時整筆拒絕，不截斷
    Scenario: 退款超過剩餘可退額度
      Given 一張訂單狀態為 "已出貨"，訂單金額為 "100"，已付金額為 "100"，累計退款金額為 "70"
      When 呼叫 "退款"，金額為 "31"
      Then 操作失敗，原因為 "REFUND_EXCEEDS_PAID"
      And 訂單狀態為 "已出貨"
      And 累計退款金額為 "70"
