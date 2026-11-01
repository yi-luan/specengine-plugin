# 標準答案表（T4 事件驅動下單流程）— 回答者只准依此表回答

| 洞 | 類型 | 問題 | 標準答案 |
| :-- | :-- | :-- | :-- |
| H1 | 必問 | 同一個事件（同 id）重複送達時怎麼處理？ | 第二次起直接忽略：不改任何狀態、不發任何事件。三個服務都一樣 |
| H2 | 必問 | 庫存服務先收到 `OrderCancelled`、之後才收到該訂單的 `OrderPlaced`？ | 記住這張訂單已取消；之後到的 `OrderPlaced` 不保留庫存、不發任何事件 |
| H3 | 必問 | 付款服務先收到 `OrderCancelled`、之後才收到 `StockReserved`？ | 記住這張訂單已取消；之後到的 `StockReserved` 不扣款、不發任何事件 |
| H4 | 必問 | 已確認（已付款）的訂單能不能取消？ | 可以。訂單變 CANCELLED（cancelReason `CUSTOMER`），發 `OrderCancelled`；庫存放回、全額退款 |
| H5 | 必問 | 訂單已經是 CANCELLED／REJECTED／FAILED 之後又收到事件（例如取消後才到的 `PaymentSucceeded`）？ | 這三種是終態，之後任何事件都不改變訂單狀態。CONFIRMED 只會因顧客取消而變成 CANCELLED |
| H6 | 必問 | 哪些訂單不能取消？回傳什麼？ | REJECTED／FAILED／CANCELLED 不能取消，回 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，不發事件；找不到訂單回 `ORDER_NOT_FOUND` |
| H7 | 必問 | 釋放庫存的規則？沒保留過、或已經釋放過的訂單又收到取消／付款失敗？ | 只放回實際保留的數量，同一張訂單最多放回一次；沒保留過（被拒、或尚未收到下單）就不加庫存、不發 `StockReleased` |
| H8 | 必問 | 庫存剛好等於訂購數量？不夠時能不能部分保留？未知 SKU？ | 剛好等於可以保留。不夠就整筆拒絕，不部分保留。未知 SKU 視為庫存 0，發 `StockRejected` |
| H9 | 必問 | 餘額剛好等於金額？不夠時？未知顧客？ | 剛好等於可以扣款。不夠就發 `PaymentFailed`，一毛都不扣。未知顧客餘額視為 0 |
| H10 | 必問 | 退款規則？沒扣過款的訂單被取消？ | 已扣款才退，全額退，同一張訂單最多退一次，退款發 `PaymentRefunded`；沒扣過款就不退、不發事件 |
| H11 | 必問 | 逾時的判定：剛好 15 分鐘算不算？以什麼狀態判定「沒完成付款」？ | 以訂單服務當下的狀態判定：仍為 PENDING 且 now − 下單時間 ≥ 15 分鐘就取消（剛好 15 分鐘算逾時），cancelReason `TIMEOUT`，發 `OrderCancelled`。之後的退款與放回庫存同顧客取消 |
| H12 | 必問 | 下單輸入不合法？重複的訂單編號？ | qty 或 amount 不是正整數、orderId／customerId／sku 為空字串 → `INVALID_INPUT`；orderId 已存在 → `DUPLICATE_ORDER`。都不建立訂單、不發事件 |
| H13 | 必問 | 付款失敗後訂單狀態與庫存？ | 訂單 FAILED；庫存放回並發 `StockReleased`（需求有寫放回，這裡只確認訂單狀態） |
| H14 | 必問 | 顧客取消的 cancelReason？取消 PENDING 訂單的結果？ | cancelReason `CUSTOMER`；PENDING 可取消，回 `{ ok: true, events: [OrderCancelled] }` |
| T-a | 陷阱 | （需求有寫）付款失敗要放回庫存 | 不該問要不要放回 |
| T-b | 陷阱 | （需求有寫）事件可能重複、可能亂序 | 不該問「會不會重複」，該問「重複時怎麼辦」 |
| T-c | 陷阱 | （需求有寫）不關心的事件回傳空陣列 | 不該問 |

回答規則：
- 問到表上的洞，照標準答案回答，不加油添醋。
- 問到表上沒有的業務問題，一律回答「你決定，照你的最佳判斷」並記錄該題。技術環境問題照專案實況回答。
- 不主動提示、不糾正、不要求補測試。
