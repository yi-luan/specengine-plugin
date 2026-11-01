Feature: 訂單服務
  顧客下單、取消訂單，訂單服務依庫存與付款服務送來的事件更新訂單狀態，並在下單後 15 分鐘未完成付款時自動取消。
  本服務只保存訂單狀態；庫存、付款的事件由測試自行建構後餵入。

  Background:
    Given 訂單服務已啟動

  @rule:R-ORDER_SERVICE-000
  Rule: 主流程：顧客下單後建立處理中訂單並發出 OrderPlaced
    Scenario: 正常下單
      When 顧客 "c1" 下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      Then 命令結果為成功
      And 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderPlaced"，訂單為 "o1"
      And 發出的 OrderPlaced 事件內容為顧客 "c1" 商品 "sku1" 數量 "2" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 所有發出的事件 id 皆為非空字串且互不重複
      And 訂單 "o1" 狀態為 "PENDING"
      And 訂單 "o1" 無取消原因

    Scenario: 連續下兩張訂單，事件 id 互不重複
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 顧客 "c2" 下單 "o2"，商品 "sku2" 數量 "1" 金額 "50"，下單時間 "2026-06-15T12:01:00Z"
      Then 命令結果為成功
      And 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderPlaced"，訂單為 "o2"
      And 所有發出的事件 id 皆為非空字串且互不重複
      And 訂單 "o1" 狀態為 "PENDING"
      And 訂單 "o2" 狀態為 "PENDING"

  @rule:R-ORDER_SERVICE-001
  Rule: 處理中訂單收到 PaymentSucceeded 變為已確認
    Scenario: 收到付款成功事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 訂單服務收到事件 "e1" 類型 "PaymentSucceeded" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CONFIRMED"
      And 訂單 "o1" 無取消原因

  @rule:R-ORDER_SERVICE-002
  Rule: 處理中訂單收到 StockRejected 變為庫存不足
    Scenario: 收到庫存不足事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 訂單服務收到事件 "e1" 類型 "StockRejected" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "REJECTED"
      And 訂單 "o1" 無取消原因

  @rule:R-ORDER_SERVICE-003
  Rule: 處理中訂單收到 PaymentFailed 變為付款失敗
    Scenario: 收到付款失敗事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 訂單服務收到事件 "e1" 類型 "PaymentFailed" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "FAILED"
      And 訂單 "o1" 無取消原因

  @rule:R-ORDER_SERVICE-004
  Rule: 處理中或已確認的訂單可由顧客取消，取消原因為 CUSTOMER
    Scenario: 取消處理中的訂單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:05:00Z"
      Then 命令結果為成功
      And 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderCancelled"，訂單為 "o1"
      And 所有發出的事件 id 皆為非空字串且互不重複
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

    Scenario: 取消已確認的訂單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已收到事件 "PaymentSucceeded"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:05:00Z"
      Then 命令結果為成功
      And 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderCancelled"，訂單為 "o1"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

    Scenario: 取消時間已超過下單 15 分鐘仍算顧客取消
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:30:00Z"
      Then 命令結果為成功
      And 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderCancelled"，訂單為 "o1"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

  @rule:R-ORDER_SERVICE-005
  Rule: 時間推進時，處理中且下單滿 15 分鐘的訂單自動取消，取消原因為 TIMEOUT
    Scenario Outline: 逾時 15 分鐘邊界
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 時間推進到 "<now>"
      Then 發出的事件數為 "<count>"
      And 訂單 "o1" 狀態為 "<status>"

      Examples:
        | now                  | count | status    |
        | 2026-06-15T12:00:00Z | 0     | PENDING   |
        | 2026-06-15T12:14:59Z | 0     | PENDING   |
        | 2026-06-15T12:15:00Z | 1     | CANCELLED |
        | 2026-06-15T12:15:01Z | 1     | CANCELLED |
        | 2026-06-15T13:00:00Z | 1     | CANCELLED |

    Scenario: 逾時取消發出 OrderCancelled 且原因為 TIMEOUT
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 時間推進到 "2026-06-15T12:15:00Z"
      Then 發出的事件數為 "1"
      And 第 "1" 個發出的事件類型為 "OrderCancelled"，訂單為 "o1"
      And 所有發出的事件 id 皆為非空字串且互不重複
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"

    Scenario: 多張逾時訂單各發一個事件，未逾時的不受影響
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 顧客 "c2" 已下單 "o2"，商品 "sku2" 數量 "1" 金額 "50"，下單時間 "2026-06-15T12:01:00Z"
      And 顧客 "c3" 已下單 "o3"，商品 "sku3" 數量 "3" 金額 "300"，下單時間 "2026-06-15T12:10:00Z"
      When 時間推進到 "2026-06-15T12:16:00Z"
      Then 發出的事件數為 "2"
      And 發出的事件中含訂單 "o1" 的 "OrderCancelled" 事件
      And 發出的事件中含訂單 "o2" 的 "OrderCancelled" 事件
      And 發出的事件中不含訂單 "o3" 的事件
      And 所有發出的事件 id 皆為非空字串且互不重複
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"
      And 訂單 "o2" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"
      And 訂單 "o3" 狀態為 "PENDING"

    Scenario Outline: 已離開處理中的訂單不受時間推進影響
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已收到事件 "<event>"
      When 時間推進到 "2026-06-15T12:30:00Z"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "<status>"
      And 訂單 "o1" 無取消原因

      Examples:
        | event            | status    |
        | PaymentSucceeded | CONFIRMED |
        | StockRejected    | REJECTED  |
        | PaymentFailed    | FAILED    |

    Scenario: 已被顧客取消的訂單不受時間推進影響
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已被顧客取消於 "2026-06-15T12:05:00Z"
      When 時間推進到 "2026-06-15T12:30:00Z"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

    Scenario: 已逾時取消的訂單再次推進時間不再發事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 時間已推進到 "2026-06-15T12:15:00Z"
      When 時間推進到 "2026-06-15T12:20:00Z"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"

  @rule:R-ORDER_SERVICE-006
  Rule: 相同事件 id 重複送達不產生額外效果
    Scenario Outline: 重複送達同一事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單服務已收到事件 "e1" 類型 "<type>" 訂單 "o1"
      When 訂單服務收到事件 "e1" 類型 "<type>" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "<status>"
      And 訂單 "o1" 無取消原因

      Examples:
        | type             | status    |
        | PaymentSucceeded | CONFIRMED |
        | StockRejected    | REJECTED  |
        | PaymentFailed    | FAILED    |

  @rule:R-ORDER_SERVICE-007
  Rule: 查詢不存在的訂單回傳 undefined
    Scenario: 查詢從未下單的訂單編號
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 查詢訂單 "o9"
      Then 訂單 "o9" 不存在

  @rule:R-ORDER_SERVICE-008
  Rule: 已離開處理中的訂單收到遲來或亂序的狀態事件一律忽略
    Scenario Outline: 已確認、庫存不足、付款失敗後再收到狀態事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已收到事件 "<first>"
      When 訂單服務收到事件 "e2" 類型 "<late>" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "<status>"
      And 訂單 "o1" 無取消原因

      Examples:
        | first            | late             | status    |
        | PaymentSucceeded | StockRejected    | CONFIRMED |
        | PaymentSucceeded | PaymentFailed    | CONFIRMED |
        | PaymentSucceeded | PaymentSucceeded | CONFIRMED |
        | StockRejected    | PaymentSucceeded | REJECTED  |
        | StockRejected    | PaymentFailed    | REJECTED  |
        | PaymentFailed    | PaymentSucceeded | FAILED    |
        | PaymentFailed    | StockRejected    | FAILED    |

    Scenario Outline: 顧客取消後再收到狀態事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已被顧客取消於 "2026-06-15T12:05:00Z"
      When 訂單服務收到事件 "e2" 類型 "<late>" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

      Examples:
        | late             |
        | PaymentSucceeded |
        | StockRejected    |
        | PaymentFailed    |

    Scenario: 逾時取消後才收到付款成功事件
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 時間已推進到 "2026-06-15T12:15:00Z"
      When 訂單服務收到事件 "e2" 類型 "PaymentSucceeded" 訂單 "o1"
      Then 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"

  @rule:R-ORDER_SERVICE-009
  Rule: 庫存不足、付款失敗、已取消的訂單不可取消，回傳 NOT_CANCELLABLE
    Scenario Outline: 取消已結束的訂單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已收到事件 "<event>"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:05:00Z"
      Then 命令結果為失敗，原因 "NOT_CANCELLABLE"
      And 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "<status>"
      And 訂單 "o1" 無取消原因

      Examples:
        | event         | status   |
        | StockRejected | REJECTED |
        | PaymentFailed | FAILED   |

    Scenario: 重複取消已被顧客取消的訂單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已被顧客取消於 "2026-06-15T12:05:00Z"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:06:00Z"
      Then 命令結果為失敗，原因 "NOT_CANCELLABLE"
      And 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

    Scenario: 取消已逾時自動取消的訂單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 時間已推進到 "2026-06-15T12:15:00Z"
      When 顧客取消訂單 "o1" 於 "2026-06-15T12:16:00Z"
      Then 命令結果為失敗，原因 "NOT_CANCELLABLE"
      And 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "TIMEOUT"

  @rule:R-ORDER_SERVICE-010
  Rule: 取消不存在的訂單回傳 ORDER_NOT_FOUND
    Scenario: 取消從未下單的訂單編號
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 顧客取消訂單 "o9" 於 "2026-06-15T12:05:00Z"
      Then 命令結果為失敗，原因 "ORDER_NOT_FOUND"
      And 發出的事件數為 "0"
      And 訂單 "o9" 不存在
      And 訂單 "o1" 狀態為 "PENDING"

  @rule:R-ORDER_SERVICE-011
  Rule: 以已使用的訂單編號再次下單回傳 DUPLICATE_ORDER
    Scenario: 處理中訂單的編號再次下單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      When 顧客 "c2" 下單 "o1"，商品 "sku2" 數量 "1" 金額 "50"，下單時間 "2026-06-15T12:01:00Z"
      Then 命令結果為失敗，原因 "DUPLICATE_ORDER"
      And 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "PENDING"

    Scenario: 已取消訂單的編號再次下單
      Given 顧客 "c1" 已下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:00:00Z"
      And 訂單 "o1" 已被顧客取消於 "2026-06-15T12:05:00Z"
      When 顧客 "c1" 下單 "o1"，商品 "sku1" 數量 "2" 金額 "100"，下單時間 "2026-06-15T12:06:00Z"
      Then 命令結果為失敗，原因 "DUPLICATE_ORDER"
      And 發出的事件數為 "0"
      And 訂單 "o1" 狀態為 "CANCELLED"，取消原因為 "CUSTOMER"

  @rule:R-ORDER_SERVICE-012
  Rule: 數量、金額非正整數或識別字為空字串的下單回傳 INVALID_INPUT
    Scenario Outline: 輸入不合法
      When 顧客 "<customer>" 下單 "<orderId>"，商品 "<sku>" 數量 "<qty>" 金額 "<amount>"，下單時間 "2026-06-15T12:00:00Z"
      Then 命令結果為失敗，原因 "INVALID_INPUT"
      And 發出的事件數為 "0"
      And 訂單 "<orderId>" 不存在

      Examples:
        | customer | orderId | sku  | qty | amount |
        | c1       | o1      | sku1 | 0   | 100    |
        | c1       | o1      | sku1 | -1  | 100    |
        | c1       | o1      | sku1 | 1.5 | 100    |
        | c1       | o1      | sku1 | 2   | 0      |
        | c1       | o1      | sku1 | 2   | -5     |
        | c1       | o1      | sku1 | 2   | 2.5    |
        | c1       |         | sku1 | 2   | 100    |
        |          | o1      | sku1 | 2   | 100    |
        | c1       | o1      |      | 2   | 100    |

  @rule:R-ORDER_SERVICE-013
  Rule: 未知訂單編號的狀態事件一律忽略
    Scenario Outline: 收到從未建立過的訂單的狀態事件
      When 訂單服務收到事件 "e1" 類型 "<type>" 訂單 "o9"
      Then 發出的事件數為 "0"
      And 訂單 "o9" 不存在

      Examples:
        | type             |
        | PaymentSucceeded |
        | StockRejected    |
        | PaymentFailed    |
