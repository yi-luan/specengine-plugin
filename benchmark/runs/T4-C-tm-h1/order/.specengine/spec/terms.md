# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 訂單 | 顧客一次下單的紀錄，含訂單編號、顧客、商品、數量與金額 | orders | ORDER_SERVICE |
| 處理中 | 訂單剛建立、尚未確定結果的狀態 | status = PENDING | ORDER_SERVICE |
| 已確認 | 付款成功後的訂單狀態；只可因顧客取消而變為已取消 | status = CONFIRMED | ORDER_SERVICE |
| 庫存不足 | 庫存服務無法保留庫存時，訂單的狀態（終態） | status = REJECTED | ORDER_SERVICE |
| 付款失敗 | 付款服務無法扣款時，訂單的狀態（終態） | status = FAILED | ORDER_SERVICE |
| 已取消 | 顧客取消或逾時自動取消後的訂單狀態（終態） | status = CANCELLED | ORDER_SERVICE |
| 逾時取消 | 下單滿 15 分鐘仍為處理中，系統自動取消 | cancel_reason = TIMEOUT | ORDER_SERVICE |
| 顧客取消 | 顧客主動取消訂單（處理中或已確認） | cancel_reason = CUSTOMER | ORDER_SERVICE |
| 事件識別碼 | 訂單服務發出事件的 id，採 UUID v4，全系統唯一（代決，見需求方授權） | events.id（UUID v4） | ORDER_SERVICE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INVALID_INPUT | 下單輸入不合法（數量或金額非正整數，或欄位為空字串）的失敗原因 | resolved/data/輸入合法性.md |
| MSG-002 | DUPLICATE_ORDER | 訂單編號重複的失敗原因 | resolved/data/重複訂單編號.md |
| MSG-003 | NOT_CANCELLABLE | 訂單為庫存不足、付款失敗或已取消時，取消的失敗原因 | resolved/features/顧客取消可取消的狀態.md |
| MSG-004 | ORDER_NOT_FOUND | 取消不存在訂單的失敗原因 | resolved/features/不存在訂單的取消.md |
