Feature: 付款服務
  付款服務收到庫存保留後向顧客扣款，訂單取消後全額退款。
  事件可能重複、可能亂序，依事件 id 與訂單狀態判定。

  @rule:R-PAYMENT-000
  Rule: 主流程：庫存保留後扣款
    Scenario Outline: 餘額足夠時扣款成功
      Given 顧客 "C1" 餘額為 "<餘額>"
      And 付款服務已收到訂單 "O1" 的下單事件，顧客為 "C1"，金額為 "<訂單金額>"
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      Then 付款服務發出事件 "PaymentSucceeded"
      And 顧客 "C1" 餘額為 "<剩餘餘額>"
      And 訂單 "O1" 記錄為已扣款，金額為 "<訂單金額>"

      Examples:
        | 餘額 | 訂單金額 | 剩餘餘額 |
        | 100  | 50       | 50       |
        | 50   | 50       | 0        |

  @rule:R-PAYMENT-001
  Rule: 餘額不足時付款失敗，一毛都不扣
    Scenario Outline: 餘額不足時付款失敗且餘額不變
      Given 顧客 "C1" 餘額為 "<餘額>"
      And 付款服務已收到訂單 "O1" 的下單事件，顧客為 "C1"，金額為 "<訂單金額>"
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      Then 付款服務發出事件 "PaymentFailed"
      And 付款服務未發出事件 "PaymentSucceeded"
      And 顧客 "C1" 餘額為 "<餘額>"

      Examples:
        | 餘額 | 訂單金額 |
        | 49   | 50       |
        | 0    | 50       |

    Scenario: 未登錄餘額的顧客視為餘額 0
      Given 顧客 "C9" 未登錄餘額
      And 付款服務已收到訂單 "O9" 的下單事件，顧客為 "C9"，金額為 "50"
      When 付款服務收到庫存保留事件 "E9"，訂單為 "O9"
      Then 付款服務發出事件 "PaymentFailed"
      And 顧客 "C9" 餘額為 "0"

  @rule:R-PAYMENT-002
  Rule: 取消時全額退還已扣款項
    Scenario: 已扣款的訂單被取消後全額退還
      Given 顧客 "C1" 餘額為 "50"
      And 訂單 "O1" 已被扣款 "50"，顧客為 "C1"
      When 付款服務收到取消事件 "E2"，訂單為 "O1"
      Then 付款服務發出事件 "PaymentRefunded"
      And 付款服務發出的 "PaymentRefunded" 金額為 "50"
      And 顧客 "C1" 餘額為 "100"
      And 訂單 "O1" 記錄為已退款

  @rule:R-PAYMENT-003
  Rule: 庫存保留先於下單事件抵達時暫存
    Scenario: 先收到庫存保留，下單事件到達後依餘額處理
      Given 顧客 "C1" 餘額為 "100"
      And 付款服務尚未收到訂單 "O1" 的下單事件
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      Then 付款服務不發出任何事件
      And 付款服務暫存訂單 "O1" 的庫存保留事件
      When 付款服務收到訂單 "O1" 的下單事件，顧客為 "C1"，金額為 "50"
      Then 付款服務發出事件 "PaymentSucceeded"
      And 顧客 "C1" 餘額為 "50"
      And 付款服務不再暫存訂單 "O1" 的庫存保留事件

  @rule:R-PAYMENT-004
  Rule: 同一事件 id 第二次起直接忽略
    Scenario: 重複的庫存保留事件不重複扣款
      Given 顧客 "C1" 餘額為 "100"
      And 付款服務已收到訂單 "O1" 的下單事件，顧客為 "C1"，金額為 "50"
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      And 付款服務再次收到庫存保留事件 "E1"，訂單為 "O1"
      Then 付款服務只發出一次事件 "PaymentSucceeded"
      And 顧客 "C1" 餘額為 "50"

    Scenario: 重複的取消事件不重複退款
      Given 顧客 "C1" 餘額為 "50"
      And 訂單 "O1" 已被扣款 "50"，顧客為 "C1"
      When 付款服務收到取消事件 "E2"，訂單為 "O1"
      And 付款服務再次收到取消事件 "E2"，訂單為 "O1"
      Then 付款服務只發出一次事件 "PaymentRefunded"
      And 顧客 "C1" 餘額為 "100"

  @rule:R-PAYMENT-005
  Rule: 未扣款或已退款的訂單取消時不退款
    Scenario: 從未扣款的訂單被取消，不退款也不發事件
      Given 顧客 "C1" 餘額為 "100"
      And 付款服務已收到訂單 "O1" 的下單事件，顧客為 "C1"，金額為 "50"
      And 訂單 "O1" 從未被扣款
      When 付款服務收到取消事件 "E2"，訂單為 "O1"
      Then 付款服務不發出任何事件
      And 顧客 "C1" 餘額為 "100"
      And 訂單 "O1" 記錄為已取消

    Scenario: 已退款的訂單再次被取消（不同事件 id）不再退款
      Given 顧客 "C1" 餘額為 "100"
      And 訂單 "O1" 已被退款
      When 付款服務收到取消事件 "E3"，訂單為 "O1"
      Then 付款服務不發出任何事件
      And 顧客 "C1" 餘額為 "100"

    Scenario: 取消時丟棄該訂單暫存的庫存保留
      Given 顧客 "C1" 餘額為 "100"
      And 付款服務尚未收到訂單 "O1" 的下單事件
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      And 付款服務收到取消事件 "E2"，訂單為 "O1"
      Then 訂單 "O1" 沒有暫存的庫存保留事件
      And 付款服務不發出任何事件

  @rule:R-PAYMENT-006
  Rule: 訂單已取消後，之後到達的庫存保留不扣款
    Scenario: 取消先於庫存保留抵達，之後的庫存保留不扣款也不發事件
      Given 顧客 "C1" 餘額為 "100"
      And 訂單 "O1" 已被記錄為已取消
      When 付款服務收到庫存保留事件 "E1"，訂單為 "O1"
      Then 付款服務不發出任何事件
      And 顧客 "C1" 餘額為 "100"
