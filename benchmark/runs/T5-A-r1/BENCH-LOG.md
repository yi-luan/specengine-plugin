# BENCH-LOG：T5-A-r1 限量搶購

- 開始時間：2026-11-02 01:18:42
- 結束時間：2026-11-02 02:31:31

## 產出檔案

- `src/flash.ts`：`Store`／`FlashSale` 介面與 `createFlashSale` 實作
- `tests/features/flash-sale.feature`：33 個情境（含 2 個 Scenario Outline）
- `tests/steps/flash.steps.ts`：Step Definitions
- `tests/support/memory-store.ts`：記憶體版 `Store`（px 以注入時鐘計算）＋故障注入包裝（當機／卡住）
- `tests/support/world.ts`：cucumber World（共用時鐘、共用 Store、多台伺服器）

## 設計摘要

- 「搶不搶得到」的決策點是 `incrBy`：先加再檢查，超過就減回去。每人限購計數器與全檔已保留計數器各一個；任何並發下都不會超賣、不會超過限購。
- `holdId = "{saleId}:{requestId}"`。保留紀錄與「這個請求的最終答案」都用 `set nx` 寫入；寫不進去的一方回滾自己加過的件數，沿用已存在的那張保留。因此同一個 requestId 不論重送幾次、打到哪台伺服器，都只保留一次、回同一張保留。
- 保留狀態轉移（HELD → PAID／EXPIRED）用 `claim:{holdId}` 的 `set nx` 決定贏家：付款通知重送、多台同時 sweep、付款與 sweep 互相競爭都只會成功轉移一次、件數只還一次。
- 伺服器中途當機：下一次重送會接手已寫好的保留紀錄；sweep 看到有 claim 但狀態還沒寫完的保留會幫忙收尾。

## 假設

1. 搶購「結束時間」含端點：`now >= endsAt` 即視為已結束（ENDED）；開始時間 `now >= startsAt` 即可搶。
2. 保留到期含端點：`now >= expiresAt` 即視為到期，到期後才到的付款通知回 `HOLD_EXPIRED`，並順手把那張保留釋放（不必等排程）。
3. 保留到期時間固定為搶到當下 +10 分鐘，不因搶購結束時間截短。
4. 同一個 `requestId`（同一檔）代表同一個請求；重送一律回第一次成功的結果，即使那張保留後來已到期釋放，也不會重新扣件數。新的購買意圖應使用新的 requestId。requestId 假設由客戶端保證唯一，不另外比對 customerId。
5. 失敗的搶購結果（SOLD_OUT、LIMIT_EXCEEDED 等）不記憶；同一 requestId 重送時會重新評估，所以「先搶不到、有人釋放後重送」可以成功。
6. 單次搶購件數超過每人限購直接回 `LIMIT_EXCEEDED`；累計超過（連點）同樣回 `LIMIT_EXCEEDED`。每人限購計算的是保留中＋已成交的件數，已釋放的不算。
7. `qty` 必須是正整數，否則回 `INVALID_QTY`。開檔時 `quantity`、`perCustomerLimit` 必須是正整數、`startsAt < endsAt`、時間可解析，否則回 `INVALID_INPUT`；同一 `saleId` 重複開檔回 `SALE_EXISTS`。不要求 `perCustomerLimit <= quantity`。
8. 付款通知對已成交（PAID）的保留重送回成功；對已釋放的回 `HOLD_EXPIRED`；不存在的回 `HOLD_NOT_FOUND`。
9. `getRemaining` 對不存在的搶購回 0；結果限制在 `[0, quantity]`。並發高峰時計數器可能短暫超過限量，因此剩餘件數可能短暫偏低，但絕不偏高。
10. 失敗原因採固定英文代碼：`INVALID_INPUT`、`SALE_EXISTS`、`SALE_NOT_FOUND`、`NOT_STARTED`、`ENDED`、`INVALID_QTY`、`LIMIT_EXCEEDED`、`SOLD_OUT`、`HOLD_NOT_FOUND`、`HOLD_EXPIRED`。
11. 伺服器當機的殘留：Store 只有單鍵原子操作、沒有交易，所以「加了件數之後、寫入保留紀錄之前」當機會讓那幾件暫時被卡住（少賣），直到搶購結束都不會回來；同理，sweep 搶到 claim 之後、減回件數之前當機也會少賣。選擇少賣而非冒超賣風險（若把標記放在減回之前，重跑時會重複減回而超賣）。
12. 伺服器在「加完每人限購計數、還沒寫保留紀錄」時卡住，此時同一請求重送到另一台會先被 `LIMIT_EXCEEDED` 擋下；卡住的那台恢復後仍會完成原請求，之後再重送即可拿到同一張保留。這是同一限制的另一面，測試中有情境記錄此行為。
13. 保留紀錄永不刪除（只改狀態），`getHold` 對任何歷史保留都查得到；`active:{saleId}` 集合只保留還在 HELD 的保留，sweep 只掃這個集合。
14. 不使用 `Store.del`（介面保留，但目前實作沒有需要刪除的 key）。
15. 測試情境用英文 Gherkin 關鍵字＋繁體中文步驟文字；Store 的 `px` 以 `now()` 時鐘計算，與需求一致。

## npm test 摘要

- `npm run typecheck`：通過。
- `npm test`：33 scenarios (33 passed)，336 steps (336 passed)。連跑 4 次皆全綠。

## 工具錯誤

- 無。IDE 的 cucumber 擴充套件在編輯 feature 檔時回報「Undefined step」警告，是編輯器索引問題，實際 `npm test` 全部步驟皆有定義。
