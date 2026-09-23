<!-- SPECENGINE:BEGIN v{{PLUGIN_VERSION}} -->
# SpecEngine 專案總控與指令路由手冊

本區塊為 SpecEngine 之全域命令派發與架構約束合約，由 `specengine` plugin（版本 {{PLUGIN_VERSION}}，見已安裝之 `.claude-plugin/plugin.json`）提供。AI Agent 於本專案中執行任何任務時，必須恪守本區塊之規範。本區塊由 `spec-manifest-sync` 落地與同步，內容以 plugin 版本為準；若與現況脫鉤，重新執行 `spec-manifest-sync` 校正即可，不建議手動修改本區塊文字本身（若有專案特例需求，請寫在本區塊【之外】的 CLAUDE.md 其他段落）。

本專案採「單一容器」慣例，將 `spec/`、`.sdd/`、`scripts/` 全數收斂至 `.specengine/` 之下，避免污染 repo 根目錄命名空間。

---

# 1. 核心工程不變性 (Core Engineering Invariants)

1. **全繁體中文規範 (Traditional Chinese Standard)**：
   - 所有文件、註解、提問、領域術語、`.specengine/sdd/` 狀態檔，以及 **`.specengine/spec/features/*.feature` 之檔案名稱**（例如：`.specengine/spec/features/多檔上傳.feature`），一律採用繁體中文 (zh-TW)。
   - 僅 Gherkin 結構關鍵字（`Feature`, `Rule`, `Scenario`, `Scenario Outline`, `Given`, `When`, `Then`, `And`, `Examples`）與 DBML 語法關鍵字保持英文。
   - **Agent 與使用者之間的全程互動**——對話回覆、進度更新、終端機狀態快照、提問——一律全程使用繁體中文撰寫，不得夾雜英文行文；程式碼本身、指令、錯誤訊息原文、專有名詞（如套件名、API 名稱）等技術性內容不在此限，可保留原文。此規則不因任務種類（不論是否為 SpecEngine 流程內的任務）而有例外。
2. **狀態驅動與工具集解耦 (State-Driven & Tooling Decoupling)**：
   - `specengine` plugin 提供之 spec-01~06、spec-flow-align、spec-run、spec-manifest-sync 共 9 個 Skill 為無狀態工具，隨時讀取 `.claude/spec/architecture-manifest.md` 之環境變數。Agent 隨時可依據使用者需求或目前狀態呼叫任一工具，嚴禁硬性押解使用者遵循線性流程。
   - **強制路由前置檢查 (Mandatory Routing Pre-Check，不可只當作建議)**：在對使用者訊息給出任何實質回應（討論設計、給建議、動手寫程式、回答問題）之前，必須先判斷這則訊息是否屬於 SpecEngine 應接手的情境，命中時直接呼叫對應 Skill（見第 2 章路由表），**不必等待使用者明確輸入 `spec 0N` 或提及「SpecEngine」**——這是本條與上一條的差異：上一條講的是「Agent 有權限呼叫」，本條講的是「符合以下情境時，Agent 有義務先呼叫，不可跳過直接用自由發揮回應」。
     - **觸發情境（whenever）**：使用者描述一段新的業務邏輯或功能要求，即使完全沒提到 spec 相關字眼（例如「幫我加一個 OO 功能」）；使用者針對既有模組的未決問題給出決策或回覆；使用者要求把已確定的邏輯寫成規格／測試骨架／程式碼；使用者懷疑規格與現實（程式碼、DB Schema）不同步。
     - **略過情境（skip only when）**：使用者明確表示不走 SpecEngine 流程；請求與任何業務規格無關（環境設定、既有程式碼的技術性除錯、套件安裝等雜務）；目前正處於某個 Skill 執行過程中，等待使用者對該 Skill 自身問題的回覆（例如 spec-02 的 MCQ 作答），此時應由該 Skill 接手，不必重新路由。
     - 無法判斷屬於哪個階段、或佇列中有多個模組同時符合本條情境時，依第 1.5 條規則向使用者確認，不得自行猜測，也不得因為「不確定」就直接放棄路由、退回自由發揮回應。
3. **客觀狀態快照輸出 (Non-Prescriptive Terminal Output)**：
   - 任務執行完畢後，終端機僅輸出客觀之「檔案異動」與「數據統計快照」，絕對禁止對使用者下達命令或強迫提示下一步指令（例如：禁止出現「請執行 spec XX」）。
