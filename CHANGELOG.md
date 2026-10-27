# Changelog

## 2.1.0

新增「已完工模組的需求變更」流程。既有專案執行 `spec-manifest-sync` 會回報 CLAUDE.md 區塊版本落差，同步後路由表多出 `spec change`。舊 lock 沒有矩陣與共用規格雜湊，下一次重新 lock 後才會受保護。

### 新增：spec change

- 新增 `spec-change` Skill 與 `scripts/spec-change.js`（start／classify／apply／amend／close／status）。已上鎖模組的變更由腳本比對新舊矩陣，分成 PARAMETER（只改數字）、BEHAVIOR（改既有行為）、NEW_RULE（新增規則），只走該級需要的站。
- 改規格一律經使用者核准：`apply` 檢查 change.md 已寫入核准原文才把 proposed 寫回矩陣；核准後要再改矩陣須走 `amend`，分類不得升級。
- 受影響範圍 = 矩陣有差異的 Rule ＋ `classify --also` 宣告的連帶受影響 Rule（矩陣文字沒變但 Examples 會變者）；`--also` 的每條 Rule 必須出現在核准原文。舊版 type 值遷移到 main_flow／edge_case 視為格式遷移，不計入範圍。
- `close` 檢查：已重新 lock、現行矩陣等於最後核准版本、範圍外 Rule 的 .feature 區塊逐字未動；結果自動寫入 change.md。
- 變更紀錄目錄 `.specengine/sdd/changes/<ID>/` 格式見 contract-rules 5.8。

### 改動

- `spec-guard.js lock` 記錄行為矩陣雜湊，並另寫 `locks/_shared.json` 記錄共用規格（terms、erm、policy、exclusions）雜湊；`audit` 一併比對。修掉「改了矩陣或 terms.md，audit 仍通過」。
- `spec-guard.js`、`spec-change.js`、`spec-status.js` 雜湊前把 CRLF 統一為 LF，修掉 Windows git autocrlf 重新 checkout 後 audit 誤報 LOCK_DRIFT。
- `spec-status.js` 新增 CHANGING 階段（下一步 `spec change`）；矩陣在 lock 後被改動且沒有變更紀錄時警告。
- spec-run Step 00、CLAUDE.md 範本路由表、階段表與目錄結構接上 `spec change`。

### 實測（2026-10-22）

在 T1 點數折抵、T2 訂單狀態機、T3 多租戶優惠券與一個 driver 模式的舊格式專案上，跑參數變更、行為變更、新增規則、模糊需求、偽裝成小調整的行為變更、中斷後新 session 續跑共 13 組，隱藏驗收全部通過。同條件下 2.0.0 對照組會在變更單寫「其他規則不變」時不經使用者核准直接改規格。

## 2.0.0

通用化、精簡，並明確化 Step 到產品代碼的綁定。CLAUDE.md 區塊格式與 `.feature` 的 Rule 標記形式皆有變，既有專案執行 `spec-manifest-sync` 會回報版本落差，既有 `.feature` 需把 `# @rule` 註解改為 `@rule:` tag 才能通過 lint。

### 實跑修正（2026-10-18，依一次完整的真實模組執行結果）

在一個 cucumber-js 專案上以 4 句話需求跑完 manifest-sync → spec-01 → 02 → flow-align（含缺口退回）→ 03 → 04 → 05 → lock → audit，21 Scenario 全綠。依執行者回報的 50 餘條觀察修正如下。

