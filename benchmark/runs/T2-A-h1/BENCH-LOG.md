# BENCH-LOG T2-A-h1

## 時間

- 開始：2026-10-31 23:24:14
- 結束：2026-10-31 23:25:26

## 假設

- createOrder 金額必須為大於 0 的整數；0、負數、非整數一律回傳失敗（需求只說「大於 0」，「整數元」取自技術介面註解）。
- createOrder 不驗證 id（需求未定義 id 規則），原樣使用。
- pay 只接受與訂單金額完全相等的單次全額付款，不支援分次付款；已付款的訂單不可再付款。
- cancel 對已付款訂單：status 改為 CANCELLED，paidAmount 保留原值作為付款紀錄，refundedAmount 設為 paidAmount（全額退還）；狀態不會變成 REFUNDED。
- cancel 對已建立訂單：paidAmount 為 0，refundedAmount 維持 0。
- 已出貨、已退款、已取消的訂單不可取消（需求只允許已建立或已付款取消）。
- refund 只接受 SHIPPED 狀態；分次退款後狀態維持 SHIPPED，直到累計退款等於已付金額才變為 REFUNDED。
- refund 金額必須為大於 0 的整數；超過剩餘可退金額（已付金額減累計退款）回傳失敗，不做部分退款。
- 失敗時回傳 `{ ok: false, reason }`，reason 為繁體中文字串，需求未定義錯誤代碼，因此不另設代碼。
- 所有操作失敗時不修改傳入的 order（純函式，成功時才回傳新物件）；測試以快照比對驗證。
- 未修改 src/index.ts（需求只要求 src/order.ts 匯出，未要求 re-export）。
- feature 檔以 `# language: zh-TW` 撰寫中文 Gherkin 關鍵字；step 定義放在 tests/steps/order.steps.ts。cucumber.cjs 未修改。

## 產出檔案

- src/order.ts：訂單狀態機純函式（createOrder、pay、ship、cancel、refund）與型別。
- tests/features/order.feature：20 個場景。
- tests/steps/order.steps.ts：step 定義與每場景重置狀態的 Before hook。
- BENCH-LOG.md：本檔。

## npm test 摘要

- 20 scenarios (20 passed)
- 78 steps (78 passed)
- `npx tsc --noEmit`：無錯誤。

## 工具錯誤

- 無。編輯器診斷曾回報 feature 的 step 為 undefined，那是在 step 檔建立前產生的過時結果；之後 npm test 全數通過。