4. **零腦補與單一真實來源 (Zero Hallucination & Single Source of Truth)**：
   - 未界定之邏輯推入 `.specengine/sdd/` 佇列。規格更新時採「取代而非矛盾累加」原則，`.specengine/spec/` 永遠為單一真實來源——專案中不得同時存在第二棵平行維護的規格樹。
5. **模組命名空間隔離 (Multi-Module Namespacing)**：
   - `.specengine/sdd/matrix/<MODULE_ID>.json` 與 `.specengine/sdd/overview/<MODULE_ID>.md` 依模組拆檔，多位使用者可同時對不同模組執行 `spec 01`~`spec 05` 而不互相覆寫。`.specengine/sdd/overview.md` 為全域索引：新模組以附加寫入新增一列；既有模組僅允許就地更新自己那一列的「狀態」與統計欄位（見第 4.2 節），嚴禁觸碰或重寫其他模組的列。`.specengine/spec/erm.dbml`、`.specengine/spec/terms.md`、`.specengine/spec/policy-defaults.md` 為跨模組共用之單一真實來源，允許增量擴充。
   - 任一指令（`spec 02`~`spec 06`、`spec flow-align`）若未指定模組且佇列中有多個模組同時待處理，Agent 必須先請使用者指定，嚴禁自行猜測。
6. **硬性約束以程式碼強制執行 (Enforced, Not Just Prompted)**：
   - **先畫靶再射箭**：`.specengine/spec/` 目錄對 `spec 05` 全字節唯讀；Step Definitions 目錄只凍結 Step 句型字串（靶心座標），函式內部實作允許在 `spec 05` 填入。以上由 `node ${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js` 建立快照並收工前驗證強制執行，不接受僅憑自我承諾判斷合規。掃描目錄由該腳本直接解析 `architecture-manifest.md` 第 1 節「Step Definitions Directory」宣告（不硬編碼），並在目錄不存在或凍結到 0 個句型時以非 0 exit code 中止（Fail Loud，詳見 manifest 第 5 節）。
   - `.feature`／`.dbml` 之純淨度與排序規則，以 `node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js` 實際驗證。任何 Skill 敘述「絕對禁止」的規則，若有對應腳本可驗證，一律以腳本結果為準。
7. **組織慣例優先於重複發問 (Policy Before MCQ)**：
   - `spec 01` 掃描盲點前，必須先比對 `.specengine/spec/policy-defaults.md` 之既有慣例；命中者直接套用，不重複產生 MCQ。`spec 02` 釐清時，若決策屬跨模組可複用之工程立場，晉升寫入 `.specengine/spec/policy-defaults.md`。

---

# 2. 命令路由與 Skill 對照 (Command Routing)

## 2.0 與 BDD 標準三階段的對應

本專案階段是 BDD 標準三階段（Discovery → Formulation → Automation）的具體實作，只是拆得更細；`spec 06` 不在這條線性迴圈裡，是獨立於三階段之外的 Living Documentation／規格漂移治理活動：

| BDD 標準階段 | 對應階段 | 說明 |
| :--- | :--- | :--- |
| **Discovery**（探索：這個功能可能要做什麼） | `spec 01` ＋ `spec 02` ＋ `spec flow-align` | `spec 01` 是 AI 單人靜態探索找盲點，`spec 02` 是把盲點拿去跟人確認，`spec flow-align` 則是把 `spec 02` 談妥的完整行為矩陣畫成 Mermaid 流程圖，讓使用者用「看圖」而非「逐題回想」的方式做最後一次完整性確認——三者合起來才是完整 Discovery |
| **Formulation**（形式化：寫成正式規格） | `spec 03` | 把確定下來的矩陣翻譯成 Gherkin `.feature` |
| **Automation**（自動化：讓規格真的可執行、可驗證） | `spec 04` ＋ `spec 05` | `spec 04` 產出紅燈骨架，`spec 05` 驅動到綠燈，兩者合起來才是完整 Automation |
| （三階段之外） | `spec 06` | 定期巡檢規格與現實是否脫鉤，屬於治理性質，不是線性建置步驟 |
| （三階段之外） | `spec manifest sync` | 核實 `architecture-manifest.md`（以及本區塊本身）是否與實際專案現況相符，屬於環境治理性質，不是線性建置步驟 |

