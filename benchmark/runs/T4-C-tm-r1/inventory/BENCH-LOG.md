# BENCH-LOG：T4-C-tm-r1 inventory（SpecEngine 2.1.0）

- 開始時間：2026-11-01 02:52:05
- 結束時間：2026-11-01 03:12:13
- 角色：三人團隊中的庫存服務工程師，僅修改 `src/inventory.ts` 與自己的測試
- Plugin：<plugin>（2.1.0）
- 需求檔：<bench>/tasks/t4-team/requirement.md

## 喚醒紀錄

| # | 時間 | 事件 |
| :-- | :-- | :-- |
| 0 | 2026-11-01 02:52:05 | 開始 |
| 1 | 2026-11-01 03:00:27 | 喚醒：spec-02 第 1 輪 7 題答案到達 |
| 2 | 2026-11-01 03:05:38 | 喚醒：flow-align 第 1 次確認回覆到達 |
| 3 | 2026-11-01 03:12:13 | 結束（lock 已建、commit）|

## (a) spec-manifest-sync（首次導入）

- 模式：manifest 首次建立 ｜ CLAUDE.md 區塊首次插入（v2.1.0，無既有 `.claude/skills/` 工具，`{{EXISTING_TOOLS_NOTE}}` 整行移除）
- 必填 5 欄：Source Root `src/`、Step Definitions `tests/steps/`、BDD Framework `@cucumber/cucumber ^11.3.0`、Test Command `npm test`、Binding Layer `direct`（使用者事先給定）。全部已填，不需提問。
- 仍待確認：第 3 節「Test Functions / Variables / File Names」「Test Identifier Language」（無既有樣本、屬團隊決策；spec 04 預設 `en`）。
- 未修改兩個目標以外的檔案。

## 問答原文

### spec-02 第 1 輪提問（2026-11-01 02:59 送出，共 7 題、4 組）

- 第 1 組 [定位：R-INVENTORY_RESERVATION-003]
  - Q1（High）收到「訂單已取消」放回庫存後，要不要發出「庫存已放回事件」？[A] 發出 StockReleased [B] 不發事件、只放回 [Short]
- 第 2 組 [定位：R-005／R-006、stock_reservation.order_id]
  - Q2（High）同一張訂單的「下單事件」第二次送到時（庫存已確定不再變動），回什麼？[A] 回空陣列 [B] 重發與第一次相同結果的事件（新 id）[Short]
  - Q3（Medium）訂單沒有可放回的保留（已放回過、或當初被拒絕）時再收到付款失敗／訂單已取消，回什麼？[A] 回空陣列 [B] 曾放回過的再發一個 StockReleased；從未保留的回空陣列 [Short]
  - Q4（Medium）判定「這張訂單已處理過」的依據？[A] 訂單編號 [B] 事件 id [Short]
- 第 3 組 [定位：R-000／R-003 亂序]
  - Q5（High）放回事件（訂單已取消／付款失敗）比下單事件先到，之後下單事件到達時？[A] 先到的忽略，之後照常保留 [B] 記住已結束，之後不保留、回空陣列 [C] 記住已結束，之後不保留但發 StockRejected [D] 記住已結束，之後先保留立刻放回，發 StockReserved + StockReleased [Short]
- 第 4 組 [定位：R-000／R-001／R-007 邊界]
  - Q6（Medium）初始庫存表沒有的 SKU？[A] 視為可用庫存 0（getAvailable 回 0、下單一律 StockRejected）[B] 拋例外 [Short]
  - Q7（Medium）下單數量為 0 或負數？[A] 照一般規則算 [B] qty <= 0 一律 StockRejected [C] 不是庫存服務責任，不檢查不寫規則 [Short]
- 回答原文（2026-11-01 03:00:27 收到）：「1A 2A 3A 4短 5B 6A 7『你決定，照你的最佳判斷』」
  - Q1：只放回實際保留的數量，同一張訂單最多放回一次，放回時發 `StockReleased`；沒保留過就不加庫存、不發 `StockReleased`。
  - Q2：同一個事件（同 id）重複送達，第二次起直接忽略，不改任何狀態、不發任何事件。
  - Q4（自訂）：同一個事件 id 一律只處理一次；同訂單但不同事件 id 的情況你決定，照你的最佳判斷。
  - Q5：「訂單已取消」先到 → B，記住這張訂單已取消，之後到的 `OrderPlaced` 不保留庫存、不發任何事件。「付款失敗」先到的情況你決定。
  - Q6：未知 SKU 視為庫存 0，發 `StockRejected`；庫存不夠時整筆拒絕，不部分保留。
