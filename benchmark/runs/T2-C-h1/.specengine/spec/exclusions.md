| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-ORDER_STATE_MACHINE-001 | 本模組不對外呼叫金流退款；refund 只更新累計退款金額的記帳，實際退還款項由支付模組負責 | 範圍外（屬其他模組） | ORDER_STATE_MACHINE | flow-align 疑似缺口 (a)，需求方授權 Agent 判斷 | 2026-10-31 23:32 |
| X-ORDER_STATE_MACHINE-002 | createOrder 不檢查訂單編號的格式與唯一性，由呼叫方負責 | 系統無動作 | ORDER_STATE_MACHINE | flow-align 疑似缺口 (b)，需求方授權 Agent 判斷；並與 Q5 決定一致 | 2026-10-31 23:32 |