| 指令 alias | 對應 Skill | 核心任務 |
| :--- | :--- | :--- |
| `spec 01` | `spec-01-discovery-bootstrap` | 雙軌冷啟動：讀取 manifest 命名規範、鎖定核心業務切片、套用既有組織慣例、抽離模組化矩陣、高風險工程探測清單盲點掃描與 MCQ 落盤。 |
| `spec 02 [MODULE_ID]` | `spec-02-interactive-clarify` | 互動釐清：CLI 白話 MCQ 決策問答、FSM 5 大生命週期管理、原子化覆寫 `.specengine/spec/`、可複用慣例晉升 `policy-defaults.md`。 |
| `spec flow-align [MODULE_ID]` | `spec-flow-align` | 流程圖對齊：把模組已確定的行為矩陣畫成 Mermaid 流程圖，跟使用者確認有無遺漏分支／使用者行為／畫面狀態；有缺口則回推新 MCQ 問題並把模組狀態退回 `CLARIFYING`，確認無誤才視為通過本關卡、可進入 `spec 03`。是 `spec 02` 與 `spec 03` 之間的強制關卡，不可跳過。 |
| `spec 03 [MODULE_ID]` | `spec-03-formalize-gherkin` | 行為形式化：1:1 句型正規化、PARKED 轉 `# TODO`、產出繁體中文檔名之 `.feature`，並以 `feature-lint.js` 實際驗證。 |
| `spec 04 [MODULE_ID]` | `spec-04-generate-test-stub` | 測試契約綁定：對齊 manifest 技術棧、以 manifest 宣告之 BDD 框架產出紅燈測試骨架。 |
| `spec 05` | `spec-05-coder-implement` | 代碼實作：以 `spec-guard.js` 強制 `.specengine/spec/` 唯讀、執行 manifest 測試指令、TDD 紅綠燈迴路驅動實作至全綠燈。 |
| `spec 06` | `spec-06-drift-audit` | 規格與現實巡檢：比對 `erm.dbml` 與實際 Schema、比對 Rule 覆蓋率，找出漂移並回寫 `.specengine/sdd/` 佇列，不自動修正任一邊。 |
| `spec manifest sync` | `spec-manifest-sync` | 環境宣告核實：唯讀掃描專案實際狀態，首次執行時自動建立 `architecture-manifest.md` 初稿並落地／同步本區塊，之後核實或更新其中〔待確認〕項目與可能過時的既有宣告，查無法唯一判定者交由使用者決定，不自動修正程式碼或設定檔。 |
| `spec run [path] [MODULE_ID]` | `spec-run`（依模組階段自動判定起點，依序串接至 05） | 一次啟動全流程之串接執行別名，起點依模組目前階段自動判定，不含 `spec 06`、`spec manifest sync`（兩者皆屬週期性治理維護，非線性建置步驟）。 |

`[MODULE_ID]` 為選填參數；若整個專案僅有單一模組在跑，或佇列中同時只有一個模組待處理，可省略，Agent 會自動鎖定該模組。`[path]` 為選填之原始需求檔案路徑（例如 `inbox/requirement.md`）；若省略，視同使用者已在同一則訊息中貼上或另行提供需求文字。

## 2.1 串接執行規則 (`spec run` Chained Execution Semantics)

`spec run` 不是一個新的 Skill，而是對既有 6 個 Skill 的**執行順序**約定，讓使用者不必在每個階段結束後手動重新輸入下一個指令。**串接起點依模組目前階段自動判定，嚴禁不論現況一律從 spec-01 開始**：

0. **Step 00（非互動，起點判定）**：讀取 `.specengine/sdd/overview.md`，依模組之「階段狀態」（見第 4.2 節）決定本次串接起點：
   - 模組於全域索引中不存在對應列（尚未冷啟動過）→ 起點為 spec-01。
   - 階段狀態為 `CLARIFYING` → 起點為 spec-02。
   - 階段狀態為 `CLARIFIED`：若 `.specengine/sdd/flow-design/<MODULE_ID>.md` 已存在（已通過流程對齊）→ 起點為 spec-03；若不存在 → 起點為 spec-flow-align（尚未做過流程圖對齊確認）。
   - 階段狀態為 `FORMALIZED` → 起點為 spec-04；`STUBBED` → 起點為 spec-05。
   - 階段狀態為 `IMPLEMENTED` → 模組已完工，不執行任何階段，直接依「客觀狀態快照輸出」原則回報現況。
   - 模組列存在但缺少階段狀態欄位（舊資料相容性缺口）：比照第 5 節版本相容性規則，於彙報中提示落差，並保守地以 spec-01 為起點（因無法確認實際進度）。
   - 使用者已明確要求「從頭跑」「重新冷啟動」時，以使用者指示為準，忽略既有階段狀態，起點固定為 spec-01。
