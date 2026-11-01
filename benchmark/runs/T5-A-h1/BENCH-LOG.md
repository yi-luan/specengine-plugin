# BENCH-LOG：T5-A-h1 限量搶購

- 開始時間：2026-11-02 01:18:39
- 結束時間：（見檔尾）

## 假設

- 保留到期時間：以建立保留當下的 now() 加 10 分鐘計算，輸出格式與 now() 相同（整秒時省略 .000）。
- 到期判定：now >= expiresAt 即視為到期（含到期那一刻）。
- 搶購時間窗：now >= startsAt 才可搶；now >= endsAt 即視為已結束。
- 請求識別：(saleId, customerId, requestId) 相同視為同一請求，重送回傳同一個保留；qty 不同回 REQUEST_MISMATCH；原保留已到期回 HOLD_EXPIRED。
- 開賣：saleId 重複回 SALE_EXISTS；數量或限購非正整數、時間無法解析、開始時間不早於結束時間，回 INVALID_INPUT。
- 限購：單次 qty 大於 perCustomerLimit 直接拒絕；顧客計數包含保留中與已成交的件數，釋放時扣回。
- 釋放時機：件數只在排程 sweep 時歸還。已過期但排程尚未處理的保留仍佔件數，getRemaining 不會提前加回（最多延遲約一分鐘）。
- getHold 狀態：已過期但尚未被排程釋放的保留，對外顯示 EXPIRED（與付款拒絕的判定一致）。
- 付款判定時點：付款以寫入 PAID 認領（set nx）為準；寫入前先檢查未到期。與排程的 EXPIRED 認領競爭，只有一方成功。若付款在到期前通過檢查、卡住後寫入時排程已先認領 EXPIRED，則付款被拒絕。若排程尚未認領，則視為成交。
- 重複付款通知：已是 PAID 時回 ok（冪等）；已 EXPIRED 回 HOLD_EXPIRED；holdId 不存在回 HOLD_NOT_FOUND。
- 計數順序：先以 incrBy 扣顧客與全場計數，超過上限就退回；再登記待結案集合，最後建立保留紀錄（set nx）。計數先於紀錄，確保任何中斷都只會少賣、不會超賣。
- 已知限制（未補償）：伺服器在扣計數後、建立保留前當機，或排程認領 EXPIRED 後、退還件數前當機，該件數會永久少算（少賣）。需求未要求補償，未實作。
- 同一請求的併發副本：若兩份副本同時通過檢查，後寫入者退回自己的計數並回傳先建立的保留。
- 排程：以 claim 的 set nx 認領 EXPIRED，只有認領成功者退還件數，多台伺服器同時跑也只釋放一次；已有 PAID 或 EXPIRED 認領的保留只從待處理集合移除。
- 不存在的 saleId：grab 回 SALE_NOT_FOUND；getRemaining 回 0。
- Store 錯誤（reject）不另外處理，直接往上拋。
- 保留紀錄不設 px（不依賴 Store 的 TTL 自動刪除，避免與排程競爭）。
- 測試用記憶體 Store 的 px 以 FakeClock 計算；PausableStore 用來模擬伺服器處理到一半卡住。
- feature 使用 zh-TW Gherkin 關鍵字；cucumber.cjs 中的 `.specengine/spec/features` 路徑在本專案不存在，cucumber 直接忽略。
- 未修改 requirement 規定的 Store / FlashSale / createFlashSale 介面與名稱。

## 產出檔案

- src/flash.ts（產品碼）
- tests/support/fakes.ts（FakeClock、MemoryStore、PausableStore）
- tests/support/world.ts（cucumber World）
- tests/steps/flash-sale.steps.ts（step definitions）
- tests/features/flash-sale.feature（12 個場景）
- BENCH-LOG.md

## 測試結果

- npm test：12 scenarios passed，92 steps passed。
- npm run typecheck：通過。

## 工具錯誤

- 無。（編輯 feature 後 IDE 診斷出現 undefined-step 警告，屬於步驟尚未撰寫時的暫態，撰寫 steps 後 npm test 全綠。）

- 結束時間：2026-11-02 02:30:41

