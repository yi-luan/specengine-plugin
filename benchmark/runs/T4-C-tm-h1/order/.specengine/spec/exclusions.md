| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-ORDER_SERVICE-001 | 收到 StockReserved 不做任何處理，回傳空陣列 | 系統無動作 | ORDER_SERVICE | 需求「技術介面」：每個服務對自己不關心的事件類型直接回傳空陣列 | 2026-11-01 |
| X-ORDER_SERVICE-002 | 收到 StockReleased、PaymentRefunded、OrderCancelled 不做任何處理，回傳空陣列 | 系統無動作 | ORDER_SERVICE | 需求「技術介面」：同上 | 2026-11-01 |
| X-ORDER_SERVICE-003 | 不處理庫存的保留與放回，也不處理付款的扣款與退款 | 範圍外（屬其他模組） | ORDER_SERVICE | 需求「團隊分工」：庫存服務與付款服務各自負責 | 2026-11-01 |
| X-ORDER_SERVICE-004 | 取消時傳入的時間參數不寫入訂單，也不影響取消判定 | 系統無動作 | ORDER_SERVICE | 流程對齊第 1 次確認缺口 (b)，需求方授權執行者決定 | 2026-11-01 |
