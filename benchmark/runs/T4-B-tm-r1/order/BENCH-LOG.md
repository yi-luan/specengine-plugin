# BENCH-LOG — T4-B-tm-r1 / order service (Spec Kit)

## 時間
- 開始：2026-11-01 02:52:05
- 回合 2 喚醒（specify Q1–Q3 答案）：2026-11-01 02:56:08
- 回合 3 喚醒（clarify C1–C4 答案）：2026-11-01 02:59:01

## 工具錯誤
- 2026-11-01 02:5x — Write constitution.md 第一次失敗（工具要求先 Read 檔案），Read 後重寫成功。無其他影響。
- 2026-11-01 02:56 / 02:59 — 每次被喚醒後第一批 Edit 因「檔案尚未 Read」被拒（回合 2 一次、回合 3 九次），重新 Read 後重做成功。無其他影響。

## speckit-constitution
- 完成：`.specify/memory/constitution.md` v1.0.0（Ratified 2026-11-01）。
- 原則：I 規格先行/測試先行（cucumber-js、`npm test`）、II 固定共用契約（events.ts/shop.ts 不可改）、III 服務隔離（只改 src/order.ts 與 tests/）、IV 至少一次且無序送達需冪等、V 簡單與整數運算。
- 技術棧：TypeScript、cucumber-js、產品碼 src/、測試 tests/（features/steps/support）。
- 無 extensions.yml，無 hook。

## 問答紀錄

### specify 階段（回合 1 提問，回合 2 2026-11-01 02:56:08 喚醒取得答案）

**Q1（已確認訂單可否取消）**：訂單已是「已確認」（CONFIRMED）時，顧客取消要成功（變成 CANCELLED/CUSTOMER 並發 `OrderCancelled`，讓付款服務退款）還是要被拒絕？
選項 A 允許（PENDING 與 CONFIRMED 都可取消）／B 不允許（只有 PENDING 可取消）／Custom。
**A1**：A。已確認取消時訂單變 CANCELLED（cancelReason `CUSTOMER`），發 `OrderCancelled`。REJECTED／FAILED／CANCELLED 不能取消，回 `{ ok: false, reason: 'NOT_CANCELLABLE' }`，不發事件；找不到訂單回 `ORDER_NOT_FOUND`。

**Q2（15 分鐘邊界）**：`tick(now)` 推進到恰好下單時間 + 15 分 00 秒時，仍為 PENDING 的訂單算逾時還是仍在期限內？
選項 A 恰好 15:00 即逾時（now ≥ at + 15min）／B 超過才逾時（now > at + 15min）／Custom。
**A2**：A。以訂單服務當下的狀態判定，仍為 PENDING 且 now − 下單時間 ≥ 15 分鐘就取消，cancelReason `TIMEOUT`，發 `OrderCancelled`。

**Q3（終態後再收到結果事件）**：訂單已是 CONFIRMED / REJECTED / FAILED / CANCELLED 之後，又收到 `PaymentSucceeded`、`StockRejected` 或 `PaymentFailed`，是否一律先到者為準？特別是逾時取消後才收到 `PaymentSucceeded`，維持 CANCELLED 還是改為 CONFIRMED？
選項 A 一律先到者為準／B CANCELLED 後收到 PaymentSucceeded 改為 CONFIRMED／C 後到者為準／Custom。
**A3**：A。CANCELLED／REJECTED／FAILED 是終態，之後任何事件都不改變訂單狀態；CONFIRMED 只會因顧客取消而變成 CANCELLED。

### clarify 階段（回合 2 提問，2026-11-01 02:58:17）

**C1（重複訂單編號的失敗理由）**：以已存在的訂單編號再次下單時，`placeOrder` 回傳的失敗理由字串是什麼？建議 A `DUPLICATE_ORDER`。
**C2（數量／金額驗證）**：數量或金額不是正整數時是否拒絕下單？理由字串？建議 A 拒絕、理由 `INVALID_INPUT`。
**C3（期限已過但 tick 未推進時的顧客取消）**：cancelReason 為 CUSTOMER 還是 TIMEOUT？建議 A CUSTOMER。
**C4（PaymentSucceeded 金額與訂單不符）**：仍確認還是忽略？建議 A 仍確認（不比對金額）。
回合 3 喚醒 2026-11-01 02:59:01 取得答案：
**A-C1**：A。orderId 已存在 → `DUPLICATE_ORDER`，不建立訂單、不發事件。
**A-C2**：A。qty 或 amount 不是正整數、或 orderId／customerId／sku 為空字串 → `INVALID_INPUT`，不建立訂單、不發事件。
**A-C3**：A。顧客取消的 cancelReason 為 `CUSTOMER`。
**A-C4**：「你決定，照你的最佳判斷。」→ 工程師決定採 A：仍確認、不比對金額。

## 自行決定的假設
- C4（需求方授權）：`PaymentSucceeded.amount` 與訂單金額不符時仍變 CONFIRMED，不比對金額。
- 逾時只由 `tick` 判定；`placeOrder`／`cancelOrder`／`handle` 不觸發逾時判定。
- 15 分鐘從 `placeOrder` 輸入的 `at` 起算；`tick` 對每張 PENDING 訂單各自以 now − at ≥ 15min 判定，時間倒退的 tick 自然不會命中任何訂單。
- 針對不存在訂單的結果事件直接忽略（OrderPlaced 由本服務發出，結果事件不可能早於下單）。
- 重複事件以事件 id 去重（已處理 id 集合），加上狀態規則雙重保障。
- 事件 id 格式 `order-<序號>`（服務前綴避免與同事碰撞）。
- `getOrder` 未取消時不帶 `cancelReason` 鍵；已取消時帶 `CUSTOMER`／`TIMEOUT`。
- 輸入驗證（INVALID_INPUT）先於重複檢查（DUPLICATE_ORDER）。
- 時間字串以 `Date.parse` 轉毫秒比較，不驗證格式（由呼叫方保證）。

