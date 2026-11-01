Feature: 訂單服務
  訂單服務建立訂單、依庫存與付款事件推進狀態、處理顧客取消與 15 分鐘逾時，
  並容忍事件重複與亂序送達。其他服務的事件由測試自行構造。

  Rule: 顧客下單並依結果推進狀態

    Scenario: US1-1 下單成功建立處理中訂單並發出 OrderPlaced
      Given no orders exist
      When the customer places order:
        | orderId | customerId | sku | qty | amount | at                   |
        | O1      | C1         | A   | 2   | 100    | 2026-06-15T12:00:00Z |
      Then the command succeeds
      And order "O1" has status PENDING
      And exactly one OrderPlaced event is emitted matching:
        | orderId | customerId | sku | qty | amount | at                   |
        | O1      | C1         | A   | 2   | 100    | 2026-06-15T12:00:00Z |

    Scenario: US1-2 收到 PaymentSucceeded 變為已確認
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives PaymentSucceeded for order "O1"
      Then order "O1" has status CONFIRMED
      And no events are emitted

    Scenario: US1-3 收到 StockRejected 變為庫存不足
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives StockRejected for order "O1"
      Then order "O1" has status REJECTED
      And no events are emitted

    Scenario: US1-4 收到 PaymentFailed 變為付款失敗
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives PaymentFailed for order "O1"
      Then order "O1" has status FAILED
      And no events are emitted

    Scenario Outline: US1-5 不關心的事件型別不改狀態且回傳空清單
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives <type> for order "O1"
      Then order "O1" has status PENDING
      And no events are emitted

      Examples:
        | type            |
        | OrderPlaced     |
        | StockReserved   |
        | StockReleased   |
        | PaymentRefunded |
        | OrderCancelled  |

    Scenario: US1-6 重複訂單編號下單被拒絕
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the customer places order "O1" again
      Then the command fails with reason "DUPLICATE_ORDER"
      And order "O1" has status PENDING
      And no events are emitted

    Scenario Outline: US1-7 數量或金額不是正整數時被拒絕
      Given no orders exist
      When the customer places order:
        | orderId | customerId | sku | qty   | amount   | at                   |
        | O1      | C1         | A   | <qty> | <amount> | 2026-06-15T12:00:00Z |
      Then the command fails with reason "INVALID_INPUT"
      And order "O1" does not exist
      And no events are emitted

      Examples:
        | qty | amount |
        | 0   | 100    |
        | -1  | 100    |
        | 1.5 | 100    |
        | 2   | 0      |
        | 2   | -100   |
        | 2   | 99.5   |

    Scenario Outline: US1-7a 訂單編號、顧客或 SKU 為空字串時被拒絕
      Given no orders exist
      When the customer places order:
        | orderId   | customerId   | sku   | qty | amount | at                   |
        | <orderId> | <customerId> | <sku> | 2   | 100    | 2026-06-15T12:00:00Z |
      Then the command fails with reason "INVALID_INPUT"
      And no events are emitted

      Examples:
        | orderId | customerId | sku |
        |         | C1         | A   |
        | O1      |            | A   |
        | O1      | C1         |     |

    Scenario: US1-7b PaymentSucceeded 金額與訂單不符仍確認
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives PaymentSucceeded for order "O1" with amount 90
      Then order "O1" has status CONFIRMED

    Scenario: US1-8 查詢不存在的訂單
      Given no orders exist
      Then order "O9" does not exist

  Rule: 事件重複與亂序送達

    Scenario: US4-1 同一 PaymentSucceeded 送達兩次只生效一次
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives PaymentSucceeded for order "O1"
      And the service receives the same event again
      Then order "O1" has status CONFIRMED
      And no events are emitted

    Scenario Outline: US4-2 已確認後收到其他結果事件不改狀態
      Given order "O1" was placed at "2026-06-15T12:00:00Z" and received PaymentSucceeded
      When the service receives <type> for order "O1"
      Then order "O1" has status CONFIRMED
      And no events are emitted

      Examples:
        | type          |
        | StockRejected |
        | PaymentFailed |

    Scenario: US4-2a 逾時取消後才收到 PaymentSucceeded 仍維持已取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And time advances to "2026-06-15T12:20:00Z"
      When the service receives PaymentSucceeded for order "O1"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And no events are emitted

    Scenario Outline: US4-2b 庫存不足或付款失敗後收到 PaymentSucceeded 不改狀態
      Given order "O1" was placed at "2026-06-15T12:00:00Z" and received <first>
      When the service receives PaymentSucceeded for order "O1"
      Then order "O1" has status <status>
      And no events are emitted

      Examples:
        | first         | status   |
        | StockRejected | REJECTED |
        | PaymentFailed | FAILED   |

    Scenario: US4-3 先收到 PaymentSucceeded 再收到 StockReserved
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the service receives PaymentSucceeded for order "O1"
      And the service receives StockReserved for order "O1"
      Then order "O1" has status CONFIRMED
      And no events are emitted

    Scenario Outline: US4-4 針對不存在訂單的結果事件被忽略
      Given no orders exist
      When the service receives <type> for order "O9"
      Then order "O9" does not exist
      And no events are emitted

      Examples:
        | type             |
        | PaymentSucceeded |
        | StockRejected    |
        | PaymentFailed    |

    Scenario Outline: US4-5 顧客取消後收到結果事件仍維持已取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And the customer cancels order "O1" at "2026-06-15T12:01:00Z"
      When the service receives <type> for order "O1"
      Then order "O1" has status CANCELLED with cancel reason CUSTOMER
      And no events are emitted

      Examples:
        | type          |
        | PaymentFailed |
        | StockRejected |

  Rule: 顧客取消訂單

    Scenario: US2-1 取消處理中的訂單
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When the customer cancels order "O1" at "2026-06-15T12:05:00Z"
      Then the command succeeds
      And order "O1" has status CANCELLED with cancel reason CUSTOMER
      And exactly 1 OrderCancelled events are emitted for orders "O1"

    Scenario: US2-2 取消已確認的訂單
      Given order "O1" was placed at "2026-06-15T12:00:00Z" and received PaymentSucceeded
      When the customer cancels order "O1" at "2026-06-15T12:05:00Z"
      Then the command succeeds
      And order "O1" has status CANCELLED with cancel reason CUSTOMER
      And exactly 1 OrderCancelled events are emitted for orders "O1"

    Scenario Outline: US2-3 終態訂單不能取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z" and received <first>
      When the customer cancels order "O1" at "2026-06-15T12:05:00Z"
      Then the command fails with reason "NOT_CANCELLABLE"
      And order "O1" has status <status>
      And no events are emitted

      Examples:
        | first         | status   |
        | StockRejected | REJECTED |
        | PaymentFailed | FAILED   |

    Scenario: US2-3b 已取消的訂單再次取消被拒絕且原因不變
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And time advances to "2026-06-15T12:15:00Z"
      When the customer cancels order "O1" at "2026-06-15T12:16:00Z"
      Then the command fails with reason "NOT_CANCELLABLE"
      And order "O1" has status CANCELLED with cancel reason TIMEOUT
      And no events are emitted

    Scenario: US2-4 取消不存在的訂單
      Given no orders exist
      When the customer cancels order "O9" at "2026-06-15T12:05:00Z"
      Then the command fails with reason "ORDER_NOT_FOUND"
      And no events are emitted

  Rule: 15 分鐘未完成付款自動取消

    Scenario: US3-1 未滿 15 分鐘不取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When time advances to "2026-06-15T12:14:59Z"
      Then order "O1" has status PENDING
      And no events are emitted

    Scenario: US3-2 超過 15 分鐘逾時取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When time advances to "2026-06-15T12:15:01Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And exactly 1 OrderCancelled events are emitted for orders "O1"

    Scenario: US3-3 恰好 15 分鐘即逾時
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When time advances to "2026-06-15T12:15:00Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And exactly 1 OrderCancelled events are emitted for orders "O1"

    Scenario Outline: US3-4 非處理中的訂單不受逾時影響
      Given order "O1" was placed at "2026-06-15T12:00:00Z" and received <first>
      When time advances to "2026-06-15T13:00:00Z"
      Then order "O1" has status <status>
      And no events are emitted

      Examples:
        | first            | status    |
        | PaymentSucceeded | CONFIRMED |
        | StockRejected    | REJECTED  |
        | PaymentFailed    | FAILED    |

    Scenario: US3-4b 顧客已取消的訂單不受逾時影響
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And the customer cancels order "O1" at "2026-06-15T12:01:00Z"
      When time advances to "2026-06-15T13:00:00Z"
      Then order "O1" has status CANCELLED with cancel reason CUSTOMER
      And no events are emitted

    Scenario: US3-5 多張訂單同時逾時各發一個 OrderCancelled
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And order "O2" was placed at "2026-06-15T12:03:00Z"
      When time advances to "2026-06-15T12:30:00Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And order "O2" has status CANCELLED with cancel reason TIMEOUT
      And exactly 2 OrderCancelled events are emitted for orders "O1,O2"

    Scenario: US3-5b 只有到期的訂單被取消
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And order "O2" was placed at "2026-06-15T12:10:00Z"
      When time advances to "2026-06-15T12:20:00Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And order "O2" has status PENDING
      And exactly 1 OrderCancelled events are emitted for orders "O1"

    Scenario: US3-6 再次推進時間不重複發出 OrderCancelled
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And time advances to "2026-06-15T12:20:00Z"
      When time advances to "2026-06-15T12:25:00Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And no events are emitted

    Scenario: US3-7 時間倒退不改變狀態
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And time advances to "2026-06-15T12:20:00Z"
      When time advances to "2026-06-15T12:05:00Z"
      Then order "O1" has status CANCELLED with cancel reason TIMEOUT
      And no events are emitted

    Scenario: US3-7b 時間倒退不會提早取消尚未到期的訂單
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      When time advances to "2026-06-15T11:00:00Z"
      Then order "O1" has status PENDING
      And no events are emitted

  Rule: 事件 id 全系統唯一

    Scenario: P-1 訂單服務發出的事件 id 皆不同且帶服務前綴
      Given order "O1" was placed at "2026-06-15T12:00:00Z"
      And order "O2" was placed at "2026-06-15T12:00:00Z"
      And the customer cancels order "O1" at "2026-06-15T12:01:00Z"
      And time advances to "2026-06-15T12:30:00Z"
      Then all emitted event ids are unique and start with "order-"
      And 4 events have been emitted in total
