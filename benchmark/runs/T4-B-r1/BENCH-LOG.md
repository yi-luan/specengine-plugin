# BENCH-LOG — T4-B-r1 (GitHub Spec Kit flow)

## 時間
- 開始：2026-11-01 02:35:32
- 喚醒 #1（specify Q1–Q3 答案）：2026-11-01 02:41:33
- 喚醒 #2（clarify Q4–Q6 答案）：2026-11-01 02:44:24
- 實作全綠：2026-11-01 02:56:15
- 結束：2026-11-01 02:57:41

## 各 skill 完成摘要

### speckit-constitution
- 無 `.specify/extensions.yml`，hooks 略過。
- `resolve-template.ps1 constitution-template -Json` 成功。
- 寫入 `.specify/memory/constitution.md` v1.0.0（五原則：Specification-First、BDD Tests、
  Single Verification Command `npm test`、Fixed Public Interfaces、Simplicity/Determinism；
  技術約束：TypeScript、cucumber-js、src/、tests/）。

### speckit-specify
- 短名：`event-driven-order-flow`；feature_numbering=sequential → `specs/001-event-driven-order-flow/`。
- 複製 spec-template → spec.md；寫 `.specify/feature.json`。
- spec.md 含 5 個 user stories、19 條 FR、5 條 SC、Edge cases、Assumptions。
- 3 個 [NEEDS CLARIFICATION]（上限 3）→ 向需求方提問 Q1–Q3（見下）。
- checklists/requirements.md：15/16 通過 → 答案整合後 16/16。

### speckit-clarify
- `check-prerequisites.ps1 -Json -PathsOnly` 成功。
- 覆蓋掃描：Functional/Data/Lifecycle/Edge/Constraints/Terminology/Completion Clear；
  Non-Functional 不適用（純記憶體）。3 題（Q4–Q6）全部回答並整合；checklist 16/16 維持。

### speckit-plan
- `setup-plan.ps1 -Json` 成功複製 plan-template。
- 產出 plan.md（Technical Context、Constitution Check 全 PASS、Project Structure）、research.md
  （7 項決策：訂單+步驟去重、remember-then-settle、終態、逾時含等號、計數器 id、驗證順序、測試 harness）、
  data-model.md（Order / Reservation / Charge 狀態轉移表）、contracts/shop-api.md、quickstart.md。

### speckit-tasks
- `setup-tasks.ps1 -Json` 成功；AVAILABLE_DOCS = research, data-model, contracts/, quickstart。
- tasks.md 共 24 項：Setup 4、Foundational 1、US1 5、US2 3、US3 4、US4 2、US5 2、Polish 3；
  憲法 II 要求測試先行，每個 story 先寫 feature 檔。

### speckit-implement
- `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` 成功；checklist 16/16 PASS 自動續行；
  `.gitignore` 已含 node_modules/ 與 reports/。
- 先寫 `src/ids.ts`、`src/shop.ts`（stub 丟 not implemented）、`tests/support/world.ts`、
  `tests/steps/shop.steps.ts`、6 個 feature 檔 → `npm test` 紅燈（66 scenarios failed）。
- 再寫 `src/order-service.ts`、`src/inventory-service.ts`、`src/payment-service.ts`，`src/shop.ts` 改為 re-export。
- 第一次綠燈嘗試 64/66；2 個失敗為測試前提錯誤（見工具錯誤 3），改寫後 67/67 全綠。
- 24/24 任務標記 [X]；README 補一段說明；plan/quickstart 補上 order-validation.feature。

### speckit-converge（第 1 輪）
- `check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks` 成功。
- 逐項核對：FR-001～FR-019 全部有對應實作與 feature 情境；SC-001～SC-005 全部由測試涵蓋
  （SC-005：整套 0.06 秒）；US1–US5 每個 acceptance scenario 至少一個 Gherkin 情境；
  Edge Cases 全部有情境；plan 的檔案佈局與 7 項 research 決策與實際程式一致；
  憲法 I–V 無違反（三個服務檔只 import `ids.js` 與型別，不互相引用；公開介面逐字相同；無新依賴）。
- 無 missing / partial / contradicts / unrequested 發現 → **Converged**，tasks.md 未變動。

## 問答原文

### specify 階段（2026-11-01，第 1 輪提問）
- Q1 可取消的訂單狀態（A: PENDING+CONFIRMED / B: 只 PENDING / C: 除 CANCELLED 外皆可）
  → **A**。需求方補充原文：「REJECTED／FAILED／CANCELLED 取消回 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，
  不發事件；找不到訂單回 `ORDER_NOT_FOUND`。已確認取消時 cancelReason 為 `CUSTOMER`，庫存放回、全額退款。」
- Q2 15 分鐘逾時邊界是否含等號（A: `now >= placedAt+15m` / B: 嚴格大於）→ **A**。
- Q3 取消後才到達的 PaymentSucceeded 誰贏（A: 取消為最終並退款 / B: 付款贏 / C: 維持取消但不退款）
  → **A**。需求方補充原文：「CANCELLED／REJECTED／FAILED 是終態，之後任何事件都不改變訂單狀態。」
