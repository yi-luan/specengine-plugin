Feature: 建立與付款訂單

  Scenario: 建立金額為正整數的訂單
    When 建立金額為 1000 元的訂單
    Then 操作成功
    And 訂單狀態為 "已建立"
    And 訂單金額為 1000
    And 已付金額為 0
    And 累計退款金額為 0

  Scenario Outline: 金額不是正整數時無法建立訂單
    When 建立金額為 <amount> 元的訂單
    Then 操作失敗並回傳原因

    Examples:
      | amount |
      | 0      |
      | -100   |

  Scenario: 已建立的訂單以相符金額付款
    Given 已建立金額為 1000 元的訂單
    When 付款 1000 元
    Then 操作成功
    And 訂單狀態為 "已付款"
    And 已付金額為 1000

  Scenario Outline: 付款金額與訂單金額不符時失敗
    Given 已建立金額為 1000 元的訂單
    When 付款 <amount> 元
    Then 操作失敗並回傳原因
    And 訂單維持原狀

    Examples:
      | amount |
      | 999    |
      | 1001   |

  Scenario: 已付款的訂單不可再次付款
    Given 已付款的金額為 1000 元的訂單
    When 付款 1000 元
    Then 操作失敗並回傳原因
    And 訂單狀態為 "已付款"

  Scenario: 已付款的訂單可以出貨
    Given 已付款的金額為 1000 元的訂單
    When 出貨
    Then 操作成功
    And 訂單狀態為 "已出貨"

  Scenario: 未付款的訂單不可出貨
    Given 已建立金額為 1000 元的訂單
    When 出貨
    Then 操作失敗並回傳原因
    And 訂單維持原狀

  Scenario: 已建立的訂單可以取消
    Given 已建立金額為 1000 元的訂單
    When 取消
    Then 操作成功
    And 訂單狀態為 "已取消"
    And 累計退款金額為 0

  Scenario: 已付款的訂單取消時全額退還並計入累計退款
    Given 已付款的金額為 1000 元的訂單
    When 取消
    Then 操作成功
    And 訂單狀態為 "已取消"
    And 已付金額為 1000
    And 累計退款金額為 1000

  Scenario: 已出貨的訂單不可取消
    Given 已出貨的金額為 1000 元的訂單
    When 取消
    Then 操作失敗並回傳原因
    And 訂單維持原狀

  Scenario: 已取消的訂單不可再操作
    Given 已取消的金額為 1000 元的訂單
    When 出貨
    Then 操作失敗並回傳原因
    And 訂單維持原狀

  Scenario: 已出貨的訂單分次退款，累計未達已付金額時維持已出貨
    Given 已出貨的金額為 1000 元的訂單
    When 申請退款 400 元
    Then 操作成功
    And 訂單狀態為 "已出貨"
    And 累計退款金額為 400

  Scenario: 累計退款達到已付金額時狀態變為已退款
    Given 已出貨且已累計退款 400 元、金額為 1000 元的訂單
    When 申請退款 600 元
    Then 操作成功
    And 訂單狀態為 "已退款"
    And 累計退款金額為 1000

  Scenario: 退款超過剩餘可退金額時失敗
    Given 已出貨且已累計退款 400 元、金額為 1000 元的訂單
    When 申請退款 601 元
    Then 操作失敗並回傳原因
    And 訂單維持原狀
    And 累計退款金額為 400

  Scenario: 成功的操作不修改傳入的原訂單
    Given 已付款的金額為 1000 元的訂單
    When 出貨
    Then 操作成功
    And 原訂單未被修改

  Scenario: 已付款但未出貨的訂單不可申請退款
    Given 已付款的金額為 1000 元的訂單
    When 申請退款 100 元
    Then 操作失敗並回傳原因
    And 訂單維持原狀

  Scenario: 已退款的訂單不可再申請退款
    Given 已出貨且已累計退款 1000 元、金額為 1000 元的訂單
    When 申請退款 1 元
    Then 操作失敗並回傳原因
    And 訂單狀態為 "已退款"