- **形式化錯誤自修**：spec-05 把紅燈分三類。程式錯改程式；矩陣對但 `.feature` 抄錯 → 自修、留 `resolved/fixes/` 紀錄、重建 snapshot、不問使用者、不中止；矩陣有矛盾 → 建 MCQ 中止。這次實跑的那一題屬第二類，先前被當成業務決策多走了一輪。spec-run 硬性約束 3 同步放寬。
- **刻意不做清單** `.specengine/spec/exclusions.md`：「系統無動作」「不提供功能」「範圍外」三類決定不再進矩陣，矩陣 `type` 只允許 `main_flow`／`edge_case`（lint 強制）。flow-align 的已知取捨區直接讀它。
- **flow-align 裁示落盤**：索引檔第一行改為狀態行（已通過／未通過），缺口分支也寫索引，保存「使用者已裁示非缺口」與「已確認無不一致的圖」，下次重畫沿用。`spec-status.js` 改以狀態行判定 `flowAligned`。輸出格式加「執行者疑似缺口」區。
- **spec-03 新增 Step 3b Examples 逐列核對**，contract-rules 第 3.5 條明文要求 Examples 可由矩陣推導。
- **contract-rules 新增第 5 節輔助檔案格式**：overview.md 欄位、terms.md（含固定文案）、policy-defaults.md、exclusions.md、flow-design 索引、fixes 紀錄、時間戳規則。先前這些檔案沒有格式定義，執行者各自發明。
- spec-01：必讀 contract-rules；初始化 `terms.md`；DBML 命名待確認時固定 fallback `snake_case`；需求明寫的「不做」直接進 exclusions。
- spec-02：分組優先序明文化；決策依性質分四類寫回；`resolved_by` 允許陣列；單題時的標題格式；中途不改狀態欄。
- spec-04：`@rule` 多值格式與 `R-<ID>-*`；無 interface 語言的介面檔寫法與 JS 範例；fixture 必須確認框架會載入；第二實作的 manifest 欄位指名；dry-run 去重提醒；檔名語言隨識別字語言。
- manifest-sync：必填詢問移到掃描之後；證據分三級（直接、唯一候選、本機實測）；Driver Directory 條件必填在同組處理。
- MCQ 格式新增「來源」欄。lock 另存本機時間。

### 新增：推導式狀態與精準性腳本

- `scripts/spec-status.js`（新）：從產物存在性推導模組階段（lock → IMPLEMENTED、Step → STUBBED、feature → FORMALIZED、佇列有題 → CLARIFYING、只有矩陣 → CLARIFIED），回報待答題數、流程對齊、低層產物缺漏、狀態欄快取過期。`spec-run` Step 00 與 spec-02／flow-align 的模組解析改用它。新增 `spec-status` Skill（`spec status`）。CLAUDE.md 範本第 4 節「佇列優先」「產物交叉驗證」「分支差異判別」三段 prose 改為一張推導表。
- `feature-lint.js` 新增：矩陣 JSON 結構驗證（欄位齊全、`rule_id` 格式、重複）；已形式化模組的矩陣 Rule 與 feature `@rule:` tag 必須一一對應；通過時產出 `.specengine/sdd/steps-index.json` 既有句型索引，spec-03 改讀索引而非逐檔讀 features。
- `spec-guard.js` 新增：`snapshot` 時驗證每個 `@binds X.y` 在 Driver 介面檔中找得到方法 `y`；`lock <MODULE_ID>` 把模組專屬產物的雜湊與句型寫入 `.specengine/sdd/locks/`（進 git，IMPLEMENTED 證據）；`audit` 比對所有 lock 與現況，抓完工後的規格／句型／介面偷改（`LOCK_DRIFT`），spec-06 Step 0 執行。
- `spec-05` 收工時執行 `lock`；有宣告 manifest「Property-Based Testing Library」時，為 Scenario Outline 的 Rule 補 property test。

### 新增：易用性

- `spec-02` 改為分組提問：依「定位」分組，每組最多 4 題，優先使用 AskUserQuestion 工具，無則退回文字格式一次列一組。來回次數約減半。
- 刪除「Deferred」概念。離開 spec-02 時未答的題（含 Low）一律移至 `parked/`，spec-03 轉為 feature 裡可見的 TODO。問題檔只有「答了」與「掛起」兩種結局，佇列不留懸案。這修掉了 Deferred 檔留在佇列導致模組永遠 CLARIFYING 的矛盾。
- 小模組（Rule 少於 4 條且無分支）在 spec-02 完成彙報時直接做白話複述確認並寫入 flow-design 索引，不另跑 `spec flow-align`。
- manifest 欄位分級：Source Root、Step Definitions Directory、BDD Framework、Test Command、Binding Layer 標為【必填】，`spec-manifest-sync` 掃描後用 AskUserQuestion 一次問完仍缺的必填欄位。其餘選填，未填時各 Skill 依預設行為處理。
- manifest 第 3 節新增「Test Identifier Language」（`en`／`zh-TW`），spec-04 依此決定識別字語言，預設 `en`。
- spec-01 探測清單可由專案 `.specengine/probes.md` 覆寫；spec-01 允許問唯一一題「這屬於哪個模組」。
- 各 Skill 完成彙報縮短為 3 到 6 行。

