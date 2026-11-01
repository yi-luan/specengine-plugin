Feature: 事件驅動下單流程（訂單、庫存、付款三個服務）

  Background:
    Given inventory stock:
      | sku   | qty |
      | SKU-A | 10  |
      | SKU-B | 0   |
    And customer balances:
      | customerId | balance |
      | alice      | 500     |
      | bob        | 50      |

  # --- 需求 1 / 2 / 3 / 4：主流程 ---

  Scenario: 下單後狀態為處理中並發出 OrderPlaced
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    Then the command succeeds
    And the command emits exactly 1 "OrderPlaced" event
    And order "o1" has status "PENDING"
    And 1 "OrderPlaced" event for order "o1" was emitted

  Scenario: 庫存與餘額都足夠，訂單確認
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "CONFIRMED"
    And available stock of "SKU-A" is 8
    And balance of "alice" is 400
    And 1 "StockReserved" event for order "o1" was emitted
    And 1 "PaymentSucceeded" event for order "o1" was emitted
    And 0 "StockRejected" events for order "o1" were emitted
    And 0 "PaymentFailed" events for order "o1" were emitted

  Scenario: 庫存不足，訂單變為庫存不足且不扣款
    When customer "alice" places order "o1" for 11 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "REJECTED"
    And available stock of "SKU-A" is 10
    And balance of "alice" is 500
    And 1 "StockRejected" event for order "o1" was emitted
    And 0 "StockReserved" events for order "o1" were emitted
    And 0 "PaymentSucceeded" events for order "o1" were emitted

  Scenario: 未知 SKU 視為庫存不足
    When customer "alice" places order "o1" for 1 of "SKU-X" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "REJECTED"
    And balance of "alice" is 500

  Scenario: 庫存剛好等於數量仍可保留
    When customer "alice" places order "o1" for 10 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "CONFIRMED"
    And available stock of "SKU-A" is 0

  # --- 需求 5：付款失敗要放回庫存 ---

  Scenario: 餘額不足，訂單付款失敗且庫存放回
    When customer "bob" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "FAILED"
    And available stock of "SKU-A" is 10
    And balance of "bob" is 50
    And 1 "PaymentFailed" event for order "o1" was emitted
    And 1 "StockReleased" event for order "o1" was emitted
    And 0 "PaymentSucceeded" events for order "o1" were emitted

  Scenario: 餘額剛好等於金額可以扣款
    When customer "bob" places order "o1" for 1 of "SKU-A" at 50 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "CONFIRMED"
    And balance of "bob" is 0

  # --- 需求 6：顧客取消 ---

  Scenario: 取消處理中的訂單，庫存放回且不扣款
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer cancels order "o1" at "2026-06-15T12:01:00Z"
    Then the command succeeds
    And the command emits exactly 1 "OrderCancelled" event
    And order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    When all pending events are delivered
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And available stock of "SKU-A" is 10
    And balance of "alice" is 500
    And 0 "PaymentRefunded" events for order "o1" were emitted

  Scenario: 取消已確認的訂單，退款並放回庫存
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    Then order "o1" has status "CONFIRMED"
    When customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And all pending events are delivered
    Then order "o1" has status "CANCELLED" with cancel reason "CUSTOMER"
    And available stock of "SKU-A" is 10
    And balance of "alice" is 500
    And 1 "PaymentRefunded" event for order "o1" was emitted with amount 100
    And 1 "StockReleased" event for order "o1" was emitted

  Scenario: 取消不存在的訂單會失敗
    When customer cancels order "nope" at "2026-06-15T12:05:00Z"
    Then the command fails

  Scenario: 已取消的訂單不能再取消
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer cancels order "o1" at "2026-06-15T12:01:00Z"
    And customer cancels order "o1" at "2026-06-15T12:02:00Z"
    Then the command fails
    And 1 "OrderCancelled" event for order "o1" was emitted

  Scenario: 庫存不足或付款失敗的訂單不能取消
    When customer "alice" places order "o1" for 11 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer "bob" places order "o2" for 1 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    And customer cancels order "o1" at "2026-06-15T12:01:00Z"
    Then the command fails
    And order "o1" has status "REJECTED"
    When customer cancels order "o2" at "2026-06-15T12:01:00Z"
    Then the command fails
    And order "o2" has status "FAILED"

  # --- 需求 7：15 分鐘逾時自動取消 ---

  Scenario: 15 分鐘內未付款的訂單自動取消
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And the inventory service receives the "OrderPlaced" event for order "o1"
    And time advances to "2026-06-15T12:15:00Z"
    Then the tick emits exactly 1 "OrderCancelled" event
    And order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    When all pending events are delivered
    Then order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    And available stock of "SKU-A" is 10
    And balance of "alice" is 500

  Scenario: 未滿 15 分鐘不會自動取消
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And time advances to "2026-06-15T12:14:59Z"
    Then the tick emits exactly 0 "OrderCancelled" events
    And order "o1" has status "PENDING"

  Scenario: 已確認的訂單不會因逾時被取消
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    And time advances to "2026-06-15T13:00:00Z"
    Then the tick emits exactly 0 "OrderCancelled" events
    And order "o1" has status "CONFIRMED"

  Scenario: 逾時只會取消一次
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And time advances to "2026-06-15T12:20:00Z"
    And time advances to "2026-06-15T12:30:00Z"
    Then the tick emits exactly 0 "OrderCancelled" events
    And 1 "OrderCancelled" event for order "o1" was emitted

  Scenario: 逾時取消後才送達的 PaymentSucceeded 不會改變狀態且會退款
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And the inventory service receives the "OrderPlaced" event for order "o1"
    And the payment service receives the "OrderPlaced" event for order "o1"
    And the payment service receives the "StockReserved" event for order "o1"
    Then balance of "alice" is 400
    When time advances to "2026-06-15T12:15:00Z"
    And all pending events are delivered
    Then order "o1" has status "CANCELLED" with cancel reason "TIMEOUT"
    And balance of "alice" is 500
    And available stock of "SKU-A" is 10
    And 1 "PaymentRefunded" event for order "o1" was emitted with amount 100

  # --- 需求 8：至少一次送達、可能重複、不保證順序 ---

  Scenario: 每個事件重複送達兩次，結果與送達一次相同
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered twice
    Then order "o1" has status "CONFIRMED"
    And available stock of "SKU-A" is 8
    And balance of "alice" is 400
    And 1 "StockReserved" event for order "o1" was emitted
    And 1 "PaymentSucceeded" event for order "o1" was emitted

  Scenario: 取消已確認訂單時事件重複送達，只退款一次
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered twice
    And customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And all pending events are delivered twice
    Then balance of "alice" is 500
    And available stock of "SKU-A" is 10
    And 1 "PaymentRefunded" event for order "o1" was emitted with amount 100
    And 1 "StockReleased" event for order "o1" was emitted

  Scenario: 付款服務先收到 StockReserved 再收到 OrderPlaced 仍只扣款一次
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And the inventory service receives the "OrderPlaced" event for order "o1"
    And the payment service receives the "StockReserved" event for order "o1"
    Then balance of "alice" is 500
    When the payment service receives the "OrderPlaced" event for order "o1"
    Then balance of "alice" is 400
    When all pending events are delivered
    Then order "o1" has status "CONFIRMED"
    And balance of "alice" is 400
    And 1 "PaymentSucceeded" event for order "o1" was emitted

  Scenario: 庫存服務先收到 OrderCancelled 再收到 OrderPlaced 不會保留庫存
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer cancels order "o1" at "2026-06-15T12:01:00Z"
    And the inventory service receives the "OrderCancelled" event for order "o1"
    And the inventory service receives the "OrderPlaced" event for order "o1"
    Then available stock of "SKU-A" is 10
    And 0 "StockReserved" events for order "o1" were emitted
    When all pending events are delivered
    Then available stock of "SKU-A" is 10
    And balance of "alice" is 500

  Scenario: 付款服務先收到 OrderCancelled 再收到 OrderPlaced 與 StockReserved 不會扣款
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And the inventory service receives the "OrderPlaced" event for order "o1"
    And customer cancels order "o1" at "2026-06-15T12:01:00Z"
    And the payment service receives the "OrderCancelled" event for order "o1"
    And the payment service receives the "OrderPlaced" event for order "o1"
    And the payment service receives the "StockReserved" event for order "o1"
    Then balance of "alice" is 500
    And 0 "PaymentSucceeded" events for order "o1" were emitted
    When all pending events are delivered
    Then available stock of "SKU-A" is 10
    And balance of "alice" is 500

  Scenario: 庫存服務先收到 PaymentFailed 再收到 OrderPlaced 不會保留庫存
    When customer "bob" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And the inventory service handles a "PaymentFailed" event for order "o1"
    Then the handle output is empty
    When the inventory service receives the "OrderPlaced" event for order "o1"
    Then the handle output is empty
    And available stock of "SKU-A" is 10
    And 0 "StockReserved" events for order "o1" were emitted

  Scenario: 多張訂單在亂序送達下仍各自收斂
    When customer "alice" places order "o1" for 3 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer "alice" places order "o2" for 3 of "SKU-A" at 100 on "2026-06-15T12:00:01Z"
    And customer "bob" places order "o3" for 3 of "SKU-A" at 100 on "2026-06-15T12:00:02Z"
    And customer "alice" places order "o4" for 3 of "SKU-A" at 100 on "2026-06-15T12:00:03Z"
    And all pending events are delivered in reverse order
    Then order "o4" has status "CONFIRMED"
    And order "o3" has status "FAILED"
    And order "o2" has status "CONFIRMED"
    And order "o1" has status "REJECTED"
    And available stock of "SKU-A" is 4
    And balance of "alice" is 300
    And balance of "bob" is 50

  Scenario: 服務對不關心的事件回傳空陣列
    When the order service handles a "StockReserved" event for order "o1"
    Then the handle output is empty
    When the inventory service handles a "PaymentSucceeded" event for order "o1"
    Then the handle output is empty
    When the payment service handles a "StockRejected" event for order "o1"
    Then the handle output is empty

  Scenario: 結果事件指向不存在的訂單不會造成錯誤
    When the order service handles a "PaymentSucceeded" event for order "ghost"
    Then the handle output is empty
    And order "ghost" does not exist

  # --- 輸入驗證與事件 id ---

  Scenario: 重複的訂單編號不能再下單
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer "alice" places order "o1" for 1 of "SKU-A" at 100 on "2026-06-15T12:01:00Z"
    Then the command fails
    And 1 "OrderPlaced" event for order "o1" was emitted

  Scenario Outline: 數量與金額必須是合法整數
    When customer "alice" places order "o1" for <qty> of "SKU-A" at <amount> on "2026-06-15T12:00:00Z"
    Then the command fails
    And order "o1" does not exist

    Examples:
      | qty | amount |
      | 0   | 100    |
      | -1  | 100    |
      | 1.5 | 100    |
      | 1   | -1     |
      | 1   | 10.5   |

  Scenario: 時間格式不合法時下單失敗
    When customer "alice" places order "o1" for 1 of "SKU-A" at 100 on "not-a-date"
    Then the command fails

  Scenario: 所有事件的 id 在全系統內唯一
    When customer "alice" places order "o1" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer "bob" places order "o2" for 2 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And customer "alice" places order "o3" for 20 of "SKU-A" at 100 on "2026-06-15T12:00:00Z"
    And all pending events are delivered
    And customer cancels order "o1" at "2026-06-15T12:05:00Z"
    And all pending events are delivered
    Then all emitted event ids are unique
    And at least 10 events were emitted
