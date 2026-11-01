# BENCH-LOG (T4-A-tm-h1 庫存服務)

開始時間：2026-11-01 02:44:15
結束時間：2026-11-01 02:45:35

## 假設

- 庫存足夠的判斷為 可供保留數量 >= 訂購數量；未知 SKU 視為庫存 0，直接拒絕。
- 數量必須是正整數；0 或負數或非整數一律 StockRejected。
- 同一張訂單的 OrderPlaced 重複送達時不再保留、不再發事件（回傳空陣列），避免重複庫存扣減。
- 被 StockRejected 的訂單之後收到取消或付款失敗，不增加庫存、不發事件。
- 付款失敗時放回保留庫存並發出 StockReleased；重複送達的 PaymentFailed 不會再次放回，也不會再發事件。
- 訂單取消（OrderCancelled，含客戶取消與逾時取消）時放回保留庫存，依需求文字只列出付款失敗才發 StockReleased，因此取消時不發任何事件。
- OrderCancelled 或 PaymentFailed 先於 OrderPlaced 到達時，記下該訂單已結案；之後到達的 OrderPlaced 不保留庫存、不發事件（亂序容錯）。
- 事件 id 採用 `inventory-<randomUUID>`，以服務前綴加隨機 UUID 確保全系統唯一。
- 初始化時複製傳入的 stock 物件，之後不會修改呼叫端的物件。
- getAvailable 對未知 SKU 回傳 0。
- StockReserved 與 StockReleased 等非庫存服務關心的事件，handle 直接回傳空陣列。

## 產出檔案

- src/inventory.ts：InventoryService 實作
- tests/features/inventory.feature：14 個場景（中文 Gherkin，`# language: zh-TW`）
- tests/steps/inventory.steps.ts：step definitions，測試自行準備 OrderPlaced / PaymentFailed / OrderCancelled 等事件
- BENCH-LOG.md：本紀錄

## npm test 摘要

```
14 scenarios (14 passed)
74 steps (74 passed)
```

另執行 `npm run typecheck`（tsc --noEmit），無錯誤。

## 工具錯誤

- 無。
- 備註：Node 24.18.0 尚未經 Cucumber 11 測試的版本提示，為 cucumber 輸出的提示訊息，不影響執行結果。