## speckit-specify
- 完成：`specs/001-order-service/spec.md`、`specs/001-order-service/checklists/requirements.md`、`.specify/feature.json`。
- 4 個 user story（下單與狀態推進、顧客取消、15 分鐘逾時、重複/亂序）、FR-001～FR-014、SC-001～SC-005。
- 留下 3 個 [NEEDS CLARIFICATION]（上限 3）：Q1 已確認訂單可否取消、Q2 15 分鐘邊界、Q3 終態後的後續事件。
- 回合 1 結束於 2026-11-01 02:55:22，以【待答】提問 Q1–Q3。
- 回合 2：答案寫回 spec（US2-2/3/4、US3-3、US4 敘述與 4-2/2a/2b、FR-005/006/007/010、Key Entities 狀態轉移、Assumptions），checklist 16/16，新增 `## Clarifications` 區段。

## speckit-clarify
- 前置檢查 OK（FEATURE_SPEC = specs/001-order-service/spec.md），無 hook。
- 涵蓋掃描：Functional Scope Clear；Domain/State transitions Clear（Q1–Q3 後）；Edge/Failure Partial（失敗理由字串、輸入驗證、期限後取消、金額不符）；Non-functional/Integration Clear（記憶體內、固定介面）；Terminology Clear。
- 提出 C1–C4（≤5），回合 2 結束於 2026-11-01 02:58:17，以【待答】等待答案。
- 回合 3：C1–C4 寫回 spec（Clarifications 4 條、US1-6/7/7a/7b、FR-002/003、Edge Cases、Assumptions）。checklist 重驗 16/16 → 16/16，無變動。
- 涵蓋摘要：Functional Scope Clear、Domain/State Resolved、Interaction Clear、Non-functional Clear（記憶體內、無效能需求）、Integration Clear（固定介面）、Edge/Failure Resolved、Constraints Clear、Terminology Clear、Completion Clear。無 Outstanding/Deferred。

## speckit-plan
- `setup-plan.ps1 -Json` OK（BRANCH 001-order-service），無 hook。
- 產出：`plan.md`（Technical Context 無 NEEDS CLARIFICATION；Constitution Check I–V 全 PASS，設計後重檢 PASS；無 Complexity Tracking）、`research.md`（R1 id 去重、R2 tick 線性掃描 ≥15min、R3 `order-N` id、R4 Date.parse、R5 cucumber 結構、R6 測試自造事件）、`data-model.md`（Order 欄位、狀態轉移表、命令結果）、`contracts/order-service.md`、`quickstart.md`。

## speckit-tasks
- `setup-tasks.ps1 -Json` OK，無 hook。
- 產出 `tasks.md`：26 個任務、7 個 phase（Setup 3、Foundational 2、US1 6、US4 4、US2 4、US3 4、Polish 3）。因憲章原則 I 要求 Test-First，每個 story 含 feature/steps 任務先於實作。順序 US1 → US4 → US2 → US3（P1 優先）。MVP = US1。

## speckit-implement
- `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` OK；checklist 閘門 requirements.md 16/16 PASS，自動通過；`.gitignore` 已存在（node_modules/、reports/），未改動；無 hook。
- Phase 1–2：寫 `tests/features/order-service.feature`（52 情境，5 個 Rule）、`tests/support/world.ts`、`tests/steps/order.steps.ts`、`src/order.ts` 骨架 → `npm test` 紅燈（47 failed / 1 ambiguous / 4 passed）。
- 修正：cancel 與 tick 兩個步驟同時註冊為 Given 與 When 造成 ambiguous，移除重複定義。
- Phase 3–7：完整實作 `src/order.ts`（placeOrder 驗證→重複檢查→OrderPlaced；handle id 去重 + 僅 PENDING 生效；cancelOrder PENDING/CONFIRMED 可取消；tick ≥15min；getOrder 新物件）→ `npm run typecheck` 0 錯誤、`npm test` 52 scenarios (52 passed) / 233 steps (233 passed)。
- tasks.md T001–T026 全部標記 [X]。

## speckit-converge
- `check-prerequisites.ps1 -Json -RequireSpec -RequireTasks -IncludeTasks` OK，無 hook。
- 評估：14 FR + 5 SC + 30 驗收情境、6 項 plan 決策、憲章 I–V；grep 確認 src/order.ts 無 inventory/payment import、無 Date.now/new Date()。
- 結果：0 findings（missing/partial/contradicts/unrequested 皆 0）→ **Converged**，tasks.md 未改動。
- converge 輪數：1（第一輪即收斂，未回 implement）。

## 最終驗證
- `npm run typecheck`：0 錯誤。
- `npm test`：52 scenarios (52 passed)、233 steps (233 passed)。
- 變更檔案：.specify/memory/constitution.md、.specify/feature.json、src/order.ts、tests/features/order-service.feature、tests/steps/order.steps.ts、tests/support/world.ts、specs/001-order-service/**、BENCH-LOG.md。未動 src/events.ts、src/shop.ts、src/index.ts、src/inventory.ts、src/payment.ts。

## 結束時間
- 結束：2026-11-01 03:07:32
