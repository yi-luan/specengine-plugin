# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 一筆交易的狀態單位，依狀態機流轉 | Order（id, status, amount, paidAmount, refundedAmount） | ORDER_STATE_MACHINE |
| 訂單金額 | 訂單應付的總額（整數元） | Order.amount | ORDER_STATE_MACHINE |
| 已付金額 | 訂單已實際付款的金額（整數元） | Order.paidAmount | ORDER_STATE_MACHINE |
| 累計退款金額 | 訂單至今已退還的金額合計（整數元） | Order.refundedAmount | ORDER_STATE_MACHINE |
| 已建立 | 訂單建立後的初始狀態 | status = CREATED | ORDER_STATE_MACHINE |
| 已付款 | 付款金額等於訂單金額後的狀態 | status = PAID | ORDER_STATE_MACHINE |
| 已出貨 | 出貨後的狀態，可申請退款 | status = SHIPPED | ORDER_STATE_MACHINE |
| 已取消 | 取消後的終態 | status = CANCELLED | ORDER_STATE_MACHINE |
| 已退款 | 累計退款金額達到已付金額後的終態 | status = REFUNDED | ORDER_STATE_MACHINE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_AMOUNT | 金額非正整數（建立、付款、退款）的失敗代碼 | resolved/data/訂單狀態機_失敗原因的回傳形式.md |
| MSG-002 | AMOUNT_MISMATCH | 付款金額不等於訂單金額的失敗代碼 | resolved/data/訂單狀態機_失敗原因的回傳形式.md |
| MSG-003 | INVALID_TRANSITION | 狀態不允許該操作的失敗代碼 | resolved/features/訂單狀態機_非法狀態操作的處理.md |
| MSG-004 | REFUND_EXCEEDS_PAID | 退款會使累計退款金額超過已付金額的失敗代碼 | resolved/features/訂單狀態機_退款超過剩餘可退額度的反應.md |
