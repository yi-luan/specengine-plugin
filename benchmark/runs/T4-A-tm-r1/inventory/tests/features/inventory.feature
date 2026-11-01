# language: zh-TW
功能: 庫存服務
  庫存服務只透過事件與其他服務溝通：收到 OrderPlaced 保留庫存，
  收到 PaymentFailed 或 OrderCancelled 放回保留的庫存。
  事件可能重複送達、也可能順序顛倒，服務必須冪等。

  背景:
    假設 庫存服務的初始庫存為:
      | sku   | qty |
      | SKU-A | 10  |
      | SKU-B | 1   |

  場景: 庫存足夠時保留庫存並發出 StockReserved
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 3
    那麼 庫存服務發出 1 個事件
    而且 發出的事件為 "StockReserved"，訂單 "o1"
    而且 "SKU-A" 的可用庫存為 7

  場景: 庫存不足時發出 StockRejected 且庫存不變
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-B" 數量 2
    那麼 庫存服務發出 1 個事件
    而且 發出的事件為 "StockRejected"，訂單 "o1"
    而且 "SKU-B" 的可用庫存為 1

  場景: 剛好用完庫存仍可保留
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-B" 數量 1
    那麼 發出的事件為 "StockReserved"，訂單 "o1"
    而且 "SKU-B" 的可用庫存為 0

  場景: 不存在的商品視為庫存為零
    那麼 "SKU-X" 的可用庫存為 0
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-X" 數量 1
    那麼 發出的事件為 "StockRejected"，訂單 "o1"

  場景大綱: 數量不是正整數時拒絕保留
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 <qty>
    那麼 發出的事件為 "StockRejected"，訂單 "o1"
    而且 "SKU-A" 的可用庫存為 10

    例子:
      | qty |
      | 0   |
      | -1  |

  場景: 多張訂單依序消耗同一商品，後到者不足時被拒
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 6
    而且 收到訂單 "o2" 的 OrderPlaced，商品 "SKU-A" 數量 4
    而且 收到訂單 "o3" 的 OrderPlaced，商品 "SKU-A" 數量 1
    那麼 發出的事件為 "StockRejected"，訂單 "o3"
    而且 "SKU-A" 的可用庫存為 0

  場景: 重複送達的 OrderPlaced 不會重複保留
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 3
    而且 再次收到同一個 OrderPlaced 事件
    那麼 庫存服務發出 0 個事件
    而且 "SKU-A" 的可用庫存為 7

  場景: 付款失敗時放回保留的庫存並發出 StockReleased
    假設 訂單 "o1" 已保留商品 "SKU-A" 數量 3
    當 收到訂單 "o1" 的 "PaymentFailed"
    那麼 庫存服務發出 1 個事件
    而且 發出的事件為 "StockReleased"，訂單 "o1"
    而且 "SKU-A" 的可用庫存為 10

  場景: 訂單取消時放回保留的庫存並發出 StockReleased
    假設 訂單 "o1" 已保留商品 "SKU-A" 數量 3
    當 收到訂單 "o1" 的 "OrderCancelled"
    那麼 發出的事件為 "StockReleased"，訂單 "o1"
    而且 "SKU-A" 的可用庫存為 10

  場景: 付款成功後取消訂單仍會放回庫存
    假設 訂單 "o1" 已保留商品 "SKU-A" 數量 3
    當 收到訂單 "o1" 的 "PaymentSucceeded"
    那麼 庫存服務發出 0 個事件
    當 收到訂單 "o1" 的 "OrderCancelled"
    那麼 發出的事件為 "StockReleased"，訂單 "o1"
    而且 "SKU-A" 的可用庫存為 10

  場景: 重複送達的 PaymentFailed 不會重複放回
    假設 訂單 "o1" 已保留商品 "SKU-A" 數量 3
    當 收到訂單 "o1" 的 "PaymentFailed"
    而且 再次收到訂單 "o1" 的 "PaymentFailed"
    那麼 庫存服務發出 0 個事件
    而且 "SKU-A" 的可用庫存為 10

  場景: 付款失敗後又收到取消，只放回一次
    假設 訂單 "o1" 已保留商品 "SKU-A" 數量 3
    當 收到訂單 "o1" 的 "PaymentFailed"
    而且 收到訂單 "o1" 的 "OrderCancelled"
    那麼 庫存服務發出 0 個事件
    而且 "SKU-A" 的可用庫存為 10

  場景: 被拒絕的訂單收到取消時沒有東西可放回
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-B" 數量 5
    而且 收到訂單 "o1" 的 "OrderCancelled"
    那麼 庫存服務發出 0 個事件
    而且 "SKU-B" 的可用庫存為 1

  場景: 釋放事件先於 OrderPlaced 到達時不保留庫存
    當 收到訂單 "o1" 的 "OrderCancelled"
    那麼 庫存服務發出 0 個事件
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 3
    那麼 庫存服務發出 0 個事件
    而且 "SKU-A" 的可用庫存為 10

  場景: 不相關的事件回傳空陣列
    當 收到訂單 "o1" 的 "StockReserved"
    那麼 庫存服務發出 0 個事件
    當 收到訂單 "o1" 的 "StockRejected"
    那麼 庫存服務發出 0 個事件
    當 收到訂單 "o1" 的 "StockReleased"
    那麼 庫存服務發出 0 個事件
    當 收到訂單 "o1" 的 "PaymentRefunded"
    那麼 庫存服務發出 0 個事件

  場景: 發出的事件 id 彼此不同且不與外部事件衝突
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 1
    而且 收到訂單 "o2" 的 OrderPlaced，商品 "SKU-A" 數量 1
    而且 收到訂單 "o1" 的 "PaymentFailed"
    而且 收到訂單 "o3" 的 OrderPlaced，商品 "SKU-B" 數量 9
    那麼 庫存服務總共發出 4 個事件
    而且 所有發出事件的 id 皆不重複且與送入事件的 id 不同

  場景: 不會修改呼叫端傳入的庫存物件
    當 收到訂單 "o1" 的 OrderPlaced，商品 "SKU-A" 數量 3
    那麼 "SKU-A" 的可用庫存為 7
    而且 傳入的初始庫存物件中 "SKU-A" 仍為 10
