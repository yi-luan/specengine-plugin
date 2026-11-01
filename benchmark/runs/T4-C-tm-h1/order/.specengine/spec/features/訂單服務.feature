Feature: 訂單服務
  訂單服務負責下單、取消與逾時自動取消，並依收到的付款與庫存事件更新訂單狀態。
  訂單服務只保存自己的狀態，只透過事件與其他服務溝通。

  @rule:R-ORDER_SERVICE-000
  Rule: 下單建立處理中訂單並發出 OrderPlaced
    Scenario: 合法下單建立處理中訂單
      Given 訂單編號 "ORD-1" 尚未存在
      When 顧客 "C-1" 下單 "ORD-1"，商品 "SKU-A"，數量 "2"，金額 "100"，時間 "2026-06-15T12:00:00Z"
      Then 下單結果為成功
      And 訂單 "ORD-1" 狀態為 "處理中"
      And 發出事件 "OrderPlaced"

  @rule:R-ORDER_SERVICE-001
  Rule: 處理中訂單收到付款成功後變為已確認
    Scenario: 付款成功後訂單已確認
      Given 訂單 "ORD-1" 狀態為 "處理中"
      When 收到 "PaymentSucceeded" 事件，訂單編號為 "ORD-1"
      Then 訂單 "ORD-1" 狀態為 "已確認"
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-002
  Rule: 處理中訂單收到庫存不足後變為庫存不足
    Scenario: 庫存不足後訂單為庫存不足
      Given 訂單 "ORD-1" 狀態為 "處理中"
      When 收到 "StockRejected" 事件，訂單編號為 "ORD-1"
      Then 訂單 "ORD-1" 狀態為 "庫存不足"
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-003
  Rule: 處理中訂單收到付款失敗後變為付款失敗
    Scenario: 付款失敗後訂單為付款失敗
      Given 訂單 "ORD-1" 狀態為 "處理中"
      When 收到 "PaymentFailed" 事件，訂單編號為 "ORD-1"
      Then 訂單 "ORD-1" 狀態為 "付款失敗"
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-004
  Rule: 下單輸入不合法時拒絕且不建立訂單
    Scenario Outline: 數量或金額不是正整數時拒絕下單
      Given 訂單編號 "ORD-1" 尚未存在
      When 顧客 "C-1" 下單 "ORD-1"，商品 "SKU-A"，數量 "<qty>"，金額 "<amount>"，時間 "2026-06-15T12:00:00Z"
      Then 下單結果為失敗，原因為 "INVALID_INPUT"
      And 訂單 "ORD-1" 不存在
      And 不發出任何事件

      Examples:
        | qty  | amount |
        | 0    | 100    |
        | -1   | 100    |
        | 1.5  | 100    |
        | 2    | 0      |
        | 2    | -100   |

    Scenario: 顧客編號為空字串時拒絕下單
      Given 訂單編號 "ORD-1" 尚未存在
      When 顧客 "" 下單 "ORD-1"，商品 "SKU-A"，數量 "2"，金額 "100"，時間 "2026-06-15T12:00:00Z"
      Then 下單結果為失敗，原因為 "INVALID_INPUT"
      And 訂單 "ORD-1" 不存在
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-005
  Rule: 訂單編號重複時拒絕下單且既有訂單不變
    Scenario: 重複的訂單編號被拒絕
      Given 訂單 "ORD-1" 已存在且狀態為 "處理中"
      When 顧客 "C-2" 下單 "ORD-1"，商品 "SKU-B"，數量 "1"，金額 "50"，時間 "2026-06-15T12:01:00Z"
      Then 下單結果為失敗，原因為 "DUPLICATE_ORDER"
      And 訂單 "ORD-1" 狀態為 "處理中"
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-006
  Rule: 顧客取消處理中訂單後訂單為已取消並發出 OrderCancelled
    Scenario: 顧客取消處理中訂單
      Given 訂單 "ORD-1" 狀態為 "處理中"
      When 顧客 "C-1" 取消訂單 "ORD-1"，時間 "2026-06-15T12:05:00Z"
      Then 取消結果為成功
      And 訂單 "ORD-1" 狀態為 "已取消"
      And 取消原因為 "CUSTOMER"
      And 發出事件 "OrderCancelled"

  @rule:R-ORDER_SERVICE-007
  Rule: 顧客取消已確認訂單後訂單為已取消並發出 OrderCancelled
    Scenario: 顧客取消已確認訂單
      Given 訂單 "ORD-1" 狀態為 "已確認"
      When 顧客 "C-1" 取消訂單 "ORD-1"，時間 "2026-06-15T12:05:00Z"
      Then 取消結果為成功
      And 訂單 "ORD-1" 狀態為 "已取消"
      And 取消原因為 "CUSTOMER"
      And 發出事件 "OrderCancelled"

  @rule:R-ORDER_SERVICE-008
  Rule: 庫存不足、付款失敗或已取消的訂單不可被顧客取消
    Scenario Outline: 不可取消狀態的取消請求被拒絕
      Given 訂單 "ORD-1" 狀態為 "<status>"
      When 顧客 "C-1" 取消訂單 "ORD-1"，時間 "2026-06-15T12:05:00Z"
      Then 取消結果為失敗，原因為 "NOT_CANCELLABLE"
      And 訂單 "ORD-1" 狀態為 "<status>"
      And 不發出任何事件

      Examples:
        | status   |
        | 庫存不足 |
        | 付款失敗 |
        | 已取消   |

  @rule:R-ORDER_SERVICE-009
  Rule: 取消不存在的訂單時回傳訂單不存在
    Scenario: 取消不存在的訂單
      Given 訂單編號 "ORD-9" 尚未存在
      When 顧客 "C-1" 取消訂單 "ORD-9"，時間 "2026-06-15T12:05:00Z"
      Then 取消結果為失敗，原因為 "ORDER_NOT_FOUND"
      And 不發出任何事件

  @rule:R-ORDER_SERVICE-010
  Rule: 處理中訂單距下單滿 15 分鐘（含剛好 15 分鐘）時自動取消
    Scenario Outline: 滿 15 分鐘的處理中訂單自動取消
      Given 訂單 "ORD-1" 狀態為 "處理中"，下單時間為 "2026-06-15T12:00:00Z"
      When 時間推進到 "<now>"
      Then 訂單 "ORD-1" 狀態為 "已取消"
      And 取消原因為 "TIMEOUT"
      And 發出事件 "OrderCancelled"

      Examples:
        | now                  |
        | 2026-06-15T12:15:00Z |
        | 2026-06-15T12:30:00Z |

  @rule:R-ORDER_SERVICE-011
  Rule: 處理中訂單未滿 15 分鐘（或現在時間早於下單時間）時不取消
    Scenario Outline: 未滿 15 分鐘的處理中訂單保持不變
      Given 訂單 "ORD-1" 狀態為 "處理中"，下單時間為 "2026-06-15T12:00:00Z"
      When 時間推進到 "<now>"
      Then 訂單 "ORD-1" 狀態為 "處理中"
      And 不發出任何事件

      Examples:
        | now                  |
        | 2026-06-15T12:14:59Z |
        | 2026-06-15T11:59:00Z |

  @rule:R-ORDER_SERVICE-012
  Rule: 非處理中的訂單到期時不因逾時而取消
    Scenario Outline: 非處理中訂單超過 15 分鐘後狀態不變
      Given 訂單 "ORD-1" 狀態為 "<status>"，下單時間為 "2026-06-15T12:00:00Z"
      When 時間推進到 "2026-06-15T12:20:00Z"
      Then 訂單 "ORD-1" 狀態為 "<status>"
      And 不發出任何事件

      Examples:
        | status   |
        | 已確認   |
        | 庫存不足 |
        | 付款失敗 |
        | 已取消   |

  @rule:R-ORDER_SERVICE-013
  Rule: 終態訂單收到結果事件時狀態不被覆寫
    Scenario Outline: 非處理中訂單收到結果事件後狀態不變
      Given 訂單 "ORD-1" 狀態為 "<status>"
      When 收到 "<event>" 事件，訂單編號為 "ORD-1"
      Then 訂單 "ORD-1" 狀態為 "<status>"
      And 不發出任何事件

      Examples:
        | status   | event            |
        | 已取消   | PaymentSucceeded |
        | 已確認   | StockRejected    |
        | 庫存不足 | PaymentFailed    |
        | 付款失敗 | PaymentSucceeded |

  @rule:R-ORDER_SERVICE-014
  Rule: 同一事件重複送達時忽略
    Scenario: 同一事件第二次送達不改變狀態
      Given 訂單 "ORD-1" 狀態為 "處理中"
      And 事件 "EVT-1"（PaymentSucceeded）已套用於訂單 "ORD-1"
      When 同一事件 "EVT-1" 再次送達
      Then 訂單 "ORD-1" 狀態為 "已確認"
      And 不發出任何事件