1. **Step 01（非互動）**：僅當 Step 00 判定起點為 spec-01 時執行，執行 `spec-01-discovery-bootstrap` 全部步驟，不暫停。
2. **Step 02（強制暫停，不可跳過）**：起點為 spec-02，或前一階段（spec-01）已完成時執行；進入 `spec-02-interactive-clarify`，依其 Step 2/3 規則逐題印出 MCQ 並【真實等待使用者輸入】。
   - 【嚴禁】為了讓流程跑完而自動代答任何一題——這正是本系統存在的核心原則（零腦補），`spec run` 不能凌駕於它之上。
   - 只有在使用者實際答完全部 High/Medium 問題，或輸入 `stop`/`done`/`exit`/`proceed` 觸發 Phase 02 自身的優雅終止時，才視為本步驟完成。
2b. **Step 02b（強制暫停，不可跳過）**：起點為 spec-flow-align，或前一階段（spec-02）剛完成、且 `.specengine/sdd/flow-design/<MODULE_ID>.md` 尚不存在時執行；進入 `spec-flow-align`，印出流程圖與白話複述並【真實等待使用者輸入】。
   - 【嚴禁】自行判斷「這張圖應該沒問題」就代替使用者確認並逕行放行——即使是被 `spec-run` 委派呼叫，也一樣要真的停下來等使用者這一輪的實際回覆。
   - 使用者確認無缺口 → 視為本步驟完成，繼續 Step 03~05。
   - 使用者指出缺口 → `spec-flow-align` 會將缺口包裝為新 MCQ、把模組狀態退回 `CLARIFYING`；此時**中止串接**，回報新增的缺口問題清單，提示使用者需重新執行 `spec 02` 釐清後再重新 `spec run`，不自動迴圈跳回 Step 02。
3. **Step 03~05（恢復非互動，自動接續）**：起點為 spec-03／04／05，或前一階段已完成時執行；依序自動執行 `spec-03-formalize-gherkin`、`spec-04-generate-test-stub`、`spec-05-coder-implement`，中間不需使用者再輸入 `spec 03`/`04`/`05`。
4. **中途中止**：使用者於任一階段輸入 `stop`（Phase 02 的既有終止語意之外，其他階段亦適用）時，立即停止串接，並依「客觀狀態快照輸出」原則回報目前進度，不強行繼續。
5. `spec run` 執行到一半發生規格瑕疵退回（如 Phase 05 Step 4 唯讀驗證失敗）時，中止串接，回報違規細節，不自動跳過或吞掉錯誤繼續下一階段。

---

# 3. 專案目錄與 FSM 狀態結構

`specengine` plugin 提供工具控制平面（skills/scripts/docs/templates，隨 plugin 版本分發與升級，不收在本 repo 內、不需要 commit）；`.specengine/` 為本專案執行時態產出（隨每次 `spec 01~06` 執行增量寫入），本專案採「單一容器」慣例，將 `spec/`、`.sdd/`、`scripts/` 全數收斂於此，避免污染 repo 根目錄命名空間。

