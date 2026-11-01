Feature: 事件驅動下單流程
  訂單、庫存、付款三個服務只透過事件溝通：下單後保留庫存、扣款、確認訂單；
  付款失敗或取消時放回庫存與退款；逾時自動取消；事件至少送達一次、可能重複、不保證順序。

  @rule:R-ORDER_SAGA-000
  Rule: 主流程：下單、保留庫存、扣款、訂單已確認
    Scenario: 庫存與餘額皆足夠時全部事件依序送達
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "300" 時間 "2026-06-15T12:00:00Z"
      And 所有待傳遞的事件依序廣播給三個服務直到沒有新事件
      Then 訂單 "O1" 的狀態為 "CONFIRMED"
      And SKU "A" 的可用庫存為 "7"
      And 顧客 "C1" 的餘額為 "200"

  @rule:R-ORDER_SAGA-001
  Rule: 下單建立處理中訂單並發出 OrderPlaced
    Scenario: 合法輸入且訂單編號未存在
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "300" 時間 "2026-06-15T12:00:00Z"
      Then 指令結果為 "成功"
      And 本次產生的事件為 "OrderPlaced"
      And 本次產生的事件 "OrderPlaced" 內容為 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "300" 時間 "2026-06-15T12:00:00Z"
      And 訂單 "O1" 的狀態為 "PENDING"
      And 訂單 "O1" 沒有取消原因

  @rule:R-ORDER_SAGA-002
  Rule: 庫存足夠時保留庫存並發出 StockReserved
    Scenario Outline: 可用庫存大於或等於數量
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "<qty>" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      Then 本次產生的事件為 "StockReserved"
      And 本次產生的事件皆屬於訂單 "O1"
      And SKU "A" 的可用庫存為 "<remaining>"

      Examples:
        | qty | remaining |
        | 1   | 9         |
        | 10  | 0         |

  @rule:R-ORDER_SAGA-003
  Rule: 庫存不足時發出 StockRejected 且庫存不變
    Scenario Outline: 可用庫存小於數量或 SKU 未登錄
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "<sku>" 數量 "<qty>" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      Then 本次產生的事件為 "StockRejected"
      And 本次產生的事件皆屬於訂單 "O1"
      And SKU "A" 的可用庫存為 "10"

      Examples:
        | sku | qty |
        | A   | 11  |
        | B   | 1   |

  @rule:R-ORDER_SAGA-004
  Rule: 餘額足夠時扣款並發出 PaymentSucceeded
    Scenario Outline: 餘額大於或等於訂單金額
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "<balance>"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "<amount>" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      Then 本次產生的事件為 "PaymentSucceeded"
      And 本次產生的事件皆屬於訂單 "O1"
      And 本次產生的事件 "PaymentSucceeded" 的金額為 "<amount>"
      And 顧客 "C1" 的餘額為 "<remaining>"

      Examples:
        | balance | amount | remaining |
        | 500     | 300    | 200       |
        | 300     | 300    | 0         |

  @rule:R-ORDER_SAGA-005
  Rule: 餘額不足時發出 PaymentFailed 且餘額不變
    Scenario Outline: 餘額小於訂單金額或顧客未登錄
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "300"
      When 顧客下單 訂單 "O1" 顧客 "<customer>" SKU "A" 數量 "1" 金額 "<amount>" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      Then 本次產生的事件為 "PaymentFailed"
      And 本次產生的事件皆屬於訂單 "O1"
      And 顧客 "C1" 的餘額為 "300"

      Examples:
        | customer | amount |
        | C1       | 301    |
        | C9       | 1      |

  @rule:R-ORDER_SAGA-006
  Rule: 處理中訂單收到 PaymentSucceeded 變為已確認
    Scenario: 訂單服務收到 PaymentSucceeded
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "CONFIRMED"

  @rule:R-ORDER_SAGA-007
  Rule: 處理中訂單收到 StockRejected 變為庫存不足
    Scenario: 訂單服務收到 StockRejected
      Given 庫存服務 SKU "A" 的初始庫存為 "1"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "2" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockRejected" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "REJECTED"

  @rule:R-ORDER_SAGA-008
  Rule: 處理中訂單收到 PaymentFailed 變為付款失敗
    Scenario: 訂單服務收到 PaymentFailed
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "50"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentFailed" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "FAILED"

  @rule:R-ORDER_SAGA-009
  Rule: 付款失敗時庫存服務放回保留庫存並發出 StockReleased
    Scenario: 庫存服務收到有保留訂單的 PaymentFailed
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "50"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentFailed" 送達 "庫存服務"
      Then 本次產生的事件為 "StockReleased"
      And 本次產生的事件皆屬於訂單 "O1"
      And SKU "A" 的可用庫存為 "10"

  @rule:R-ORDER_SAGA-010
  Rule: 顧客可取消處理中或已確認的訂單
    Scenario: 取消處理中的訂單
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      Then 指令結果為 "成功"
      And 本次產生的事件為 "OrderCancelled"
      And 本次產生的事件皆屬於訂單 "O1"
      And 訂單 "O1" 的狀態為 "CANCELLED"
      And 訂單 "O1" 的取消原因為 "CUSTOMER"

    Scenario: 取消已確認的訂單
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      Then 指令結果為 "成功"
      And 本次產生的事件為 "OrderCancelled"
      And 訂單 "O1" 的狀態為 "CANCELLED"
      And 訂單 "O1" 的取消原因為 "CUSTOMER"

  @rule:R-ORDER_SAGA-011
  Rule: 取消時庫存服務放回保留庫存並發出 StockReleased
    Scenario: 庫存服務收到有保留訂單的 OrderCancelled
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "4" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "OrderCancelled" 送達 "庫存服務"
      Then 本次產生的事件為 "StockReleased"
      And 本次產生的事件皆屬於訂單 "O1"
      And SKU "A" 的可用庫存為 "10"

  @rule:R-ORDER_SAGA-012
  Rule: 取消時付款服務退還已扣款項並發出 PaymentRefunded
    Scenario: 付款服務收到已扣款訂單的 OrderCancelled
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "300" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "OrderCancelled" 送達 "付款服務"
      Then 本次產生的事件為 "PaymentRefunded"
      And 本次產生的事件皆屬於訂單 "O1"
      And 本次產生的事件 "PaymentRefunded" 的金額為 "300"
      And 顧客 "C1" 的餘額為 "500"

  @rule:R-ORDER_SAGA-013
  Rule: 處理中訂單下單滿 15 分鐘未完成付款則自動取消
    Scenario Outline: 時間推進到逾時邊界
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 訂單服務時間推進到 "<now>"
      Then 本次產生的事件為 "<events>"
      And 訂單 "O1" 的狀態為 "<status>"

      Examples:
        | now                  | events         | status    |
        | 2026-06-15T12:14:59Z | 無             | PENDING   |
        | 2026-06-15T12:15:00Z | OrderCancelled | CANCELLED |

    Scenario: 多張訂單只有逾時的被取消且取消原因為 TIMEOUT
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 顧客下單 訂單 "O2" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:01:00Z"
      And 顧客下單 訂單 "O3" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:10:00Z"
      And 訂單服務時間推進到 "2026-06-15T12:16:00Z"
      Then 本次產生的事件為 "OrderCancelled,OrderCancelled"
      And 訂單 "O1" 的狀態為 "CANCELLED"
      And 訂單 "O1" 的取消原因為 "TIMEOUT"
      And 訂單 "O2" 的狀態為 "CANCELLED"
      And 訂單 "O2" 的取消原因為 "TIMEOUT"
      And 訂單 "O3" 的狀態為 "PENDING"

    Scenario: 已確認的訂單不會被逾時取消
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      And 訂單服務時間推進到 "2026-06-15T12:30:00Z"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "CONFIRMED"

  @rule:R-ORDER_SAGA-014
  Rule: 服務收到不關心的事件類型時回傳空陣列且狀態不變
    Scenario Outline: 各服務收到不關心的事件
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的外來事件 "<type>" 送達 "<service>"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "PENDING"
      And SKU "A" 的可用庫存為 "10"
      And 顧客 "C1" 的餘額為 "500"

      Examples:
        | service  | type             |
        | 訂單服務 | OrderPlaced      |
        | 訂單服務 | StockReserved    |
        | 訂單服務 | StockReleased    |
        | 訂單服務 | PaymentRefunded  |
        | 訂單服務 | OrderCancelled   |
        | 庫存服務 | StockReserved    |
        | 庫存服務 | StockRejected    |
        | 庫存服務 | StockReleased    |
        | 庫存服務 | PaymentSucceeded |
        | 庫存服務 | PaymentRefunded  |
        | 付款服務 | StockRejected    |
        | 付款服務 | StockReleased    |
        | 付款服務 | PaymentSucceeded |
        | 付款服務 | PaymentFailed    |
        | 付款服務 | PaymentRefunded  |

  @rule:R-ORDER_SAGA-015
  Rule: 同一事件重複送達不產生第二次效果且回傳空陣列
    Scenario: 庫存服務重複收到 OrderPlaced
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      Then 本次產生的事件為 "無"
      And SKU "A" 的可用庫存為 "7"

    Scenario: 付款服務重複收到 StockReserved
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      Then 本次產生的事件為 "無"
      And 顧客 "C1" 的餘額為 "400"

    Scenario: 訂單服務重複收到 PaymentSucceeded
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "CONFIRMED"

  @rule:R-ORDER_SAGA-016
  Rule: 所有事件的 id 全系統唯一
    Scenario: 完整下單、確認、取消、退款流程後所有事件 id 不重複
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 顧客下單 訂單 "O2" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 所有待傳遞的事件依序廣播給三個服務直到沒有新事件
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 所有待傳遞的事件依序廣播給三個服務直到沒有新事件
      Then 系統內所有已發出事件的 id 皆不重複

  @rule:R-ORDER_SAGA-017
  Rule: 重複的訂單編號下單被拒絕
    Scenario: 以相同訂單編號再次下單
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 顧客下單 訂單 "O1" 顧客 "C2" SKU "B" 數量 "5" 金額 "999" 時間 "2026-06-15T12:01:00Z"
      Then 指令結果為失敗，原因 "DUPLICATE_ORDER"
      And 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "PENDING"

  @rule:R-ORDER_SAGA-018
  Rule: 下單輸入不合法時拒絕且不建立訂單
    Scenario Outline: 數量或金額非正整數或識別字為空字串
      When 顧客下單 訂單 "<orderId>" 顧客 "<customerId>" SKU "<sku>" 數量 "<qty>" 金額 "<amount>" 時間 "2026-06-15T12:00:00Z"
      Then 指令結果為失敗，原因 "INVALID_INPUT"
      And 本次產生的事件為 "無"
      And 訂單 "O1" 不存在

      Examples:
        | orderId | customerId | sku | qty | amount |
        | O1      | C1         | A   | 0   | 100    |
        | O1      | C1         | A   | -1  | 100    |
        | O1      | C1         | A   | 1.5 | 100    |
        | O1      | C1         | A   | 1   | 0      |
        | O1      | C1         | A   | 1   | -100   |
        | O1      | C1         | A   | 1   | 2.5    |
        |         | C1         | A   | 1   | 100    |
        | O1      |            | A   | 1   | 100    |
        | O1      | C1         |     | 1   | 100    |

  @rule:R-ORDER_SAGA-019
  Rule: 取消不存在的訂單被拒絕
    Scenario: 取消從未下單的訂單編號
      When 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O9"
      Then 指令結果為失敗，原因 "ORDER_NOT_FOUND"
      And 本次產生的事件為 "無"

  @rule:R-ORDER_SAGA-020
  Rule: 庫存不足、付款失敗或已取消的訂單不可取消
    Scenario: 取消庫存不足的訂單
      Given 庫存服務 SKU "A" 的初始庫存為 "1"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "2" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockRejected" 送達 "訂單服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      Then 指令結果為失敗，原因 "NOT_CANCELLABLE"
      And 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "REJECTED"

    Scenario: 取消付款失敗的訂單
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "50"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "PaymentFailed" 送達 "訂單服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      Then 指令結果為失敗，原因 "NOT_CANCELLABLE"
      And 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "FAILED"

    Scenario: 取消已取消的訂單
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 顧客於 "2026-06-15T12:06:00Z" 取消訂單 "O1"
      Then 指令結果為失敗，原因 "NOT_CANCELLABLE"
      And 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "CANCELLED"
      And 訂單 "O1" 的取消原因為 "CUSTOMER"

  @rule:R-ORDER_SAGA-021
  Rule: 庫存服務無保留可放回時不發事件並記為已結束
    Scenario: 庫存不足被拒的訂單被取消後收到 OrderCancelled
      Given 庫存服務 SKU "A" 的初始庫存為 "1"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "2" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "OrderCancelled" 送達 "庫存服務"
      Then 本次產生的事件為 "無"
      And SKU "A" 的可用庫存為 "1"

    Scenario: 尚未收到 OrderPlaced 就收到 PaymentFailed
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的外來事件 "PaymentFailed" 送達 "庫存服務"
      Then 本次產生的事件為 "無"
      And SKU "A" 的可用庫存為 "10"

  @rule:R-ORDER_SAGA-022
  Rule: 付款服務無扣款可退時不發事件並記為已結束
    Scenario: 尚未扣款的訂單被取消後收到 OrderCancelled
      Given 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "OrderCancelled" 送達 "付款服務"
      Then 本次產生的事件為 "無"
      And 顧客 "C1" 的餘額為 "500"

  @rule:R-ORDER_SAGA-023
  Rule: 非處理中或不存在的訂單收到結果事件時狀態不變
    Scenario: 已取消的訂單收到 PaymentSucceeded
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "PaymentSucceeded" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "CANCELLED"
      And 訂單 "O1" 的取消原因為 "CUSTOMER"

    Scenario Outline: 已確認、庫存不足或付款失敗的訂單收到其他結果事件
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的外來事件 "<first>" 送達 "訂單服務"
      And 將訂單 "O1" 的外來事件 "<second>" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O1" 的狀態為 "<status>"

      Examples:
        | first            | second           | status    |
        | PaymentSucceeded | PaymentFailed    | CONFIRMED |
        | PaymentSucceeded | StockRejected    | CONFIRMED |
        | StockRejected    | PaymentSucceeded | REJECTED  |
        | PaymentFailed    | PaymentSucceeded | FAILED    |

    Scenario Outline: 不存在的訂單收到結果事件
      When 將訂單 "O9" 的外來事件 "<type>" 送達 "訂單服務"
      Then 本次產生的事件為 "無"
      And 訂單 "O9" 不存在

      Examples:
        | type             |
        | PaymentSucceeded |
        | StockRejected    |
        | PaymentFailed    |

  @rule:R-ORDER_SAGA-024
  Rule: 庫存服務先收到終結事件後才收到 OrderPlaced 時不保留
    Scenario Outline: 終結事件先到、OrderPlaced 後到
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "3" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的外來事件 "<terminal>" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      Then 本次產生的事件為 "無"
      And SKU "A" 的可用庫存為 "10"

      Examples:
        | terminal       |
        | OrderCancelled |
        | PaymentFailed  |

  @rule:R-ORDER_SAGA-025
  Rule: 付款服務先收到 OrderCancelled 後才收到 StockReserved 時不扣款
    Scenario: OrderCancelled 先到、StockReserved 後到
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 顧客於 "2026-06-15T12:05:00Z" 取消訂單 "O1"
      And 將訂單 "O1" 的事件 "OrderCancelled" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      Then 本次產生的事件為 "無"
      And 顧客 "C1" 的餘額為 "500"

  @rule:R-ORDER_SAGA-026
  Rule: 付款服務收到 OrderPlaced 時只記下顧客與金額
    Scenario: 付款服務收到 OrderPlaced
      Given 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      Then 本次產生的事件為 "無"
      And 顧客 "C1" 的餘額為 "500"

  @rule:R-ORDER_SAGA-027
  Rule: 查詢未登錄的 SKU 或顧客回傳 0
    Scenario: 查詢未登錄的 SKU 與顧客
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      Then SKU "Z" 的可用庫存為 "0"
      And 顧客 "X" 的餘額為 "0"

  @rule:R-ORDER_SAGA-028
  Rule: 付款服務先收到 StockReserved 後才收到 OrderPlaced 時先暫存
    Scenario: StockReserved 先到時不扣款
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "500"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      Then 本次產生的事件為 "無"
      And 顧客 "C1" 的餘額為 "500"

  @rule:R-ORDER_SAGA-029
  Rule: 暫存的保留在 OrderPlaced 到達時立即扣款或失敗
    Scenario Outline: OrderPlaced 晚到時依餘額判定
      Given 庫存服務 SKU "A" 的初始庫存為 "10"
      And 付款服務顧客 "C1" 的初始餘額為 "<balance>"
      When 顧客下單 訂單 "O1" 顧客 "C1" SKU "A" 數量 "1" 金額 "100" 時間 "2026-06-15T12:00:00Z"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "庫存服務"
      And 將訂單 "O1" 的事件 "StockReserved" 送達 "付款服務"
      And 將訂單 "O1" 的事件 "OrderPlaced" 送達 "付款服務"
      Then 本次產生的事件為 "<events>"
      And 本次產生的事件皆屬於訂單 "O1"
      And 顧客 "C1" 的餘額為 "<remaining>"

      Examples:
        | balance | events           | remaining |
        | 500     | PaymentSucceeded | 400       |
        | 50      | PaymentFailed    | 50        |