- 執行者依授權所做的決定（已記在 resolved/ 決策檔）：
  - Q4 同訂單不同事件 id 的 OrderPlaced → 視為已處理過，不重複保留、回空陣列（兩層去重：事件 id ＋ 訂單編號）。
  - Q5 「付款失敗」先到 → 比照 B（記住已結束，之後 OrderPlaced 不保留、不發事件）。
  - Q7 → B：qty <= 0 一律 StockRejected、庫存不變（避免負數 qty 憑空增加庫存）。

### spec-flow-align 第 1 次確認（2026-11-01 03:05 送出）

- 3 張圖：下單事件處理（R-000/001/005/009/010）、放回事件處理（R-002/003/006/008）、查詢可用庫存與不關心的事件（R-004/007）。
- 執行者疑似缺口 (a)(b)(c) 請裁示（見送出的訊息全文）。
- 回答原文（2026-11-01 03:05:38 收到）：「(1) (a) 對：已確認的訂單被取消，庫存照樣放回並發 `StockReleased`。(b) 對：沒保留過就不加庫存、不發 `StockReleased`。(c) 你決定，照你的最佳判斷。沒有其他遺漏。(2) 沒有不一致，確認。」
- 執行者依授權決定 (c)：事件 id 採 `crypto.randomUUID()`，不另立規則（記在 flow-design 索引「使用者已裁示非缺口」）。

## 階段彙報

### spec-run Step 00（起點判定）

- `spec-status.js --json` → exit 2（無任何矩陣）→ 起點 spec-01。

### spec-01 完成彙報（2026-11-01 02:58）

```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：INVENTORY_RESERVATION

矩陣：8 條 Rules ｜ erm.dbml：2 個 Tables ｜ terms.md：21 個術語 ｜ exclusions：3 條 ｜ 套用慣例：0 項
待答：7 題（High 3 ｜ Medium 4 ｜ Low 0）
階段：CLARIFYING
```

- 模組歸屬唯一（庫存服務），未向使用者提問。
- spec-status：stage CLARIFYING、next `spec 02`、pending 7、warnings 無。

### spec-02 完成彙報（2026-11-01 03:03）

```text
[Phase 02: Interactive Clarify] 執行完成！模組：INVENTORY_RESERVATION

決策：已解決 7 項 ｜ 掛起 0 項 ｜ 晉升慣例 3 項（POLICY-001～003）
寫回：matrix（+3 新增 R-008/009/010／7 修改 R-000/001/002/003/005/006/007）｜ exclusions（+0）｜ erm.dbml（+1 表 processed_event、stock_reservation 3 欄異動）｜ terms.md（+3 術語、+0 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align（11 條 Rule，超過小模組門檻）
```

- spec-status：stage CLARIFIED、next `spec flow-align`、pending 0、flowAligned false、warnings 無。
- 備註：Q4／Q5（付款失敗先到）／Q7 由需求方明示授權執行者決定，決定內容與理由寫在對應 resolved/ 決策檔。

### spec-flow-align 完成彙報（2026-11-01 03:06）

```text
✅ [Phase Flow-Align] 執行完成！模組：INVENTORY_RESERVATION
涵蓋 Rule：11 條 ｜ 流程階段：3 個 ｜ 已知取捨：3 條 ｜ 本輪新增範圍外裁示：0 條（非缺口裁示 3 條記入索引）
產出：flow-design/INVENTORY_RESERVATION.md（已通過）＋ flow-design/INVENTORY_RESERVATION/*.md ×3
```

### spec-03 完成彙報（2026-11-01 03:07）

```text
[Phase 03: Formalize Gherkin] 執行完成！模組：INVENTORY_RESERVATION
產出：.specengine/spec/features/庫存保留.feature
指標：Rule 11 條 ｜ Scenario/Outline 19 個（展開 36）｜ 句型 11 個（沿用 0 個，索引原為空）｜ PARKED 註解 0 個
Examples 核對：36 列，修正 0 列 ｜ feature-lint → PASS
階段：FORMALIZED
```

- spec-status：stage FORMALIZED、next `spec 04`、flowAligned true、warnings 無。

### spec-04 完成彙報（2026-11-01 03:09）

