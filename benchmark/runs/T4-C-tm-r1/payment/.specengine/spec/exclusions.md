# 刻意不做清單

| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-PAYMENT-001 | 下單後 15 分鐘未完成付款的自動取消由訂單服務判定與發出 OrderCancelled，付款服務不計時、不主動取消 | 範圍外（屬其他模組） | PAYMENT | 需求第 7 點與團隊分工（spec-01 判定） | 2026-11-01 |
| X-PAYMENT-002 | 顧客取消訂單的指令（cancelOrder）與訂單狀態查詢屬訂單服務；付款服務只回應 OrderCancelled 事件 | 範圍外（屬其他模組） | PAYMENT | 需求第 6 點與技術介面（spec-01 判定） | 2026-11-01 |
| X-PAYMENT-003 | 庫存保留與放回（StockReserved／StockRejected／StockReleased 的發出）屬庫存服務；付款失敗後放回庫存不由付款服務處理 | 範圍外（屬其他模組） | PAYMENT | 需求第 2、5 點與團隊分工（spec-01 判定） | 2026-11-01 |
| X-PAYMENT-004 | 付款服務收到 OrderPlaced 只記 customerId 與 amount，不檢查 sku／qty 等與付款無關的欄位 | 系統無動作 | PAYMENT | flow-align 第 1 次疑似缺口 (a)，使用者授權執行者裁示為非缺口 | 2026-11-01 |
| X-PAYMENT-005 | 已處理事件 id 與訂單記錄永久保留在記憶體內，不做清理或過期 | 系統無動作 | PAYMENT | flow-align 第 1 次疑似缺口 (b)，使用者授權執行者裁示為非缺口 | 2026-11-01 |