- 整合：spec.md US3 s5–7、US4 s1、US5 s7/s9、FR-006/008/011、Edge Cases、Clarifications、Assumptions 已更新；
  checklist 16/16。

### clarify 階段（2026-11-01，第 2 輪提問）
- Q4 OrderCancelled 放回庫存是否發 `StockReleased`（A: 一律發 / B: 只付款失敗時發）
  → **A**。需求方補充原文：「只放回實際保留的數量，同一張訂單最多放回一次；沒保留過就不加庫存、不發 `StockReleased`。」
- Q5 placeOrder 拒絕時的 reason（建議 DUPLICATE_ORDER / INVALID_INPUT）
  → 需求方原文：「重複 orderId → `DUPLICATE_ORDER`；qty 或 amount 不是正整數（amount 也必須是正整數）、
  orderId／customerId／sku 為空字串 → `INVALID_INPUT`。都不建立訂單、不發事件。」
- Q6 不同 id 的重送事件是否視為重複（A: 訂單+步驟去重 / B: 只看事件 id）
  → 需求方原文：「你決定，照你的最佳判斷。」→ 我選 **A**（訂單+步驟去重，杜絕重複扣款/重複保留）。
- 整合：spec.md US5 s8–10（修正編號）、Edge Cases、FR-002/009/013、Clarifications、Assumptions。

## 自行決定的假設
（寫於 spec.md Assumptions / research.md）
1. 事件廣播由呼叫端負責；服務不互相呼叫。
2. 只有 `tick(now)` 觸發逾時取消；cancelOrder/handle 不會順帶逾時。
3. 逾時後但 tick 前的顧客取消仍算 CUSTOMER。
4. PaymentFailed 已釋放庫存後，再收到 OrderCancelled 不重複釋放（補償最多一次）。
5. 付款服務以 OrderPlaced 取得 customerId/amount，與 StockReserved 任一先到都暫存等齊（remember-then-settle）。
6. 逾時取消與顧客取消發出相同的 OrderCancelled，下游補償一致。
7. 事件 id = 服務前綴 + 全程序單一計數器（`ord-n`/`inv-n`/`pay-n`），全系統唯一且無亂數。
8. qty 與 amount 都必須是正整數（≥1）（Q5 後定案）。
9. 冪等鍵：一律以 (orderId, step) 去重，不論事件 id 相同或不同（Q6 需求方授權我決定）。
10. 未知 SKU 可用量 0；未知顧客餘額 0。
11. 取消未知訂單 → ORDER_NOT_FOUND；取消 REJECTED/FAILED/CANCELLED → NOT_CANCELLABLE（Q1 定案）。
12. tick(now) 的 now 早於下單時間時不取消；時間不會讓訂單倒退。
13. placeOrder 驗證順序：先 INVALID_INPUT 再 DUPLICATE_ORDER。
14. 庫存服務在 OrderPlaced 之前收到 OrderCancelled 或 PaymentFailed 時，記為 closed，之後的 OrderPlaced 不保留、不發事件。
15. 付款服務對未知訂單的 StockReserved/OrderCancelled 只記錄旗標，不發事件；詳情到齊才結算。
16. `getOrder` 非 CANCELLED 時不帶 `cancelReason` 鍵。
17. 已 CONFIRMED 的訂單只會因 cancelOrder 變成 CANCELLED，其他事件一律忽略。

## npm test 摘要
- `npm test`：67 scenarios (67 passed)、654 steps (654 passed)、0m00.055s；0 undefined / 0 pending。
- `npm run typecheck`：tsc --noEmit 無錯誤。
- feature 檔：successful-purchase、order-validation、insufficient-stock-or-funds、customer-cancellation、
  timeout-cancellation、reliable-delivery（tests/features/）。

## converge 輪數
- 1 輪（第 1 輪即 Converged，未回 implement）。

## 工具錯誤
1. Write/Edit 對既有檔案要求先 Read（constitution.md、spec.md、checklist、BENCH-LOG 各在喚醒後一次）；
   重讀後重試成功，無資料損失。
2. Cucumber expression 的 `event(s)` 是「可選文字」語法，feature 檔卻寫了字面 `event(s)` → 第一次跑出現
   50 個 undefined steps；把 feature 文字改為 `events` 後解決（步驟定義不變）。
3. 兩個情境（customer-cancellation「PENDING 取消不退款」、timeout-cancellation「未付款逾時不退款」）前提錯誤：
   測試 broker 佇列裡尚未送達的 StockReserved 比 OrderCancelled 先送到付款服務，因此先扣款再退款
   （餘額仍正確），與情境字面「0 PaymentSucceeded」矛盾。屬測試前提問題非產品 bug；改寫為明確逐一送達，
   並新增一個「延遲扣款仍全額退回」情境。
4. 無腳本（.ps1）失敗；無 npm/tsx 環境問題。