```text
[Phase 04: Generate Test Stub] 執行完成！模組：INVENTORY_RESERVATION

1. 框架：@cucumber/cucumber ^11.3.0（已安裝）；Binding Layer：direct
2. 產出：
   - tests/steps/inventory-reservation.steps.ts（Step 11 個，全部拋 Contract Not Implemented；@binds 指向 InventoryService.handle／getAvailable、createInventoryService）
   - tests/support/world.ts（InventoryWorld：service、lastResult、seenEventIds、queryResult；cucumber.cjs 已涵蓋 tests/support/**）
   - Driver 層：略過（direct）
3. 對齊 DBML 欄位 7 個（inventory_stock.sku/available、stock_reservation.order_id/sku/qty/status、processed_event.event_id），100% Red Stage（37 scenarios / 37 failed）
4. 模組階段狀態：STUBBED（已寫回 .specengine/sdd/overview.md）
```

- 未定義步驟清單取自 `npm test -- --dry-run --format snippets`（去重後 11 句，與 steps-index.json 一致）。
- Test Identifier Language 未填 → 依預設 `en`（英文識別字、kebab-case 檔名、中文註解）。

### spec-05 完成彙報（2026-11-01 03:11）

```text
[Phase 05: Coder Implement] 執行完成！模組：INVENTORY_RESERVATION
測試（in-process）：Scenario 37 ｜ PASS 37 ｜ FAIL 0 ｜ 測試（ui|api）：未執行（Binding Layer 為 direct，無第二 Driver）
形式化錯誤自修：0 件 ｜ snapshot 重建：1 次（原因：manifest Step Definitions 行去掉多餘反引號，與規格無關；重建前後 verify 皆 PASS）
產品代碼：src/inventory.ts ｜ Driver 實作：無（direct；step 函式體直接呼叫 createInventoryService）
verify → PASS ｜ lock → .specengine/sdd/locks/INVENTORY_RESERVATION.lock.json
階段：IMPLEMENTED
```

- 紅燈基準：37/37 failed（Contract Not Implemented）→ 實作後 37/37 passed、188 steps passed；`tsc --noEmit` 0 錯誤。
- 只修改 `src/inventory.ts`、`tests/steps/`、`tests/support/`；未動 `src/events.ts`、`src/shop.ts`、`src/order.ts`、`src/payment.ts`。
- Property-Based Testing Library 未宣告 → 略過 property test。

## lint / guard 輸出摘要

- 2026-11-01 02:58 spec-01 後 `feature-lint.js` → PASS（0 違規，句型索引 0 個）。
- 2026-11-01 03:03 spec-02 寫回後 `feature-lint.js` → PASS（矩陣 11 條結構正常）。
- 2026-11-01 03:07 spec-03 落盤後 `feature-lint.js` → PASS（11 個不重複句型，矩陣↔feature 一一對應）。
- 2026-11-01 03:09 `spec-guard.js snapshot` → 建立：.specengine/spec/ 5 檔全字節凍結、tests/steps/ 1 檔 11 句型；direct 略過 Driver 凍結。
- 2026-11-01 03:11 `spec-guard.js verify` → PASS；manifest 行整理後重建 snapshot（內容相同）再 verify → PASS。
- 2026-11-01 03:11 `spec-guard.js lock INVENTORY_RESERVATION` → 建立 locks/INVENTORY_RESERVATION.lock.json 與 locks/_shared.json。

## 工具錯誤或 Skill 文件矛盾

1. `spec-guard.js` 解析 manifest「Step Definitions Directory」行時，會把該行第一個「，」之前所有反引號字串都當成目錄；我原本把證據（`cucumber.cjs`、`import: [...]`）也用反引號寫在同一行，snapshot 輸出就列出「tests/steps/、cucumber.cjs、import: [...]」三個「目錄」（後兩者不存在，被忽略，未影響結果）。已把該行改為只保留 `tests/steps/` 一個反引號並以「，」隔開說明。建議 spec-manifest-sync 範本提醒：路徑欄位的同一行不要再放其他反引號。
2. spec-manifest-sync Step 3 要求「用 AskUserQuestion 一次問完必填欄位」，但本次 Binding Layer 由使用者事先給定、其餘 4 項皆有直接證據，故未提問；無矛盾。
3. spec-02 Step 5「小模組精簡確認」門檻為 Rule 少於 4 條；本模組 11 條，依規定走 spec-flow-align；無矛盾。
4. 需求方對 Q4（部分）、Q5（部分）、Q7 與 flow-align 疑似缺口 (c) 回覆「你決定」。Skill 的零腦補原則未定義「使用者明示授權執行者決定」的處理方式；本次視為使用者決策的一種（授權），把執行者的決定與理由寫入 resolved/ 決策檔與 flow-design 索引，未自行扮演需求方。
5. 工具層：本會話每次被喚醒後，Write／Edit 工具會要求重新 Read 先前已寫過的檔案（「File has not been read yet」），需補 Read 後再寫；非 Skill 問題。
