Feature: 付款服務
  付款服務只透過事件與其他服務溝通：收到 StockReserved 後向顧客扣款，
  收到 OrderCancelled 後退還已扣款項。事件可能重複、亂序送達。

  Background:
    Given 顧客餘額如下
      | customerId | balance |
      | alice      | 100     |
      | bob        | 30      |

  Scenario: 餘額足夠時扣款並發出 PaymentSucceeded
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出 1 個事件
    And 發出的事件是 "PaymentSucceeded"，訂單 "o1" 金額 60
    And 顧客 "alice" 餘額為 40

  Scenario: 餘額剛好等於金額時可以扣款
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "bob" 金額 30
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出的事件是 "PaymentSucceeded"，訂單 "o1" 金額 30
    And 顧客 "bob" 餘額為 0

  Scenario: 餘額不足時不扣款並發出 PaymentFailed
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "bob" 金額 50
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出 1 個事件
    And 發出的事件是 "PaymentFailed"，訂單 "o1"
    And 顧客 "bob" 餘額為 30

  Scenario: 不認識的顧客視為餘額 0，扣款失敗
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "nobody" 金額 10
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出的事件是 "PaymentFailed"，訂單 "o1"
    And 顧客 "nobody" 餘額為 0

  Scenario: 只收到 OrderPlaced 還沒收到 StockReserved 時不扣款
    When 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: StockReserved 比 OrderPlaced 先到，等 OrderPlaced 到了才扣款
    Given 收到 StockReserved 事件 "e2"，訂單 "o1"
    And 顧客 "alice" 餘額為 100
    When 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    Then 發出的事件是 "PaymentSucceeded"，訂單 "o1" 金額 60
    And 顧客 "alice" 餘額為 40

  Scenario: 同一個 StockReserved 事件重複送達只扣款一次
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 40

  Scenario: 同一張訂單收到兩個不同 id 的 StockReserved 也只扣款一次
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 StockReserved 事件 "e3"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 40

  Scenario: 重複的 OrderPlaced 不會再扣一次
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 40

  Scenario: 扣款失敗後再收到 StockReserved 也不會重試
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "bob" 金額 50
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 StockReserved 事件 "e3"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "bob" 餘額為 30

  Scenario: 取消已付款的訂單要退款並發出 PaymentRefunded
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    Then 發出 1 個事件
    And 發出的事件是 "PaymentRefunded"，訂單 "o1" 金額 60
    And 顧客 "alice" 餘額為 100

  Scenario: 重複的 OrderCancelled 只退款一次
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    And 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    When 收到 OrderCancelled 事件 "e4"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: 取消付款失敗的訂單不退款也不發事件
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "bob" 金額 50
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "bob" 餘額為 30

  Scenario: 取消還沒扣款的訂單不發事件
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    When 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: OrderCancelled 先到，之後的 StockReserved 不再扣款
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: OrderCancelled 比所有事件都先到，之後也不扣款
    Given 收到 OrderCancelled 事件 "e3"，訂單 "o1"
    And 收到 StockReserved 事件 "e2"，訂單 "o1"
    When 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: 多張訂單各自獨立扣款與退款
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    And 收到 OrderPlaced 事件 "e2"，訂單 "o2" 顧客 "alice" 金額 30
    And 收到 StockReserved 事件 "e3"，訂單 "o1"
    And 收到 StockReserved 事件 "e4"，訂單 "o2"
    And 顧客 "alice" 餘額為 10
    When 收到 OrderCancelled 事件 "e5"，訂單 "o2"
    Then 發出的事件是 "PaymentRefunded"，訂單 "o2" 金額 30
    And 顧客 "alice" 餘額為 40

  Scenario: 與付款無關的事件直接忽略
    When 收到 StockRejected 事件 "e1"，訂單 "o1"
    Then 發出 0 個事件
    When 收到 StockReleased 事件 "e2"，訂單 "o1"
    Then 發出 0 個事件
    When 收到 PaymentSucceeded 事件 "e3"，訂單 "o1" 金額 60
    Then 發出 0 個事件
    When 收到 PaymentFailed 事件 "e4"，訂單 "o1"
    Then 發出 0 個事件
    When 收到 PaymentRefunded 事件 "e5"，訂單 "o1" 金額 60
    Then 發出 0 個事件
    And 顧客 "alice" 餘額為 100

  Scenario: 發出的事件 id 彼此不同
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 20
    And 收到 OrderPlaced 事件 "e2"，訂單 "o2" 顧客 "alice" 金額 20
    When 收到 StockReserved 事件 "e3"，訂單 "o1"
    And 收到 StockReserved 事件 "e4"，訂單 "o2"
    And 收到 OrderCancelled 事件 "e5"，訂單 "o1"
    Then 至今發出的所有事件 id 都不重複

  Scenario: 金額為 0 的訂單扣款成功且餘額不變
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 0
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出的事件是 "PaymentSucceeded"，訂單 "o1" 金額 0
    And 顧客 "alice" 餘額為 100

  Scenario: 金額為負數的訂單扣款失敗
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 -5
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 發出的事件是 "PaymentFailed"，訂單 "o1"
    And 顧客 "alice" 餘額為 100

  Scenario: 建立服務時傳入的餘額表不會被改動
    Given 收到 OrderPlaced 事件 "e1"，訂單 "o1" 顧客 "alice" 金額 60
    When 收到 StockReserved 事件 "e2"，訂單 "o1"
    Then 顧客 "alice" 餘額為 40
    And 建立服務時傳入的餘額表中 "alice" 仍為 100
