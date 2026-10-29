# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 一筆要被付款、出貨、取消或退款的交易紀錄 | `Order`（orders） | ORDER_STATE_MACHINE |
| 訂單識別字 | 呼叫端指定的訂單代號 | `Order.id`（orders.id） | ORDER_STATE_MACHINE |
| 訂單狀態 | 訂單目前處於哪個階段 | `Order.status`（`OrderStatus`） | ORDER_STATE_MACHINE |
| 已建立 | 訂單剛建立、尚未付款 | `OrderStatus = 'CREATED'` | ORDER_STATE_MACHINE |
| 已付款 | 訂單已收到等於訂單金額的付款 | `OrderStatus = 'PAID'` | ORDER_STATE_MACHINE |
| 已出貨 | 已付款的訂單已經出貨 | `OrderStatus = 'SHIPPED'` | ORDER_STATE_MACHINE |
| 已取消 | 訂單已被取消 | `OrderStatus = 'CANCELLED'` | ORDER_STATE_MACHINE |
| 已退款 | 已出貨訂單的累計退款金額已達到已付金額 | `OrderStatus = 'REFUNDED'` | ORDER_STATE_MACHINE |
| 訂單金額 | 這筆訂單要付的錢（整數元），必須大於 0 | `Order.amount`（orders.amount） | ORDER_STATE_MACHINE |
| 已付金額 | 這筆訂單實際收到的錢（整數元） | `Order.paidAmount`（orders.paid_amount） | ORDER_STATE_MACHINE |
| 累計退款金額 | 這筆訂單到目前為止總共退了多少錢（整數元） | `Order.refundedAmount`（orders.refunded_amount） | ORDER_STATE_MACHINE |
| 付款 | 對已建立的訂單付入等於訂單金額的款項 | `pay(order, amount)` | ORDER_STATE_MACHINE |
| 出貨 | 把已付款的訂單出貨 | `ship(order)` | ORDER_STATE_MACHINE |
| 取消 | 取消已建立或已付款的訂單 | `cancel(order)` | ORDER_STATE_MACHINE |
| 退款 | 對已出貨的訂單退還部分或全部已付金額，可分多次 | `refund(order, amount)` | ORDER_STATE_MACHINE |
| 操作結果 | 每次操作成功回傳更新後的訂單，失敗回傳失敗原因 | `OrderResult`（`{ ok: true; order }` ／ `{ ok: false; reason }`） | ORDER_STATE_MACHINE |
| 失敗原因 | 操作失敗時回傳的原因 | `OrderResult.reason`（string） | ORDER_STATE_MACHINE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_TRANSITION | 訂單目前狀態不允許該操作時的失敗原因（R-ORDER_STATE_MACHINE-009／010／011／012／013／014） | resolved/features/訂單狀態機_已出貨訂單能否取消.md、訂單狀態機_已取消訂單的後續操作.md、訂單狀態機_已退款訂單的後續操作.md |
| MSG-002 | AMOUNT_MISMATCH | 付款金額不等於訂單金額時的失敗原因（R-ORDER_STATE_MACHINE-002） | resolved/features/訂單狀態機_付款金額不等於訂單金額.md |
| MSG-003 | REFUND_EXCEEDS_PAID | 單次退款金額超過剩餘可退金額（已付 − 累計已退）時的失敗原因（R-ORDER_STATE_MACHINE-007） | resolved/features/訂單狀態機_單次退款超過剩餘可退金額.md |
| MSG-004 | INVALID_AMOUNT | 金額不合法（建立訂單金額、付款金額、退款金額為 0、負數、非整數或非有限數值）時的失敗原因（R-ORDER_STATE_MACHINE-001／015／016） | resolved/features/訂單狀態機_退款金額為零或負數.md、訂單狀態機_失敗原因的格式與優先序.md、resolved/data/訂單狀態機_非整數金額輸入.md |
| MSG-005 | （檢查順序）狀態 → 金額合法性 → 金額比對 | 多重錯誤時只回第一個踩到的失敗原因：INVALID_TRANSITION 優先於 INVALID_AMOUNT，INVALID_AMOUNT 優先於 AMOUNT_MISMATCH／REFUND_EXCEEDS_PAID（R-ORDER_STATE_MACHINE-016／017） | resolved/features/訂單狀態機_失敗原因的格式與優先序.md |
