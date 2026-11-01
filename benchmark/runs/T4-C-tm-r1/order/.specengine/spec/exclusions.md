# 刻意不做清單

| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-ORDER_SERVICE-001 | 訂單服務收到 OrderPlaced、StockReserved、StockReleased、PaymentRefunded、OrderCancelled 事件時不做任何處理，handle 直接回傳空陣列（需求：服務對自己不關心的事件類型直接回傳空陣列） | 系統無動作 | ORDER_SERVICE | 需求原文第 8 點與「技術介面」節 | 2026-11-01 |
| X-ORDER_SERVICE-002 | 庫存的保留、拒絕與放回（StockReserved／StockRejected／StockReleased 的發出）屬庫存服務，訂單服務不保存庫存狀態 | 範圍外（屬其他模組） | ORDER_SERVICE | 需求「團隊分工」節 | 2026-11-01 |
| X-ORDER_SERVICE-003 | 扣款、退款與餘額（PaymentSucceeded／PaymentFailed／PaymentRefunded 的發出）屬付款服務，訂單服務不保存金錢狀態 | 範圍外（屬其他模組） | ORDER_SERVICE | 需求「團隊分工」節 | 2026-11-01 |
| X-ORDER_SERVICE-004 | 事件匯流排的廣播、重送與排序由整合人員負責；訂單服務不自行把自己發出的事件餵回自己的 handle，也不直接呼叫其他服務 | 範圍外（屬其他模組） | ORDER_SERVICE | 需求「技術介面」節 | 2026-11-01 |
| X-ORDER_SERVICE-005 | 不驗證下單時間 at、取消時間 at 與 tick 的 now 的時間字串格式；需求保證一律為 ISO 8601，無法解析時不做任何防禦（flow-align 疑似缺口 (a)，需求方授權執行者裁量） | 不提供功能 | ORDER_SERVICE | sdd/flow-design/ORDER_SERVICE.md 第 1 次確認 | 2026-11-01 |
