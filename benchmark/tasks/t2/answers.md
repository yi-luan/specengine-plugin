# 標準答案表（T2 訂單狀態機）— 回答者只准依此表回答

| 洞 | 類型 | 問題 | 標準答案 |
| :-- | :-- | :-- | :-- |
| H1 | 必問 | 已出貨的訂單能不能取消？ | 不能，拒絕。reason 固定為 `INVALID_TRANSITION` |
| H2 | 必問 | 已取消的訂單能不能付款／出貨／退款／再取消？ | 全部不能，reason 固定為 `INVALID_TRANSITION` |
| H3 | 必問 | 已付款訂單取消並退還後，狀態是「已取消」還是「已退款」？refundedAmount 要不要記？ | 狀態 `CANCELLED`；refundedAmount = paidAmount |
| H4 | 必問 | 已付款但未出貨的訂單可以直接退款嗎？ | 不行，要走取消。reason 固定為 `INVALID_TRANSITION` |
| H5 | 必問 | 部分退款後狀態是什麼？ | 維持 `SHIPPED`，refundedAmount 累加 |
| H6 | 必問 | 退款金額為 0 或負數？ | 拒絕，reason 固定為 `INVALID_AMOUNT` |
| H7 | 必問 | 單次退款超過剩餘可退金額（已付 − 累計已退）時？ | 整筆拒絕不截斷，reason 固定為 `REFUND_EXCEEDS_PAID` |
| H8 | 必問 | 付款金額不等於訂單金額（少付或多付）時？ | 拒絕，reason 固定為 `AMOUNT_MISMATCH`；不允許部分付款 |
| H9 | 必問 | 已退款（REFUNDED）的訂單能不能再退款／出貨／取消／付款？ | 全部不能，reason 固定為 `INVALID_TRANSITION` |
| H10 | 必問 | 失敗原因的格式與多重錯誤的優先序？ | 固定英文代碼：`INVALID_AMOUNT`、`AMOUNT_MISMATCH`、`INVALID_TRANSITION`、`REFUND_EXCEEDS_PAID`。檢查順序：先狀態（INVALID_TRANSITION）→ 再金額合法性（INVALID_AMOUNT）→ 再金額比對（AMOUNT_MISMATCH / REFUND_EXCEEDS_PAID） |
| H11 | 必問 | 已建立（未付款）的訂單取消時 refundedAmount？已建立的訂單能不能出貨？ | 取消後 refundedAmount = 0、paidAmount = 0；已建立不能出貨，`INVALID_TRANSITION` |
| T-a | 陷阱 | （需求有寫）建立訂單金額必須 > 0 | 行為不該問；0 或負數拒絕。若問 reason 代碼，答 `INVALID_AMOUNT` |
| T-b | 陷阱 | （需求有寫）退款可以分多次 | 不該問；兩次部分退款累計等於已付金額 → `REFUNDED` |
| T-c | 陷阱 | （需求有寫）已付款訂單取消要退全部已付金額 | 不該問 |

回答規則：
- 問到表上的洞，照標準答案回答，不加油添醋。
- 問到表上沒有的業務問題，一律回答「你決定，照你的最佳判斷」並記錄該題。技術環境問題照專案實況回答。
- 不主動提示、不糾正、不要求補測試。
