# 刻意不做清單

| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-INVENTORY_RESERVATION-001 | 訂單狀態（處理中／已確認／庫存不足／付款失敗／已取消）的轉換、顧客取消與 15 分鐘逾時自動取消，屬訂單服務（`src/order.ts`），庫存服務只接收其發出的 OrderPlaced 與 OrderCancelled | 範圍外（屬其他模組） | INVENTORY_RESERVATION | 需求文件「團隊分工」第 4～7 點 | 2026-11-01 |
| X-INVENTORY_RESERVATION-002 | 向顧客扣款、退款與 PaymentSucceeded／PaymentFailed／PaymentRefunded 的發出，屬付款服務（`src/payment.ts`），庫存服務只接收其發出的 PaymentFailed | 範圍外（屬其他模組） | INVENTORY_RESERVATION | 需求文件「團隊分工」第 3、5、6 點 | 2026-11-01 |
| X-INVENTORY_RESERVATION-003 | 事件匯流排的廣播、重送與整合接線，屬整合人員；庫存服務不自行訂閱或轉發事件，只透過 `handle(event)` 被動接收並以回傳值發出事件 | 範圍外（屬其他模組） | INVENTORY_RESERVATION | 需求文件「團隊分工」與「技術介面」 | 2026-11-01 |