```text
（本 repo 根目錄）
├── .claude/
│   └── spec/
│       └── architecture-manifest.md   # 本專案自行維護的環境宣告（Single Environment Source），由 spec-manifest-sync 建立與同步
├── .claude-plugin/                    # 若本 repo 同時作為 specengine 的私有 marketplace 來源，才會有此目錄；一般消費端專案不會有
├── .specengine/                       # SpecEngine 單一容器（執行時態 + 規格），完全由 spec-01~06 增量寫入，結構固定不隨專案而異
│   ├── sdd/                           # 運行中 FSM 狀態機 (依模組拆分)
│   │   ├── overview.md                # 全域模組索引 (附加寫入，不覆寫既有列)
│   │   ├── matrix/                    # 各模組行為矩陣：<MODULE_ID>.json
│   │   ├── overview/                  # 各模組佇列總覽：<MODULE_ID>.md（spec-02 產出）
│   │   ├── flow-design/               # 流程對齊索引：<MODULE_ID>.md；各流程階段視覺化 artifact（見 spec-flow-align）
│   │   ├── data/ features/            # [UNRESOLVED] 待釐清問題
│   │   ├── parked/                    # [PARKED] 掛起待會議討論
│   │   └── resolved/                  # [RESOLVED] 已決策歸檔區 (Audit Log)
│   └── spec/                          # 單一真實來源 (Single Source of Truth，跨模組共用)
│       ├── terms.md                   # 繁體中文領域術語字典
│       ├── policy-defaults.md         # 組織級慣例字典 (跨模組可複用決策)
│       ├── erm.dbml                   # 資料庫實體關聯模型 (DBML)
│       └── features/                  # BDD 形式化特性檔案 (如: 多檔上傳.feature)
└── （產品程式碼與測試目錄）             # 實際路徑、命名慣例請見 .claude/spec/architecture-manifest.md 第 1、5 節，此處不重複列出以避免兩處維護同一件事又不同步
```

{{EXISTING_TOOLS_NOTE}}

> `.gitkeep` 檔案僅用於在初始狀態下保留空目錄結構，各 Skill 開始寫入實際檔案後可自行刪除。

---

# 4. FSM 狀態機規則

本章包含兩種維度不同、不可混用的狀態機：4.1 描述「單一問題」從提出到歸檔的生命週期；4.2 描述「整個模組」在 spec-01~05 線性建置流程中目前所處的階段，供 `spec run` 判定串接起點（見第 2.1 節）使用。

## 4.1 問題生命週期 (Question Lifecycle FSM)

- UNRESOLVED: 待釐清問題，存放於 `.specengine/sdd/data/` 或 `.specengine/sdd/features/`。
- BLOCKED: 前置依賴未解，暫緩提問，記錄於 `.specengine/sdd/overview.md`。
- PARKED: 挂起待會議討論，移動至 `.specengine/sdd/parked/`。於 Phase 03 自動轉譯為 `# TODO: PARKED - [R-XXXX] <問題>` 註解，不阻斷 Feature 產出。
- RESOLVED: 已決策完畢，移動至 `.specengine/sdd/resolved/` 並寫入 Audit Log，同步覆寫 `.specengine/spec/`。
- DEPRECATED: 需求變更廢棄，移動至 `.specengine/sdd/resolved/deprecated/`。

## 4.2 模組階段狀態機 (Module Phase State Machine)

記錄於 `.specengine/sdd/overview.md` 全域索引表格之**「狀態」欄**（即該表既有的第 2 欄，不另立新欄位），只能取以下 5 值之一，由完成對應階段之 Skill 於自身完成彙報步驟就地更新，且僅能更新自己模組那一列（見第 1.5 條）：

- CLARIFYING: spec-01 已完成，佇列仍有 High/Medium 未決問題待釐清。由 spec-01 寫入（佇列非空時）。
- CLARIFIED: 所有 High/Medium 問題皆已 Resolved 或 Deferred，尚未產出 `.feature`。由 spec-01（當輪佇列剛好淨空時）或 spec-02（含使用者以 `stop`/`done`/`exit`/`proceed` 終止、剩餘題目標記 `Deferred` 的路徑）寫入。
- FORMALIZED: `.feature` 已產出並通過 `feature-lint.js`，尚未產出測試骨架。由 spec-03 寫入。
- STUBBED: 測試骨架已產出（Red Stage），尚未完成實作。由 spec-04 寫入。
- IMPLEMENTED: spec-05 已完成，全數 Scenario 綠燈且 `spec-guard.js verify` 通過。由 spec-05 寫入。

**舊值相容 (Legacy Value)**：`DISCOVERY` 為舊範本版本使用的值，語意等同 `CLARIFYING`（已冷啟動、尚未完成互動釐清）。讀到 `DISCOVERY` 時一律比照 `CLARIFYING` 處理，不需為此先改寫既有列；該模組下次被任一 `spec 0N` 更新狀態時才順帶正規化為新值。

