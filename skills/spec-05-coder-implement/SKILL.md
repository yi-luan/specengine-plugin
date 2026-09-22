---
name: spec-05-coder-implement
description: 當使用者輸入 /spec-05、/spec-run,或說「開始實作」「寫代碼」「紅轉綠」時使用，把 Phase 04 產出的紅燈測試改為綠燈。會用 ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js 對 .specengine/spec/ 與 Step Definitions 目錄（`tests/steps/`）做唯讀不變性快照與收工驗證。
---

# 目標
在 `.specengine/spec/` 規格契約與 `tests/` 測試腳本完全鎖定唯讀的前提下，以 TDD 循環撰寫產品代碼（下稱 `src/`，實際對應 `architecture-manifest.md` 第 1 節宣告之 Source Root Directory，本專案為扁平結構的 `Controllers/`、`Models/`、`Views/`、`wwwroot/js/`）。逐步消滅 Phase 04 產出的確定性失敗斷言，直至全數 Scenario 於測試執行器 (Test Runner) 中通過。

---

# 核心行為規範與硬性約束 (Software Engineering Invariants)

1. **靶不可移動、箭可以射 (Frozen Target, Free Implementation, Enforced)**：
   - 「先畫靶再射箭」的靶有兩層：`.specengine/spec/` 目錄（`.feature`、`.dbml`、`terms.md`、`policy-defaults.md`）全字節不可變；Step Definitions 目錄裡每個 `Given/When/Then` 註冊的**句型字串**（靶心座標，決定哪一句 Gherkin 對應哪個函式）不可被改名、刪除或新增。
   - 函式**內部的實作**（把 Phase 04 產出的確定性失敗斷言換成真正呼叫 src/ 的邏輯與斷言）本來就是本階段該做的事，不算違規，也不受此約束限制。
   - 嚴禁透過改動句型字串本身、或改動 `.specengine/spec/` 敘述，來讓測試「看起來」通過。
   - 【不得僅憑自我承諾遵守】：本約束以 `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js` 建立快照與收工前驗證強制執行（見 Step 1 與 Step 4）——`.specengine/spec/` 比對全字節雜湊，Step Definitions 目錄只比對 Step 句型集合，任何違規會被實際偵測到並中止彙報。腳本會動態解析 `architecture-manifest.md` 第 1 節宣告的 Step Definitions Directory（`tests/steps/`），不是寫死的範本預設值；若該目錄不存在或凍結到 0 個句型，腳本會 Fail Loud 中止，不會靜默通過。
2. **TDD 嚴格紅綠燈迴路 (Red-to-Green Loop)**：
   - 實作前必須先執行測試命令（如 `npm test`），確認系統處於 100% 預期的 Red Stage。
   - 以單一 Rule 為最小單位進行最小化程式碼實作，每完成一塊邏輯即重新執行測試，觀察測試燈號變化。
3. **單向依賴原則 (Unidirectional Dependency)**：
   - 產品代碼 src/ 只允許依賴 DBML Schema 所定義的領域模型結構，嚴禁反向依賴測試檔。
4. **規格瑕疵退回機制 (Spec Defect Escalation)**：
   - 若實作過程中發現規格存在未定義之盲點或邏輯衝突，【絕對禁止】自行補齊假設，也【絕對禁止】直接修改 `.specengine/spec/` 或測試斷言來繞過問題（此路徑已被 Step 1/4 的 spec-guard 檢查阻斷）。
   - 必須將問題寫回 `.specengine/sdd/data/` 或 `.specengine/sdd/parked/`，並於 Terminal 快照中標示規格瑕疵，暫緩該 Scenario 之實作。
5. **成品優先原則 (Artifact-First Principle)**：
   - `.specengine/spec/` 與 `.specengine/sdd/resolved/` 之所以能作為團隊核心資產傳承，是因為每個決策都被外部化成人類可獨立閱讀的成品，不依賴任何一次對話記憶。本階段產出的 src/ 必須比照同一標準——程式碼本身就是要交接給團隊的成品，不是只求測試通過的過渡副產品。
   - 每個非顯而易見的實作決策（例如：為什麼冪等策略是靜默忽略而非報錯、為什麼刪除採 Hard Delete），必須在對應程式碼旁以一行註解標註回溯路徑（格式：`// 決策見 .specengine/sdd/resolved/{data|features}/<檔名>.md`），讓日後接手者不需要 AI 陪同、單靠程式碼本身就能找到「為什麼」。
   - 模組實作完成時，必須在該模組目錄下產出一份白話文 `ARCHITECTURE.md`（非程式碼、非規格語法），彙整「這個模組怎麼運作、依賴哪些既有慣例（`POLICY-N`）、有哪些已知限制」，讓新加入團隊或未參與本次對話的人，不需要重新讀完整段程式碼與 `.specengine/sdd/` 歷史，就能建立正確的心智模型。

---

# 執行步驟與檔案操作

