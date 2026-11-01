Feature: 事件驅動下單流程

  Scenario: 庫存與餘額都足夠時訂單確認
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "CONFIRMED"
    And 庫存 "SKU-1" 可用數量為 8
    And 顧客 "C1" 餘額為 700

  Scenario: 庫存不足時訂單被拒絕且不扣款
    Given 庫存 "SKU-1" 有 1 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "REJECTED"
    And 庫存 "SKU-1" 可用數量為 1
    And 顧客 "C1" 餘額為 1000
    And 系統發出過 "PaymentSucceeded" 事件 0 次

  Scenario: 餘額不足時付款失敗並放回庫存
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 100
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "FAILED"
    And 庫存 "SKU-1" 可用數量為 10
    And 顧客 "C1" 餘額為 100
    And 系統發出過 "StockReleased" 事件 1 次

  Scenario: 已確認的訂單被取消後庫存放回且款項退還
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:05:00Z"
    And 系統處理完所有事件
    Then 操作成功
    And 訂單 "O1" 狀態為 "CANCELLED" 且取消原因為 "CUSTOMER"
    And 庫存 "SKU-1" 可用數量為 10
    And 顧客 "C1" 餘額為 1000
    And 系統發出過 "PaymentRefunded" 事件 1 次

  Scenario: 處理中的訂單被取消後不會扣款
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:01:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "CANCELLED" 且取消原因為 "CUSTOMER"
    And 庫存 "SKU-1" 可用數量為 10
    And 顧客 "C1" 餘額為 1000
    And 系統發出過 "PaymentSucceeded" 事件 0 次

  Scenario: 下單後 15 分鐘內未付款會自動取消
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 時間推進到 "2026-06-15T12:14:59Z"
    Then 訂單 "O1" 狀態為 "PENDING"
    When 時間推進到 "2026-06-15T12:15:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "CANCELLED" 且取消原因為 "TIMEOUT"
    And 庫存 "SKU-1" 可用數量為 10
    And 顧客 "C1" 餘額為 1000

  Scenario: 已付款的訂單不會因逾時而取消
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    And 時間推進到 "2026-06-15T13:00:00Z"
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "CONFIRMED"
    And 顧客 "C1" 餘額為 700

  Scenario: 事件重複送達時結果不變
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件且每個事件都重複送達
    Then 訂單 "O1" 狀態為 "CONFIRMED"
    And 庫存 "SKU-1" 可用數量為 8
    And 顧客 "C1" 餘額為 700
    And 系統發出過 "PaymentSucceeded" 事件 1 次
    And 系統發出過 "StockReserved" 事件 1 次

  Scenario: 取消事件比下單事件先送達時結果仍正確
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:01:00Z"
    And 待送達的事件順序反轉
    And 系統處理完所有事件
    Then 訂單 "O1" 狀態為 "CANCELLED" 且取消原因為 "CUSTOMER"
    And 庫存 "SKU-1" 可用數量為 10
    And 顧客 "C1" 餘額為 1000
    And 系統發出過 "PaymentSucceeded" 事件 0 次

  Scenario: 數量必須為正整數
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 0 金額 300 時間 "2026-06-15T12:00:00Z"
    Then 操作失敗，原因為 "INVALID_INPUT"

  Scenario: 訂單編號不可重複
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    Then 操作失敗，原因為 "DUPLICATE_ORDER"

  Scenario: 已取消的訂單不能再次取消
    Given 庫存 "SKU-1" 有 10 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:01:00Z"
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:02:00Z"
    Then 操作失敗，原因為 "INVALID_STATE"

  Scenario: 庫存不足被拒絕的訂單不能取消
    Given 庫存 "SKU-1" 有 1 件
    And 顧客 "C1" 餘額 1000
    When 顧客 "C1" 下單 "O1" 商品 "SKU-1" 數量 2 金額 300 時間 "2026-06-15T12:00:00Z"
    And 系統處理完所有事件
    And 顧客取消訂單 "O1" 時間 "2026-06-15T12:01:00Z"
    Then 操作失敗，原因為 "INVALID_STATE"