### 新增：Driver 綁定層

- manifest 第 5 節新增 `Binding Layer`（`driver`／`direct`）、`Driver Directory`、`Test Data Seeding Strategy`、`Test Report Path` 四個欄位。
- `spec-04` 改為先用框架 dry-run 列出未定義步驟，再產出 step 檔、Driver 介面檔（`*.driver.*`）、in-process 與 UI／API 實作檔、fixture 接線。每個 step 加 `@binds` 註解指向 Driver 方法。step 函式體只做型別轉換、呼叫 Driver、斷言。
- `spec-05` 改為「實作 Driver 介面接產品碼」，紅綠迴路用 in-process driver，之後切環境變數用 UI／API driver 做驗收。
- `spec-guard.js` 新增第三層凍結：Driver 介面檔全字節不可變，實作檔不受限。Binding Layer 為 `direct` 或未宣告 Driver Directory 時自動略過。
- `@rule` 由註解改為 tag `@rule:R-XXXX`，掛在 `Rule:` 正上方。測試報告因此帶有 Rule ID，`spec-06` 覆蓋率改從報告統計，新增 `NOT_EXECUTED` 落差類型。`feature-lint.js` 強制每個 Rule 有 tag、tag 後緊接 `Rule:`，舊註解形式視為違規。
- contract-rules 第 3.3 條明確化：參數一律雙引號，Step 一律 `{string}` 接收，不用 `{int}`（與雙引號互斥）。

### 修正

- 移除所有源自原專案的硬編碼假設（PascalCase、playwright-bdd 單軌、`Controllers/`／`Models/`、EF Core、`npm test`、`tests/steps/`）。所有技術棧、目錄、指令一律改為「依 manifest 第 N 節宣告」。
- `spec-02` 新增「寫回行為矩陣」步驟。先前釐清決策只寫入 `erm.dbml` note，從未進入矩陣，導致 `spec-flow-align` 與 `spec-03` 看不到決策結果。
- `spec-flow-align` 引用的 MCQ 格式檔路徑由 `.claude/skills/...` 改為 `${CLAUDE_PLUGIN_ROOT}/skills/...`。
- `spec-guard.js` 在 manifest 的 Step Definitions Directory 仍為〔待確認〕時明確報錯，不再把範本說明文字中的反引號誤判為目錄。
- `feature-lint.js` 允許 Gherkin 合法的 `@tag` 行置於 `Feature:` 之前。
- `spec-run` 修正自相矛盾的文案（起點判定、flow-align 位置、階段數）。
- 所有 `${CLAUDE_PLUGIN_ROOT}` 指令加上雙引號，避免 Windows 路徑在 bash 中被跳脫。
- `spec-03` 明確要求 `.feature` 檔名為繁體中文模組名稱，並檢查流程對齊索引是否存在。

### 移除

- 問題生命週期的 `BLOCKED`、`DEPRECATED` 狀態與 `resolved/deprecated/` 目錄（沒有任何 Skill 會寫入）。
- `policy-defaults.md` 的「套用次數」計數器。
- 每個 Skill 第二段「進度：Step N / N」輸出。
- `spec-flow-align` 的 ASCII 版流程圖、雙格式一致性約束、涵蓋範圍聲明、對齊確認清單。保留 Mermaid、白話複述、已知取捨。
- `spec-04` Step 內部的三行 `[PRE-CONDITION] / DBML Binding / Expected Type` 註解區塊。保留 `@rule` 與 `@schema`。
- `spec-05` 的每模組 `ARCHITECTURE.md` 要求。保留決策回溯註解。
- CLAUDE.md 區塊中與 SKILL.md 重複的內容（spec-run 起點判定細節、BDD 對應表、FSM 長篇說明），由 174 行縮為約 80 行。
- CLAUDE.md 區塊中「Agent 全程互動一律繁中」與「強制路由前置檢查」的強制語氣。語言規則改為只約束 SpecEngine 產物；路由改為情境描述。

## 1.2.0

- `spec-manifest-sync` 新增 CLAUDE.md SpecEngine 區塊自動落地與同步。

## 1.1.0

- `spec-manifest-sync` 新增首次建立模式，自動掃描專案補全 `architecture-manifest.md`。

## 1.0.0

- 初始化 SpecEngine Claude Code Plugin。
