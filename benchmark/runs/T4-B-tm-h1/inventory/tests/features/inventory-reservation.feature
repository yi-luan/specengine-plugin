# language: zh-TW
功能: 庫存服務
  庫存服務依事件保留與放回庫存。事件可能重複且不保證順序。
  測試自行準備其他服務會送來的事件。

  # User Story 1 - 下單時保留庫存 (P1)
  場景: 庫存足夠時保留並回傳 StockReserved
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 回傳事件為 "StockReserved" 訂單 "O1"
    而且 SKU "A" 可用庫存為 7

  場景: 庫存不足時回傳 StockRejected 且不保留
    假設 庫存服務的初始庫存為 SKU "A" 數量 2
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 回傳事件為 "StockRejected" 訂單 "O1"
    而且 SKU "A" 可用庫存為 2

  場景: 庫存剛好足夠時保留到零
    假設 庫存服務的初始庫存為 SKU "A" 數量 3
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 回傳事件為 "StockReserved" 訂單 "O1"
    而且 SKU "A" 可用庫存為 0

  場景: 數量為零或負數時回傳 StockRejected
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 0
    那麼 回傳事件為 "StockRejected" 訂單 "O1"
    而且 SKU "A" 可用庫存為 10

  # User Story 2 - 付款失敗時放回庫存 (P1)
  場景: 付款失敗時放回已保留的庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    當 收到 PaymentFailed 事件 編號 "E2" 訂單 "O1"
    那麼 回傳事件為 "StockReleased" 訂單 "O1"
    而且 SKU "A" 可用庫存為 10

  場景: 沒有保留過的訂單付款失敗時不加庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 2
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    當 收到 PaymentFailed 事件 編號 "E2" 訂單 "O1"
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 2

  # User Story 3 - 訂單取消時放回庫存 (P2)
  場景: 取消已保留的訂單時放回庫存並回傳 StockReleased
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    當 收到 OrderCancelled 事件 編號 "E2" 訂單 "O1"
    那麼 回傳事件為 "StockReleased" 訂單 "O1"
    而且 SKU "A" 可用庫存為 10

  場景: 取消沒有保留過的訂單時不加庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 2
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    當 收到 OrderCancelled 事件 編號 "E2" 訂單 "O1"
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 2

  # User Story 4 - 重複與亂序事件的穩健性 (P2)
  場景: 同一事件 id 重複送達時第二次起忽略
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 回傳事件為 "StockReserved" 訂單 "O1"
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 7

  場景: 同一訂單不同事件 id 的重複 OrderPlaced 只保留一次
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    那麼 回傳事件為 "StockReserved" 訂單 "O1"
    當 收到 OrderPlaced 事件 編號 "E2" 訂單 "O1" 數量 3
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 7

  場景: 取消先於下單抵達時之後的下單不保留庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 OrderCancelled 事件 編號 "E1" 訂單 "O1"
    那麼 不回傳任何事件
    當 收到 OrderPlaced 事件 編號 "E2" 訂單 "O1" 數量 3
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 10

  場景: 付款失敗先於下單抵達時之後的下單不保留庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 PaymentFailed 事件 編號 "E1" 訂單 "O1"
    那麼 不回傳任何事件
    當 收到 OrderPlaced 事件 編號 "E2" 訂單 "O1" 數量 3
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 10

  場景: 同一訂單付款失敗與取消都抵達時只放回一次
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O1" 數量 3
    當 收到 PaymentFailed 事件 編號 "E2" 訂單 "O1"
    那麼 回傳事件為 "StockReleased" 訂單 "O1"
    當 收到 OrderCancelled 事件 編號 "E3" 訂單 "O1"
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 10

  場景: 先被拒絕的訂單不因其他訂單放回庫存而改為保留
    假設 庫存服務的初始庫存為 SKU "A" 數量 2
    而且 已收到 OrderPlaced 事件 編號 "E1" 訂單 "O2" 數量 2
    而且 已收到 OrderPlaced 事件 編號 "E2" 訂單 "O1" 數量 3
    當 收到 PaymentFailed 事件 編號 "E3" 訂單 "O2"
    那麼 回傳事件為 "StockReleased" 訂單 "O2"
    當 收到 OrderPlaced 事件 編號 "E4" 訂單 "O1" 數量 3
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 2

  # User Story 5 - 忽略不相關的事件 (P3)
  場景: 收到無關事件時不回傳事件且不改變庫存
    假設 庫存服務的初始庫存為 SKU "A" 數量 10
    當 收到 PaymentSucceeded 事件 編號 "E1" 訂單 "O1"
    那麼 不回傳任何事件
    而且 SKU "A" 可用庫存為 10
