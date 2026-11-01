Feature: 付款服務
  付款服務收到庫存已保留後向顧客扣款並回報付款結果，收到訂單已取消後退款；
  事件至少送達一次、可能重複、不保證順序，所有金額為整數。

  @rule:R-PAYMENT-000
  Rule: 主流程：庫存已保留且餘額足夠時扣款並發出付款成功
    Scenario Outline: 餘額足夠即扣款（相等與 0 元皆視為足夠）
      Given 顧客 "alice" 的初始餘額為 "<balance>"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "<amount>"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentSucceeded"，訂單 "o1"，金額 "<amount>"
      And 回傳事件的 id 為未曾出現過的新值
      And 顧客 "alice" 的餘額為 "<after>"

      Examples:
        | balance | amount | after |
        | 100     | 60     | 40    |
        | 100     | 100    | 0     |
        | 100     | 0      | 100   |

  @rule:R-PAYMENT-001
  Rule: 餘額不足時一毛不扣並發出付款失敗
    Scenario Outline: 餘額小於訂單金額
      Given 顧客 "alice" 的初始餘額為 "<balance>"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "<amount>"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentFailed"，訂單 "o1"
      And 回傳事件的 id 為未曾出現過的新值
      And 顧客 "alice" 的餘額為 "<balance>"

      Examples:
        | balance | amount |
        | 100     | 101    |
        | 0       | 1      |

    Scenario: 顧客不在初始餘額表，餘額視為 0
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "carol"，金額 "1"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentFailed"，訂單 "o1"
      And 顧客 "carol" 的餘額為 "0"
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-002
  Rule: 收到下單事件只記錄訂單，不扣款不發事件
    Scenario: 首次收到下單事件
      Given 顧客 "alice" 的初始餘額為 "100"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-003
  Rule: 已扣款的訂單取消時全額退款並發出已退款
    Scenario: 扣款成功後收到訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentRefunded"，訂單 "o1"，金額 "60"
      And 回傳事件的 id 為未曾出現過的新值
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-004
  Rule: 從未扣款成功的訂單取消時不退款，只記住已取消
    Scenario: 付款服務尚無該訂單記錄時收到訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e1"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 等待扣款的訂單收到訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e2"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 只保留了庫存、尚未收到下單事件的訂單收到訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e1"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e2"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 付款曾失敗的訂單收到訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "150"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-005
  Rule: 不關心的事件類型直接回傳空陣列
    Scenario Outline: 收到付款服務不關心的事件
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      When 付款服務收到訂單 "o1" 的 "<type>" 事件，id 為 "e2"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

      Examples:
        | type             |
        | StockRejected    |
        | StockReleased    |
        | PaymentSucceeded |
        | PaymentFailed    |
        | PaymentRefunded  |

  @rule:R-PAYMENT-006
  Rule: 查詢餘額回傳目前餘額，未知顧客回傳 0
    Scenario Outline: 查詢初始餘額與未知顧客
      Given 顧客 "alice" 的初始餘額為 "100"
      And 顧客 "bob" 的初始餘額為 "50"
      When 查詢顧客 "<customer>" 的餘額
      Then 查詢結果為 "<result>"

      Examples:
        | customer | result |
        | alice    | 100    |
        | bob      | 50     |
        | carol    | 0      |

    Scenario: 扣款與退款後的餘額，且不影響其他顧客
      Given 顧客 "alice" 的初始餘額為 "100"
      And 顧客 "bob" 的初始餘額為 "50"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      And 付款服務已收到訂單 "o2" 的下單事件，id 為 "e3"，顧客 "alice"，金額 "30"
      And 付款服務已收到訂單 "o2" 的 "StockReserved" 事件，id 為 "e4"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e5"
      When 查詢顧客 "alice" 的餘額
      Then 查詢結果為 "70"
      And 顧客 "bob" 的餘額為 "50"

  @rule:R-PAYMENT-007
  Rule: 庫存已保留先於下單事件到達時先記住、不回應
    Scenario: 尚未收到下單事件就收到庫存已保留
      Given 顧客 "alice" 的初始餘額為 "100"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e1"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-008
  Rule: 補到的下單事件立即做扣款判斷並在那時發出結果
    Scenario: 補到下單事件且餘額足夠
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e1"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e2"，顧客 "alice"，金額 "60"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentSucceeded"，訂單 "o1"，金額 "60"
      And 回傳事件的 id 為未曾出現過的新值
      And 顧客 "alice" 的餘額為 "40"

    Scenario Outline: 補到下單事件但餘額不足或金額為負
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e1"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e2"，顧客 "alice"，金額 "<amount>"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentFailed"，訂單 "o1"
      And 顧客 "alice" 的餘額為 "100"

      Examples:
        | amount |
        | 101    |
        | -1     |

  @rule:R-PAYMENT-009
  Rule: 已取消的訂單之後收到庫存已保留或下單事件一律忽略
    Scenario: 取消後才收到庫存已保留
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e1"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 取消後才收到下單事件，再收到庫存已保留仍不扣款
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e1"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e2"，顧客 "alice"，金額 "60"
      Then 回傳空陣列
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e3"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-010
  Rule: 訂單金額為負數視為無效，不扣款並發出付款失敗
    Scenario: 負數金額的訂單收到庫存已保留
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "-1"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentFailed"，訂單 "o1"
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-011
  Rule: 相同 id 的事件第二次起一律忽略
    Scenario: 相同 id 的庫存已保留重送不重複扣款
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "40"

    Scenario: 相同 id 的訂單已取消重送不重複退款
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 相同 id 的下單事件重送不改任何狀態
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-012
  Rule: 已扣款或已退款的訂單再收到庫存已保留不重複扣款
    Scenario: 已扣款的訂單收到不同 id 的庫存已保留
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e9"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "40"

    Scenario: 已退款的訂單收到不同 id 的庫存已保留
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e9"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-013
  Rule: 已退款或已取消的訂單再收到訂單已取消不重複退款
    Scenario: 已退款的訂單收到不同 id 的訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e3"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e9"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

    Scenario: 取消時未扣款的訂單再收到不同 id 的訂單已取消
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e2"
      When 付款服務收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e9"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-014
  Rule: 付款失敗的訂單再收到庫存已保留不重試
    Scenario: 付款失敗後餘額變足夠，仍不重試
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "80"
      And 付款服務已收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      And 付款服務已收到訂單 "o2" 的下單事件，id 為 "e3"，顧客 "alice"，金額 "50"
      And 付款服務已收到訂單 "o2" 的 "StockReserved" 事件，id 為 "e4"
      And 付款服務已收到訂單 "o1" 的 "OrderCancelled" 事件，id 為 "e5"
      When 付款服務收到訂單 "o2" 的 "StockReserved" 事件，id 為 "e9"
      Then 回傳空陣列
      And 顧客 "alice" 的餘額為 "100"

  @rule:R-PAYMENT-015
  Rule: 已有記錄的訂單再收到下單事件保留第一次資料
    Scenario: 不同 id 的下單事件重送不覆寫金額
      Given 顧客 "alice" 的初始餘額為 "100"
      And 付款服務已收到訂單 "o1" 的下單事件，id 為 "e1"，顧客 "alice"，金額 "60"
      When 付款服務收到訂單 "o1" 的下單事件，id 為 "e9"，顧客 "alice"，金額 "999"
      Then 回傳空陣列
      When 付款服務收到訂單 "o1" 的 "StockReserved" 事件，id 為 "e2"
      Then 回傳恰好 "1" 個事件，類型為 "PaymentSucceeded"，訂單 "o1"，金額 "60"
      And 顧客 "alice" 的餘額為 "40"