## Step 1: 基準紅燈驗證與唯讀快照 (Baseline Red-Stage + Read-Only Snapshot)

1. 執行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js snapshot`，為 `.specengine/spec/` 與 Step Definitions 目錄建立本輪實作的唯讀基準快照。
2. 執行專案測試 Runner：`npm test`（等同 `npx playwright test`，於 repo 根目錄）。
3. 確認所有 Scenario 皆回傳確定性失敗（`Contract Not Implemented`），建立初始紅燈基準。

---

## Step 2: 增量實作與測試驅動 (Incremental Implementation)

按 Rule 順序（從 `# @rule R-XXXX-000` 核心業務切片開始）逐步推進：

1. **連接測試 Context 與產品碼**：在 Step Definitions 目錄對應的步驟中，解封存 Slot 並呼叫 src/ 中的 Service / Domain Entity 介面。
   - 若發現既有 Step Definitions 的斷言邏輯本身有誤，不得直接修改該檔案；比照規格瑕疵退回機制，停下並回報。
2. **撰寫產品邏輯 (src/)**：
   - 建立對應 DBML Schema 之 Entity / Repository / Service 模組。
   - 實作業務規則判斷（例如小數點取捨、邊界金額檢查、狀態機轉移）。
   - 依「成品優先原則」，每完成一個非顯而易見的實作決策，隨手加上回溯註解，不要留到最後才補。
3. **執行單元與 BDD 測試**：驗證該 Rule 對應之所有 Scenarios 轉為綠燈（PASS）。

---

## Step 3: 重構與完整性巡檢 (Refactoring & Full Verification)

1. **代碼重構**：在維持測試全綠燈的前提下，優化 src/ 之程式碼結構與模組抽離。`.specengine/spec/` 全字節不得觸及；Step Definitions 目錄的 Step 句型字串不得因重構而改名或合併，僅函式內部實作可以調整。
2. **全套測試執行**：執行整體測試套件，確保無迴歸錯誤 (Regression Failures)。
3. **產出/更新 `ARCHITECTURE.md`**：彙整本模組怎麼運作、依賴哪些 `POLICY-N`、已知限制，供未參與本次對話的人閱讀。

---

## Step 4: 唯讀不變性收工驗證 (Read-Only Invariant Verification)

1. 執行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js verify`。
2. 若 exit code 非 0：
   - 【絕對禁止】直接改回快照內容掩蓋差異。
   - 必須在 Terminal 明確列出被違反的檔案清單，並說明是哪個 Step 造成的異動，交由使用者決定是重新執行 snapshot（若異動確屬預期外的規格修正需求）還是撤回該次程式碼變更。
   - 本階段【不得】在違規未解決的狀態下輸出「執行完成」彙報。
3. 通過後，**狀態欄寫回（見 CLAUDE.md 第 4.2 節）**：將 `.specengine/sdd/overview.md` 中本模組對應那一列的狀態欄由 `STUBBED` 改寫為 `IMPLEMENTED`，不改動其他模組的列。
4. 完成上述步驟後才進入完成彙報。

---

# 完成條件

- [ ] Step 1 起始紅燈基準已建立（所有 Scenario 回報確定性失敗（Contract Not Implemented / NotImplementedException））
- [ ] 所有 Rule 對應之 Scenario 皆已轉為綠燈（PASS），零失敗
- [ ] src/ 只依賴 DBML Schema 定義的領域模型，未反向依賴測試檔
- [ ] 重構未觸及 `.specengine/spec/` 全字節內容，未改動 Step 句型字串
- [ ] `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js verify` exit code 為 0
- [ ] `.specengine/sdd/overview.md` 本模組狀態欄已由 `STUBBED` 改寫為 `IMPLEMENTED`
- [ ] 過程中發現的規格瑕疵已寫回 `.specengine/sdd/`，未自行假設或繞過
- [ ] src/ 內每個非顯而易見的實作決策，皆有回溯註解指向 `.specengine/sdd/resolved/` 對應決策檔
- [ ] 模組目錄下已產出白話文 `ARCHITECTURE.md`，非技術背景或未參與本次對話者也能讀懂模組運作方式

# 完成彙報 (Terminal Output)

執行完畢後，在 Terminal 印出狀態快照：

```text
[Phase 05: Coder Implement] 執行完成！

1. 測試套件執行快照：
   - 總 Scenario 數量：X 個
   - 通過 (PASS)：Y 個
   - 失敗 (FAIL)：0 個
   - 標記 TODO/PARKED 跳過數量：Z 個

2. 產品代碼異動摘要：
   - src/ (已完成對應 .specengine/spec/erm.dbml 之領域模組實作)

3. 唯讀不變性驗證：
   - node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js verify → PASS (exit code 0)

4. 模組階段狀態：IMPLEMENTED（已寫回 .specengine/sdd/overview.md）

專案目前處於 100% 綠燈可交付狀態。
```

```text
[SpecEngine] spec-05 進度：Step 4 / 4 — 已完成
```