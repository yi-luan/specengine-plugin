Feature: 訂單服務（OrderService）
  訂單服務只保存訂單本身的狀態，透過事件與庫存、付款服務溝通。
  事件可能重複、可能亂序，訂單服務必須冪等。

  Background:
    Given 一個全新的訂單服務

  # ---- 下單 ----

  Scenario: 顧客下單後訂單為處理中並發出 OrderPlaced
    When 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    Then 下單成功
    And 應發出 1 個 "OrderPlaced" 事件，內容為 orderId "o1"、customerId "c1"、sku "sku-a"、qty 2、amount 500、at "2026-06-15T12:00:00Z"
    And 訂單 "o1" 狀態為 "PENDING"

  Scenario: 重複的訂單編號下單失敗
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 顧客 "c2" 於 "2026-06-15T12:01:00Z" 下單 "o1"，商品 "sku-b" 數量 1 金額 100
    Then 下單失敗
    And 訂單 "o1" 狀態為 "PENDING"

  Scenario Outline: 數量或金額不是合法整數時下單失敗
    When 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 <qty> 金額 <amount>
    Then 下單失敗
    And 查無訂單 "o1"

    Examples:
      | qty | amount |
      | 0   | 500    |
      | -1  | 500    |
      | 1.5 | 500    |
      | 2   | -1     |
      | 2   | 10.5   |

  Scenario: 下單時間格式錯誤時下單失敗
    When 顧客 "c1" 於 "not-a-time" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    Then 下單失敗
    And 查無訂單 "o1"

  Scenario: 查詢不存在的訂單
    Then 查無訂單 "nope"

  # ---- 由其他服務送來的事件推進狀態 ----

  Scenario: 收到 PaymentSucceeded 訂單變為已確認
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 收到事件 "StockReserved" 訂單 "o1"
    Then 不應發出任何事件
    When 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CONFIRMED"

  Scenario: 收到 StockRejected 訂單變為庫存不足
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 收到事件 "StockRejected" 訂單 "o1"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "REJECTED"

  Scenario: 收到 PaymentFailed 訂單變為付款失敗
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 收到事件 "PaymentFailed" 訂單 "o1"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "FAILED"

  Scenario Outline: 訂單服務不關心的事件直接回傳空陣列且不改狀態
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 收到事件 "<type>" 訂單 "o1"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "PENDING"

    Examples:
      | type            |
      | OrderPlaced     |
      | StockReserved   |
      | StockReleased   |
      | PaymentRefunded |
      | OrderCancelled  |

  Scenario: 收到不認識訂單的事件直接忽略
    When 收到事件 "PaymentSucceeded" 訂單 "ghost" 金額 100
    Then 不應發出任何事件
    And 查無訂單 "ghost"

  # ---- 顧客取消 ----

  Scenario: 處理中的訂單可由顧客取消並發出 OrderCancelled
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "o1"
    Then 取消成功
    And 應發出 1 個 "OrderCancelled" 事件，訂單 "o1"
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "CUSTOMER"

  Scenario: 已確認（已付款）的訂單可由顧客取消，由付款服務依 OrderCancelled 退款
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    When 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "o1"
    Then 取消成功
    And 應發出 1 個 "OrderCancelled" 事件，訂單 "o1"
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "CUSTOMER"

  Scenario Outline: 已結束的訂單不可再取消
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 收到事件 "<type>" 訂單 "o1"
    When 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "o1"
    Then 取消失敗
    And 訂單 "o1" 狀態為 "<status>"

    Examples:
      | type          | status   |
      | StockRejected | REJECTED |
      | PaymentFailed | FAILED   |

  Scenario: 重複取消同一張訂單第二次失敗且不再發事件
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "o1"
    When 顧客於 "2026-06-15T12:06:00Z" 取消訂單 "o1"
    Then 取消失敗
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "CUSTOMER"

  Scenario: 取消不存在的訂單失敗
    When 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "nope"
    Then 取消失敗

  # ---- 15 分鐘逾時自動取消 ----

  Scenario: 下單後未滿 15 分鐘不會自動取消
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 時間推進到 "2026-06-15T12:14:59Z"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "PENDING"

  Scenario: 下單滿 15 分鐘仍未付款則自動取消並發出 OrderCancelled
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 收到事件 "StockReserved" 訂單 "o1"
    When 時間推進到 "2026-06-15T12:15:00Z"
    Then 應發出 1 個 "OrderCancelled" 事件，訂單 "o1"
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "TIMEOUT"

  Scenario: 已付款的訂單不會因逾時被取消
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    When 時間推進到 "2026-06-15T13:00:00Z"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CONFIRMED"

  Scenario: 庫存不足或付款失敗的訂單不會再被逾時取消
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 顧客 "c2" 於 "2026-06-15T12:00:00Z" 下單 "o2"，商品 "sku-b" 數量 1 金額 100
    And 收到事件 "StockRejected" 訂單 "o1"
    And 收到事件 "PaymentFailed" 訂單 "o2"
    When 時間推進到 "2026-06-15T13:00:00Z"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "REJECTED"
    And 訂單 "o2" 狀態為 "FAILED"

  Scenario: 多張訂單只有逾時的那些會被取消，且同一次逾時只發一次
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 顧客 "c2" 於 "2026-06-15T12:10:00Z" 下單 "o2"，商品 "sku-b" 數量 1 金額 100
    When 時間推進到 "2026-06-15T12:20:00Z"
    Then 應發出 1 個 "OrderCancelled" 事件，訂單 "o1"
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "TIMEOUT"
    And 訂單 "o2" 狀態為 "PENDING"
    When 時間推進到 "2026-06-15T12:20:00Z"
    Then 不應發出任何事件
    When 時間推進到 "2026-06-15T12:25:00Z"
    Then 應發出 1 個 "OrderCancelled" 事件，訂單 "o2"
    And 訂單 "o2" 狀態為 "CANCELLED"，取消原因 "TIMEOUT"

  Scenario: 逾時取消後才送達的 PaymentSucceeded 不會改變狀態
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 時間推進到 "2026-06-15T12:15:00Z"
    When 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "TIMEOUT"

  # ---- 至少一次送達：重複與亂序 ----

  Scenario: 同一個事件重複送達只處理一次
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    When 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500，事件 id "evt-1"
    And 再次收到相同的事件
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CONFIRMED"

  Scenario: 已確認的訂單收到晚到的 StockRejected 或 PaymentFailed 不會改變狀態
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    When 收到事件 "StockRejected" 訂單 "o1"
    And 收到事件 "PaymentFailed" 訂單 "o1"
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CONFIRMED"

  Scenario: 顧客取消後才送達的 PaymentSucceeded 不會把訂單變回已確認
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "o1"
    When 收到事件 "PaymentSucceeded" 訂單 "o1" 金額 500
    Then 不應發出任何事件
    And 訂單 "o1" 狀態為 "CANCELLED"，取消原因 "CUSTOMER"

  Scenario: 訂單服務發出的事件 id 全部唯一且有服務前綴
    Given 顧客 "c1" 於 "2026-06-15T12:00:00Z" 下單 "o1"，商品 "sku-a" 數量 2 金額 500
    And 顧客 "c2" 於 "2026-06-15T12:00:00Z" 下單 "o2"，商品 "sku-b" 數量 1 金額 100
    And 顧客於 "2026-06-15T12:01:00Z" 取消訂單 "o1"
    And 時間推進到 "2026-06-15T12:15:00Z"
    Then 目前為止發出的事件 id 全部不重複且皆以 "order-" 開頭
