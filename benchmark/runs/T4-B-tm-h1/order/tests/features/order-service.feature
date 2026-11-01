# language: zh-TW
功能: 訂單服務

  場景: 合法下單建立處理中訂單並發出 OrderPlaced
    當 顧客下單 "O-1" 數量 2 金額 200
    那麼 回傳成功
    而且 回傳事件包含 "OrderPlaced"
    而且 回傳的 OrderPlaced 數量為 2 且金額為 200
    而且 訂單 "O-1" 狀態為 "PENDING"

  場景大綱: 不合法的下單被拒絕且不建立訂單
    當 顧客下單 "O-1" 數量 <qty> 金額 <amount>
    那麼 回傳失敗
    而且 本次發出的事件數為 0
    而且 訂單 "O-1" 不存在

    例子:
      | qty | amount |
      | 0   | 100    |
      | -1  | 100    |
      | 1.5 | 100    |
      | 1   | -1     |
      | 1   | 1.5    |

  場景: 重複訂單編號被拒絕
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    當 顧客下單 "O-1" 數量 1 金額 100
    那麼 回傳失敗 原因為 "DUPLICATE_ORDER"
    而且 本次發出的事件數為 0

  場景大綱: 處理中的訂單依付款與庫存事件轉換狀態
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    當 服務收到事件 "<event>" 針對訂單 "O-1"
    那麼 訂單 "O-1" 狀態為 "<status>"
    而且 本次發出的事件數為 0

    例子:
      | event            | status    |
      | PaymentSucceeded | CONFIRMED |
      | StockRejected    | REJECTED  |
      | PaymentFailed    | FAILED    |
      | StockReserved    | PENDING   |

  場景大綱: 可取消的訂單被顧客取消
    假設 訂單 "O-1" 處於 "<from>" 狀態
    當 顧客取消訂單 "O-1"
    那麼 回傳成功
    而且 回傳事件包含 "OrderCancelled"
    而且 訂單 "O-1" 狀態為 "CANCELLED"
    而且 訂單 "O-1" 取消原因為 "CUSTOMER"

    例子:
      | from      |
      | PENDING   |
      | CONFIRMED |

  場景大綱: 不可取消的訂單取消失敗且狀態不變
    假設 訂單 "O-1" 處於 "<status>" 狀態
    當 顧客取消訂單 "O-1"
    那麼 回傳失敗 原因為 "NOT_CANCELLABLE"
    而且 本次發出的事件數為 0
    而且 訂單 "O-1" 狀態為 "<status>"

    例子:
      | status   |
      | REJECTED |
      | FAILED   |
      | CANCELLED |

  場景: 取消不存在的訂單回傳 ORDER_NOT_FOUND
    當 顧客取消訂單 "O-404"
    那麼 回傳失敗 原因為 "ORDER_NOT_FOUND"
    而且 本次發出的事件數為 0

  場景: 下單滿 15 分鐘仍未付款則逾時取消
    假設 訂單 "O-1" 於 "2026-06-15T12:00:00Z" 下單且處於 "PENDING" 狀態
    當 時間推進到 "2026-06-15T12:15:00Z"
    那麼 訂單 "O-1" 狀態為 "CANCELLED"
    而且 訂單 "O-1" 取消原因為 "TIMEOUT"
    而且 本次發出的事件數為 1

  場景: 未滿 15 分鐘不取消
    假設 訂單 "O-1" 於 "2026-06-15T12:00:00Z" 下單且處於 "PENDING" 狀態
    當 時間推進到 "2026-06-15T12:14:59Z"
    那麼 訂單 "O-1" 狀態為 "PENDING"
    而且 本次發出的事件數為 0

  場景: 已確認的訂單不因逾時取消
    假設 訂單 "O-1" 處於 "CONFIRMED" 狀態
    當 時間推進到 "2026-06-15T13:00:00Z"
    那麼 訂單 "O-1" 狀態為 "CONFIRMED"
    而且 本次發出的事件數為 0

  場景: 重複送達的付款成功事件不改變狀態也不重發事件
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    而且 服務收到事件 "PaymentSucceeded" 針對訂單 "O-1"
    當 再次收到同一個事件
    那麼 訂單 "O-1" 狀態為 "CONFIRMED"
    而且 本次發出的事件數為 0

  場景: 先收到庫存不足再收到付款成功時後到事件被忽略
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    而且 服務收到事件 "StockRejected" 針對訂單 "O-1"
    當 服務收到事件 "PaymentSucceeded" 針對訂單 "O-1"
    那麼 訂單 "O-1" 狀態為 "REJECTED"
    而且 本次發出的事件數為 0

  場景: 先收到付款成功再收到庫存不足時後到事件被忽略
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    而且 服務收到事件 "PaymentSucceeded" 針對訂單 "O-1"
    當 服務收到事件 "StockRejected" 針對訂單 "O-1"
    那麼 訂單 "O-1" 狀態為 "CONFIRMED"
    而且 本次發出的事件數為 0

  場景大綱: 終態後的晚到事件不改變狀態也不發出事件
    假設 訂單 "O-1" 處於 "<status>" 狀態
    當 服務收到事件 "<event>" 針對訂單 "O-1"
    那麼 訂單 "O-1" 狀態為 "<status>"
    而且 本次發出的事件數為 0

    例子:
      | status    | event            |
      | CANCELLED | PaymentSucceeded |
      | CANCELLED | StockRejected    |
      | REJECTED  | PaymentSucceeded |
      | FAILED    | PaymentSucceeded |
      | REJECTED  | PaymentFailed    |

  場景大綱: 與訂單服務無關的事件不產生任何回應
    假設 訂單 "O-1" 處於 "PENDING" 狀態
    當 服務收到事件 "<event>" 針對訂單 "O-1"
    那麼 本次發出的事件數為 0
    而且 訂單 "O-1" 狀態為 "PENDING"

    例子:
      | event          |
      | StockReleased  |
      | PaymentRefunded |
