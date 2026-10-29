# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 客戶下單後系統建立的交易紀錄 | Order（orders） | ORDER_STATE_MACHINE |
| 訂單金額 | 這筆訂單應付的金額，整數元，必須大於 0 | Order.amount（orders.amount） | ORDER_STATE_MACHINE |
| 已付金額 | 客戶已經付給這筆訂單的金額 | Order.paidAmount（orders.paid_amount） | ORDER_STATE_MACHINE |
| 累計退款金額 | 這筆訂單目前為止退還給客戶的總額 | Order.refundedAmount（orders.refunded_amount） | ORDER_STATE_MACHINE |
| 訂單狀態 | 訂單目前所處的階段 | Order.status（OrderStatus） | ORDER_STATE_MACHINE |
| 已建立 | 訂單剛建立、尚未付款 | OrderStatus = CREATED | ORDER_STATE_MACHINE |
| 已付款 | 客戶已付清訂單金額 | OrderStatus = PAID | ORDER_STATE_MACHINE |
| 已出貨 | 商家已出貨 | OrderStatus = SHIPPED | ORDER_STATE_MACHINE |
| 已取消 | 訂單被取消 | OrderStatus = CANCELLED | ORDER_STATE_MACHINE |
| 已退款 | 累計退款金額已達到已付金額 | OrderStatus = REFUNDED | ORDER_STATE_MACHINE |
| 建立訂單 | 以 id 與金額建立一筆新訂單 | createOrder(id, amount) | ORDER_STATE_MACHINE |
| 付款 | 客戶對訂單付款 | pay(order, amount) | ORDER_STATE_MACHINE |
| 出貨 | 商家對已付款訂單出貨 | ship(order) | ORDER_STATE_MACHINE |
| 取消 | 取消訂單 | cancel(order) | ORDER_STATE_MACHINE |
| 申請退款 | 對已出貨訂單申請退還金額，可分多次 | refund(order, amount) | ORDER_STATE_MACHINE |
| 操作結果 | 每次操作的回傳：成功時含更新後的訂單，失敗時含失敗原因 | OrderResult（{ ok: true; order } ｜ { ok: false; reason }） | ORDER_STATE_MACHINE |
| 失敗原因 | 操作失敗時回傳的原因 | OrderResult.reason（string） | ORDER_STATE_MACHINE |
| 純函式 | 操作不修改傳入的訂單，成功時回傳新的訂單物件 | 所有 src/order.ts 匯出函式 | ORDER_STATE_MACHINE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_AMOUNT | 金額不合法（建立訂單金額 ≤ 0 等）的失敗原因 reason | resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md |
| MSG-002 | AMOUNT_MISMATCH | 付款金額不等於訂單金額的失敗原因 reason | resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md |
| MSG-003 | INVALID_TRANSITION | 目前狀態不允許該操作的失敗原因 reason | resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md |
| MSG-004 | REFUND_EXCEEDS_PAID | 退款累計超過已付金額的失敗原因 reason | resolved/features/訂單狀態機_失敗原因格式與多重錯誤優先序.md |
