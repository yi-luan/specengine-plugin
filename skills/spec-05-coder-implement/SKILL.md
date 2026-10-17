---
name: spec-05-coder-implement
description: 當使用者輸入 /spec-05 [MODULE_ID]、/spec-run，或說「開始實作」「寫代碼」「紅轉綠」時使用。把 spec-04 產出的紅燈測試改為綠燈：先實作 Driver 介面接產品碼，再寫產品碼。以 spec-guard.js 凍結規格、Step 句型與 Driver 介面；完工後 lock。
---

# 目標

在規格、Step 句型與 Driver 介面完全鎖定的前提下，以 TDD 迴路撰寫產品代碼（路徑依 manifest 第 1 節 `Source Root Directory`），逐步消滅 spec-04 的確定性失敗，直到全部 Scenario 通過，然後 lock。

---

# 硬性約束

1. **靶不可動，箭可以射（腳本強制）**：三層凍結由 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js"` snapshot／verify 強制：`.specengine/spec/` 全字節、Step 句型字串、Driver 介面檔（`*.driver.*`）。可以動的：step 函式體、Driver 實作檔、產品代碼。
2. **紅綠迴路**：實作前先跑 manifest 的 `Test Execution Command` 確認 100% Red。以可獨立驗證的切片為單位實作（通常是一組共用同一 Service 方法的 Rule），每完成一塊就重跑。`driver` 模式用 in-process driver（`BINDING=inprocess`）。
3. **單向依賴**：產品代碼只依賴 DBML 定義的領域模型，不反向依賴測試檔或 Driver。
4. **測試紅燈時先分類，再決定誰修**：某個 Scenario 怎麼都不綠時，判斷原因屬於哪一類，三類處理方式不同：
   - **(a) 程式錯**：改產品代碼或 Driver 實作。
   - **(b) 形式化錯誤**：矩陣與決策紀錄已經唯一決定了正確答案，只是 `.feature` 抄錯（Examples 數值、Then 文字）。判準：只看矩陣能否唯一推出正確寫法。能 → 執行者**自修**：依 contract-rules 第 5.6 節寫一筆 `resolved/fixes/<MODULE_ID>_<摘要>.md`，修 `.feature`，跑 lint，**重建 snapshot**（彙報註明原因），繼續。不問使用者，不中止。
   - **(c) 規格瑕疵**：矩陣本身有矛盾或沒定義。【絕對禁止】自行補假設、改矩陣、改句型、改介面。建 MCQ 至 `features/` 或 `data/`（來源 `spec-05`），該 Scenario 維持紅燈，依「中止彙報」格式中止，不 lock。
5. **決策可回溯**：非顯而易見的實作決策在程式碼旁加 `// 決策見 .specengine/sdd/resolved/<...>.md`。

---

# 執行步驟

## Step 1: 基準紅燈與唯讀快照

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" snapshot`（同時驗 `@binds`）。
2. 執行 `Test Execution Command`，確認所有 Scenario 皆為 `Contract Not Implemented` 失敗。

## Step 2: 增量實作

按切片推進，每個切片：
1. `driver` 模式：在 in-process 實作檔中把該切片用到的方法從拋例外換成呼叫產品碼。介面檔不動。`direct` 模式：在 step 函式體呼叫產品碼。
2. 撰寫產品邏輯，隨手加回溯註解。
3. 重跑測試。紅燈依硬性約束 4 分類處理。
4. **數值邊界補 property test**（僅當 manifest 第 5 節宣告「Property-Based Testing Library」）：以 `Scenario Outline` 列舉數值邊界的 Rule，在單元測試層補一個對隨機輸入驗證不變式的 property test。未宣告則略過。

## Step 3: 重構與全套驗證

維持全綠下重構產品代碼與 Driver 實作。執行整體測試套件確認無迴歸。

## Step 4: 第二 Driver 驗收

僅當 Binding Layer 為 `driver`，且 manifest 第 2 節「UI Component Framework」或第 4 節「API Interface Standard」已填：實作 `*.ui.*` 或 `*.api.*` driver，依「Test Data Seeding Strategy」建前置資料，切環境變數重跑同一份 `.feature`。兩欄皆〔待確認〕則略過，彙報註明「僅 in-process 綠燈」。

## Step 5: 收工驗證與 lock

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" verify`。非 0 時【絕對禁止】改回快照掩蓋；列出被違反的檔案，交由使用者決定。
2. 通過後 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" lock <MODULE_ID>`。lock 檔進 git。
3. `overview.md` 本模組狀態 `STUBBED` → `IMPLEMENTED`。

---

# 完成條件

兩種結局擇一，不得同時宣稱：

**完成**
- [ ] 起始紅燈基準已建立
- [ ] 所有 Scenario 轉綠，零失敗
- [ ] 形式化錯誤（若有）已自修並留 fixes 紀錄，snapshot 重建原因已註明
- [ ] 第二 Driver 已驗收，或已註明未做
- [ ] 產品代碼未反向依賴測試或 Driver
- [ ] verify PASS，lock 已產出，狀態 `IMPLEMENTED`

**中止（規格瑕疵）**
- [ ] 瑕疵已建 MCQ，該 Scenario 維持紅燈
- [ ] 未改矩陣、句型、介面；verify PASS 證明規格未被動
- [ ] 未 lock，狀態維持 `STUBBED`
- [ ] 已依中止彙報格式回報

# 完成彙報

```text
[Phase 05: Coder Implement] 執行完成！模組：<MODULE_ID>
測試（in-process）：Scenario X ｜ PASS X ｜ FAIL 0 ｜ 測試（<ui|api>）：PASS X ｜ 未執行（原因）
形式化錯誤自修：N 件（見 resolved/fixes/）｜ snapshot 重建：M 次
產品代碼：<檔案清單> ｜ Driver 實作：<檔案清單>
verify → PASS ｜ lock → .specengine/sdd/locks/<MODULE_ID>.lock.json
階段：IMPLEMENTED
```

中止時：

```text
[Phase 05: Coder Implement] 因規格瑕疵中止，模組：<MODULE_ID>
測試：PASS X ｜ FAIL Y（紅燈 Scenario：<名稱與行號>）
瑕疵：<一句話> → 已建 MCQ <路徑>
verify → PASS（規格未被動）｜ 未 lock ｜ 階段：STUBBED（佇列有題，視同 CLARIFYING）
```
