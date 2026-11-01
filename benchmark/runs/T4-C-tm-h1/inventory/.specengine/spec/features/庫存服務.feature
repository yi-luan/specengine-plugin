Feature: 庫存服務
  庫存服務負責為訂單保留與放回庫存，只透過事件與其他服務溝通。

  @rule:R-INVENTORY-000
  Rule: 主流程：庫存足夠時為訂單保留庫存
    Scenario Outline: 庫存足夠時保留，包含剛好相等
      Given 商品 "A-100" 的可供保留庫存為 "<stock>"
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "<qty>"
      Then 系統發出 "<event>" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "<left>"

      Examples:
        | stock | qty | event         | left |
        | 5     | 2   | StockReserved | 3    |
        | 5     | 5   | StockReserved | 0    |

  @rule:R-INVENTORY-001
  Rule: 庫存不足或商品不在庫存表時整筆拒絕
    Scenario Outline: 庫存不足時整筆拒絕，不部分保留
      Given 商品 "A-100" 的可供保留庫存為 "<stock>"
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "<qty>"
      Then 系統發出 "StockRejected" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "<stock>"

      Examples:
        | stock | qty |
        | 5     | 6   |
        | 1     | 2   |

    Scenario: 商品不在庫存表時視為庫存 0
      When 收到下單 訂單 "O-1" 商品 "B-200" 數量 "1"
      Then 系統發出 "StockRejected" 訂單 "O-1"
      And 系統不發出 "StockReserved" 訂單 "O-1"

  @rule:R-INVENTORY-002
  Rule: 付款失敗時放回該訂單實際保留的數量
    Scenario: 付款失敗後放回實際保留的數量
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已保留 "2" 個商品 "A-100"
      When 收到付款失敗 訂單 "O-1"
      Then 系統發出 "StockReleased" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "5"

  @rule:R-INVENTORY-003
  Rule: 取消時放回該訂單實際保留的數量
    Scenario: 取消後放回實際保留的數量並發出 StockReleased
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已保留 "2" 個商品 "A-100"
      When 收到取消 訂單 "O-1"
      Then 系統發出 "StockReleased" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "5"

  @rule:R-INVENTORY-004
  Rule: 數量不是正整數時不保留
    Scenario Outline: 數量為零或負數時整筆拒絕
      Given 商品 "A-100" 的可供保留庫存為 "5"
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "<qty>"
      Then 系統發出 "StockRejected" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "5"

      Examples:
        | qty |
        | 0   |
        | -1  |

  @rule:R-INVENTORY-005
  Rule: 同一事件重複送達時直接忽略
    Scenario: 同一事件再次送達不改狀態、不發事件
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已保留 "2" 個商品 "A-100"
      When 同一事件再次送達
      Then 系統不發出任何事件
      And 商品 "A-100" 的可供保留庫存為 "3"

  @rule:R-INVENTORY-006
  Rule: 取消先於下單抵達時記住已取消
    Scenario: 取消先到，之後的下單不保留也不發事件
      Given 商品 "A-100" 的可供保留庫存為 "5"
      When 收到取消 訂單 "O-1"
      Then 系統不發出任何事件
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "2"
      Then 系統不發出任何事件
      And 商品 "A-100" 的可供保留庫存為 "5"

  @rule:R-INVENTORY-007
  Rule: 已記為已取消或付款失敗的訂單收到下單時不保留
    Scenario: 已取消的訂單收到下單
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已被記為已取消
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "2"
      Then 系統不發出任何事件
      And 商品 "A-100" 的可供保留庫存為 "5"

    Scenario: 已付款失敗的訂單收到下單
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已被記為付款失敗
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "2"
      Then 系統不發出任何事件
      And 商品 "A-100" 的可供保留庫存為 "5"

  @rule:R-INVENTORY-008
  Rule: 沒有保留中的庫存時，放回事件不加庫存、不發 StockReleased
    Scenario: 已放回過的訂單再次收到付款失敗
      Given 商品 "A-100" 的可供保留庫存為 "5"
      And 訂單 "O-1" 已保留 "2" 個商品 "A-100"
      When 收到付款失敗 訂單 "O-1"
      And 收到付款失敗 訂單 "O-1"
      Then 系統不發出 "StockReleased" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "5"

    Scenario: 從未保留成功的訂單收到取消
      Given 商品 "A-100" 的可供保留庫存為 "1"
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "2"
      And 收到取消 訂單 "O-1"
      Then 系統不發出 "StockReleased" 訂單 "O-1"
      And 商品 "A-100" 的可供保留庫存為 "1"

  @rule:R-INVENTORY-009
  Rule: 付款失敗先於下單抵達時記住已付款失敗
    Scenario: 付款失敗先到，之後的下單不保留也不發事件
      Given 商品 "A-100" 的可供保留庫存為 "5"
      When 收到付款失敗 訂單 "O-1"
      Then 系統不發出任何事件
      When 收到下單 訂單 "O-1" 商品 "A-100" 數量 "2"
      Then 系統不發出任何事件
      And 商品 "A-100" 的可供保留庫存為 "5"