**佇列非空優先 (Queue Overrides Status)**：狀態欄只是快取，`.specengine/sdd/` 佇列才是實況。若某模組狀態為 `CLARIFIED` 或更後面的階段（含 `IMPLEMENTED`），但 `.specengine/sdd/data/`、`.specengine/sdd/features/` 中仍存在屬於該模組的未決問題檔（例如 `spec 06` 巡檢後新建的漂移問題），一律以佇列為準，視同 `CLARIFYING` 處理並在彙報中說明此覆寫；不得因為狀態欄寫著 `IMPLEMENTED` 就回報「已完工」而把待決問題吞掉。

**產物存在性交叉驗證 (Artifact Cross-Check)**：狀態欄是人與 Agent 都能手改的純文字，不足以單獨作為「這個階段真的做完了」的證據。任何依本狀態機做判斷的 Skill（首要是 `spec run` 的起點判定），必須交叉驗證該狀態所宣稱的產物是否真的存在：

| 狀態 | 應存在之產物 |
| :--- | :--- |
| `CLARIFYING`／`CLARIFIED` | `.specengine/sdd/matrix/<MODULE_ID>.json`、`.specengine/sdd/overview/<MODULE_ID>.md` |
| `FORMALIZED` | 上列全部，加上 `.specengine/spec/features/` 中屬於該模組的 `.feature` |
| `STUBBED` | 上列全部，加上 manifest `Step Definitions Directory` 中對應的 Step Definitions 檔 |
| `IMPLEMENTED` | 上列全部 |

若狀態欄所宣稱的產物有任一項不存在，代表狀態欄與現實不符。此時【嚴禁】盲信狀態欄往下跑，也【嚴禁】逕自補建缺失產物或改掉狀態欄（違反第 1.4 條零腦補原則）；必須停下來列出「狀態欄宣稱值 vs 實際缺少的產物清單」，並先判別成因再交由使用者裁示：

- **跨分支差異（常見，通常不需處理）**：`overview.md` 已被合併進當前分支，但產物檔所在的 commit 還在別的 feature branch 上。判別方式：以 `git log --all --oneline --name-only --diff-filter=A -- '*<MODULE_ID>*'` 找出產物的產生 commit，再用 `git branch -a --contains <commit>` 確認它在哪些分支。若屬此類，回報「這是分支差異，待該分支併回即回歸」即可，不要動任何檔案。
- **真實落差**：git 歷史中從未存在該產物，或曾存在而被刪除。此時才需要使用者決定是重跑對應階段、修正狀態欄，還是把落差推入 `.specengine/sdd/` 佇列追蹤。

**流程對齊產物另計，不併入上表 (Flow-Align Artifact Is Checked Separately)**：`.specengine/sdd/flow-design/<MODULE_ID>.md`（`spec-flow-align` 的產出，見第 2.1 節 Step 00／Step 02b）不是上表所列「證明某狀態值真的做完」的證據，而是 `CLARIFIED` 狀態底下的一道獨立子關卡標記——同樣是 `CLARIFIED`，`spec run` 仍須另外檢查這個檔案是否存在，才能判斷起點該是 spec-flow-align 還是 spec-03。因此不修改上表 `CLARIFYING`／`CLARIFIED` 那一列既有的產物清單，僅由 `spec-run` Step 00 的路由邏輯單獨處理；此索引檔缺漏屬正常的「尚未過關」情況，不算本節「狀態欄與現實不符」的異常，不需走上述跨分支差異／真實落差的裁決流程。

模組於 `.specengine/sdd/overview.md` 中尚無對應列時，視為尚未冷啟動過，不適用本狀態機，`spec run` 一律以 spec-01 為起點。

---

# 5. Plugin 版本相容性 (Plugin Version Compatibility)

`specengine` plugin 的 `.claude-plugin/plugin.json` 之 `version` 欄位為本工具集的版本號。每個模組的 `.specengine/sdd/matrix/<MODULE_ID>.json` 在 Phase 01 建立時，會把當時的 plugin 版本寫入 `spec_engine_version` 欄位並記錄於 `.specengine/sdd/overview.md` 全域索引。若之後升級 `specengine` plugin（`/plugin marketplace update` 後版本號變動），既有模組檔的 `spec_engine_version` 會與新版本不同。任何 Skill 讀到版本不一致的模組檔時，必須在 Terminal 摘要中明確標示「此模組建立於 plugin 版本 X，目前 plugin 版本為 Y，格式或規則可能已變動，請確認相容性後再繼續」，而不是靜默假設格式相同繼續執行。

<!-- SPECENGINE:END -->
