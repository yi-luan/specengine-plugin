# language: zh-TW
功能: 庫存服務
  庫存服務收到事件後保留、放回或拒絕庫存。事件可能重複、可能亂序。

  場景: 庫存足夠時保留並發出 StockReserved
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    那麼 本次共發出 1 個事件
    而且 發出的事件是 "StockReserved" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 7

  場景: 庫存剛好足夠時可以保留
    假如 庫存服務有 "SKU-A" 庫存 3
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    那麼 發出的事件是 "StockReserved" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 0

  場景: 庫存不足時拒絕且不扣庫存
    假如 庫存服務有 "SKU-A" 庫存 2
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    那麼 發出的事件是 "StockRejected" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 2

  場景: 未知的 SKU 視為庫存不足
    假如 庫存服務有 "SKU-A" 庫存 1
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-B" 數量 1
    那麼 發出的事件是 "StockRejected" 訂單 "O1"
    而且 SKU "SKU-B" 可供保留數量是 0

  場景: 數量為 0 時拒絕
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 0
    那麼 發出的事件是 "StockRejected" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 付款失敗時放回保留的庫存並發出 StockReleased
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 PaymentFailed 訂單 "O1"
    那麼 發出的事件是 "StockReleased" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 10
    而且 所有已發出事件的 id 互不相同

  場景: 付款失敗重複送達時只放回一次
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 PaymentFailed 訂單 "O1"
    而且 重複送達 "PaymentFailed" 訂單 "O1"
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 重複送達 OrderPlaced 不會重複保留
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 重複送達 "OrderPlaced" 訂單 "O1"
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 7

  場景: 訂單取消時放回庫存且不發出事件
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 OrderCancelled 訂單 "O1"
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 已取消的訂單收到付款失敗不會再次放回
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 OrderCancelled 訂單 "O1"
    而且 收到 PaymentFailed 訂單 "O1"
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 取消比 OrderPlaced 先到時之後的 OrderPlaced 不保留庫存
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 OrderCancelled 訂單 "O1"
    那麼 本次共發出 0 個事件
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 付款失敗先於 OrderPlaced 到達時之後的 OrderPlaced 不保留庫存
    假如 庫存服務有 "SKU-A" 庫存 10
    當 收到 PaymentFailed 訂單 "O1"
    那麼 本次共發出 0 個事件
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 10

  場景: 被拒絕的訂單收到取消不會增加庫存
    假如 庫存服務有 "SKU-A" 庫存 2
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 OrderCancelled 訂單 "O1"
    那麼 本次共發出 0 個事件
    而且 SKU "SKU-A" 可供保留數量是 2

  場景: 與其他訂單互不影響
    假如 庫存服務有 "SKU-A" 庫存 5
    當 收到 OrderPlaced 訂單 "O1" 購買 "SKU-A" 數量 3
    而且 收到 OrderPlaced 訂單 "O2" 購買 "SKU-A" 數量 3
    那麼 發出的事件是 "StockRejected" 訂單 "O2"
    而且 SKU "SKU-A" 可供保留數量是 2
    當 收到 PaymentFailed 訂單 "O1"
    那麼 發出的事件是 "StockReleased" 訂單 "O1"
    而且 SKU "SKU-A" 可供保留數量是 5
