Feature: 庫存保留
  庫存服務收到下單事件後保留庫存（足夠發 StockReserved、不足發 StockRejected），
  收到付款失敗或訂單已取消後放回保留庫存並發 StockReleased；
  重複與亂序送達下不重複保留、不重複放回。事件型別以 src/events.ts 的 type 名稱表示。

  @rule:R-INVENTORY_RESERVATION-000
  Rule: 庫存足夠時保留庫存並發出 StockReserved
    Scenario Outline: 可用庫存足夠即保留
      Given 商品 "A" 的初始庫存為 "<stock>"
      When 庫存服務收到訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "<qty>"
      Then 回傳事件為訂單 "O1" 的 "StockReserved"
      And 回傳事件的 id 與先前所有回傳事件的 id 皆不同
      And 商品 "A" 的可用庫存為 "<after>"

      Examples:
        | stock | qty | after |
        | 10    | 3   | 7     |
        | 10    | 10  | 0     |
        | 1     | 1   | 0     |

    Scenario: 多張訂單依序保留同一商品
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "6"
      When 庫存服務收到訂單 "O2" 的下單事件 "E2"，商品 "A" 數量 "4"
      Then 回傳事件為訂單 "O2" 的 "StockReserved"
      And 回傳事件的 id 與先前所有回傳事件的 id 皆不同
      And 商品 "A" 的可用庫存為 "0"

  @rule:R-INVENTORY_RESERVATION-001
  Rule: 庫存不足時整筆拒絕並發出 StockRejected
    Scenario Outline: 可用庫存不足即整筆拒絕
      Given 商品 "A" 的初始庫存為 "<stock>"
      When 庫存服務收到訂單 "O1" 的下單事件 "E1"，商品 "<sku>" 數量 "<qty>"
      Then 回傳事件為訂單 "O1" 的 "StockRejected"
      And 回傳事件的 id 與先前所有回傳事件的 id 皆不同
      And 商品 "<sku>" 的可用庫存為 "<after>"

      Examples:
        | stock | sku | qty | after |
        | 10    | A   | 11  | 10    |
        | 0     | A   | 1   | 0     |
        | 10    | Z   | 1   | 0     |

    Scenario: 先前保留使剩餘庫存不足時整筆拒絕
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "6"
      When 庫存服務收到訂單 "O2" 的下單事件 "E2"，商品 "A" 數量 "5"
      Then 回傳事件為訂單 "O2" 的 "StockRejected"
      And 商品 "A" 的可用庫存為 "4"

  @rule:R-INVENTORY_RESERVATION-002
  Rule: 付款失敗時放回保留庫存並發出 StockReleased
    Scenario: 付款失敗放回保留中的庫存
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      When 庫存服務收到訂單 "O1" 的 "PaymentFailed" 事件 "E2"
      Then 回傳事件為訂單 "O1" 的 "StockReleased"
      And 回傳事件的 id 與先前所有回傳事件的 id 皆不同
      And 商品 "A" 的可用庫存為 "10"

  @rule:R-INVENTORY_RESERVATION-003
  Rule: 訂單取消時放回保留庫存並發出 StockReleased
    Scenario: 訂單取消放回保留中的庫存
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      When 庫存服務收到訂單 "O1" 的 "OrderCancelled" 事件 "E2"
      Then 回傳事件為訂單 "O1" 的 "StockReleased"
      And 回傳事件的 id 與先前所有回傳事件的 id 皆不同
      And 商品 "A" 的可用庫存為 "10"

    Scenario: 已付款成功的訂單取消時照樣放回
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      And 庫存服務已處理訂單 "O1" 的 "PaymentSucceeded" 事件 "E2"
      When 庫存服務收到訂單 "O1" 的 "OrderCancelled" 事件 "E3"
      Then 回傳事件為訂單 "O1" 的 "StockReleased"
      And 商品 "A" 的可用庫存為 "10"

  @rule:R-INVENTORY_RESERVATION-004
  Rule: 不關心的事件型別回傳空陣列且狀態不變
    Scenario Outline: 收到不關心的事件
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      When 庫存服務收到訂單 "O1" 的 "<type>" 事件 "E9"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "7"

      Examples:
        | type             |
        | StockReserved    |
        | StockRejected    |
        | StockReleased    |
        | PaymentSucceeded |
        | PaymentRefunded  |

  @rule:R-INVENTORY_RESERVATION-005
  Rule: 同一訂單的下單事件只處理一次
    Scenario Outline: 重複收到同一訂單的下單事件
      Given 商品 "A" 的初始庫存為 "<stock>"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "<qty>"
      When 庫存服務收到訂單 "O1" 的下單事件 "<dup_id>"，商品 "A" 數量 "<qty>"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "<after>"

      Examples:
        | stock | qty | dup_id | after |
        | 10    | 3   | E1     | 7     |
        | 10    | 3   | E2     | 7     |
        | 2     | 5   | E1     | 2     |
        | 2     | 5   | E2     | 2     |

  @rule:R-INVENTORY_RESERVATION-006
  Rule: 沒有保留中的庫存時收到放回事件不動作
    Scenario Outline: 已放回後再收到放回事件
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      And 庫存服務已處理訂單 "O1" 的 "<first>" 事件 "E2"
      When 庫存服務收到訂單 "O1" 的 "<second>" 事件 "<second_id>"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "10"

      Examples:
        | first          | second         | second_id |
        | PaymentFailed  | PaymentFailed  | E2        |
        | PaymentFailed  | PaymentFailed  | E3        |
        | PaymentFailed  | OrderCancelled | E3        |
        | OrderCancelled | OrderCancelled | E2        |
        | OrderCancelled | PaymentFailed  | E3        |

    Scenario Outline: 被拒絕的訂單收到放回事件
      Given 商品 "A" 的初始庫存為 "2"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "5"
      When 庫存服務收到訂單 "O1" 的 "<type>" 事件 "E2"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "2"

      Examples:
        | type           |
        | PaymentFailed  |
        | OrderCancelled |

    Scenario: 已結束的訂單再收到放回事件
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的 "OrderCancelled" 事件 "E1"
      When 庫存服務收到訂單 "O1" 的 "OrderCancelled" 事件 "E2"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "10"

  @rule:R-INVENTORY_RESERVATION-007
  Rule: 查詢可用庫存回傳初始庫存減去保留中數量
    Scenario Outline: 查詢可用庫存
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      When 查詢商品 "<sku>" 的可用庫存
      Then 查詢結果為 "<result>"

      Examples:
        | sku | result |
        | A   | 7      |
        | Z   | 0      |

    Scenario: 放回後查詢可用庫存
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "3"
      And 庫存服務已處理訂單 "O1" 的 "PaymentFailed" 事件 "E2"
      When 查詢商品 "A" 的可用庫存
      Then 查詢結果為 "10"

  @rule:R-INVENTORY_RESERVATION-008
  Rule: 放回事件先於下單事件到達時記住訂單已結束
    Scenario Outline: 下單事件還沒到就收到放回事件
      Given 商品 "A" 的初始庫存為 "10"
      When 庫存服務收到訂單 "O1" 的 "<type>" 事件 "E1"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "10"

      Examples:
        | type           |
        | OrderCancelled |
        | PaymentFailed  |

  @rule:R-INVENTORY_RESERVATION-009
  Rule: 已結束的訂單之後收到下單事件不保留
    Scenario Outline: 已結束訂單的下單事件到達
      Given 商品 "A" 的初始庫存為 "10"
      And 庫存服務已處理訂單 "O1" 的 "<type>" 事件 "E1"
      When 庫存服務收到訂單 "O1" 的下單事件 "E2"，商品 "A" 數量 "3"
      Then 回傳空陣列
      And 商品 "A" 的可用庫存為 "10"

      Examples:
        | type           |
        | OrderCancelled |
        | PaymentFailed  |

  @rule:R-INVENTORY_RESERVATION-010
  Rule: 下單數量為零或負數時拒絕
    Scenario Outline: 數量不合法即拒絕
      Given 商品 "A" 的初始庫存為 "10"
      When 庫存服務收到訂單 "O1" 的下單事件 "E1"，商品 "A" 數量 "<qty>"
      Then 回傳事件為訂單 "O1" 的 "StockRejected"
      And 商品 "A" 的可用庫存為 "10"

      Examples:
        | qty |
        | 0   |
        | -1  |
