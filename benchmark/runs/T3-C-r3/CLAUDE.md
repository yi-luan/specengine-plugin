<!-- SPECENGINE:BEGIN v2.0.0 -->
# SpecEngine 指令路由與專案約束

本區塊由 `specengine` plugin（版本 2.0.0）透過 `spec-manifest-sync` 落地與同步，內容以 plugin 版本為準，不建議手動修改；專案特例請寫在本區塊【之外】。各階段的詳細執行步驟與硬性約束在各 Skill 內部，所有輔助檔案格式在 plugin 的 `docs/contract-rules.md` 第 5 節，本區塊只記錄跨 Skill 共用的路由、狀態與不變性。

---

## 1. 核心不變性

1. **環境事實單一來源**：所有 Skill 的技術棧、目錄、指令、命名慣例皆以 `.claude/spec/architecture-manifest.md` 為準。manifest 與現況脫鉤時執行 `spec manifest sync`。
2. **零腦補，但形式化錯誤可自修**：需求與決策未涵蓋的邏輯不得自行假設，一律推入 `.specengine/sdd/` 佇列以選擇題向使用者確認，選擇題必須由使用者親自回答。唯一例外：矩陣已經唯一決定答案、只是 `.feature` 抄錯時，執行者可自修並在 `resolved/fixes/` 留紀錄。離開 `spec 02` 時沒答的題一律掛起為 PARKED。
3. **規格單一真實來源**：`.specengine/spec/` 為唯一權威規格。行為以 `matrix/<MODULE_ID>.json` 為唯一來源；「系統刻意不做」「不提供功能」「屬其他模組」的決定記在 `.specengine/spec/exclusions.md`，不進矩陣、不畫分支、不寫測試。
4. **狀態是算出來的，不是存的**：模組階段由 `spec-status.js` 從產物推導（第 4 節）。`overview.md` 的狀態欄只是快取。
5. **硬性約束以腳本強制**：`feature-lint.js` 驗純淨度、`@rule:` tag、矩陣結構、矩陣與 feature 一一對應；`spec-guard.js` 在 `spec 05` 期間凍結規格、Step 句型、Driver 介面並驗 `@binds`；完工後 `lock` 進 git，`spec 06` 以 `audit` 抓事後偷改。有腳本可驗的規則以腳本為準。
6. **Step 薄、Driver 厚**：manifest「Binding Layer」為 `driver` 時，Step 只翻譯句子並呼叫 Driver 介面，技術細節在 Driver 實作裡，環境變數切換 in-process 或 UI 執行。
7. **模組命名空間隔離**：`MODULE_ID` 為全大寫 SNAKE_CASE，`matrix/`、`overview/`、`flow-design/`、`locks/` 依模組拆檔。未指定模組且有多個待處理時必須請使用者指定。
8. **語言**：SpecEngine 產物一律繁體中文；Gherkin 與 DBML 結構關鍵字英文；測試程式碼識別字與檔名依 manifest「Test Identifier Language」（預設 `en`）。
9. **客觀狀態輸出**：各 Skill 完成時只輸出檔案異動與統計，「下一步」只轉述 `spec-status.js` 的結果。

---

## 2. 路由

使用者描述新的業務邏輯或功能要求、對既有模組的未決問題給出決策、要求把已確定邏輯寫成規格／測試／程式碼、問「現在到哪了」、或懷疑規格與現實脫鉤時，先依下表呼叫對應 Skill。使用者明確表示不走 SpecEngine、或請求與業務規格無關時略過。正處於某個 Skill 的互動回合中時由該 Skill 接手。

| 指令 alias | Skill | 任務 |
| :--- | :--- | :--- |
| `spec status [MODULE_ID]` | `spec-status` | 推導各模組階段、待答題數、下一步。唯讀。 |
| `spec 01 [path]` | `spec-01-discovery-bootstrap` | 靜態掃描需求，產出矩陣、DBML、術語表、選擇題佇列。 |
| `spec 02 [MODULE_ID]` | `spec-02-interactive-clarify` | 分組選擇題釐清，決策寫回矩陣、exclusions 或 `.specengine/spec/`。小模組可在此完成流程確認。 |
| `spec flow-align [MODULE_ID]` | `spec-flow-align` | 矩陣畫成流程圖請使用者確認；裁示即使未通過也會保存。 |
| `spec 03 [MODULE_ID]` | `spec-03-formalize-gherkin` | 矩陣轉 Gherkin，逐列核對 Examples，lint 驗證。 |
| `spec 04 [MODULE_ID]` | `spec-04-generate-test-stub` | 依 manifest 產出紅燈 Step、Driver 介面與 fixture。 |
| `spec 05 [MODULE_ID]` | `spec-05-coder-implement` | TDD 紅轉綠；形式化錯誤自修、規格瑕疵中止；verify、lock。 |
| `spec 06` | `spec-06-drift-audit` | lock audit、Schema 漂移、Rule 覆蓋率，漂移回寫佇列。 |
| `spec manifest sync` | `spec-manifest-sync` | 建立或核實 manifest 與本區塊，一次問完必填欄位。 |
| `spec run [path] [MODULE_ID]` | `spec-run` | 以 `spec status` 判定起點，串接 01 → 02 → flow-align → 03 → 04 → 05。 |

BDD 三階段對應：Discovery = spec 01 + 02 + flow-align；Formulation = spec 03；Automation = spec 04 + 05。

---

## 3. 目錄結構

```text
├── .claude/spec/architecture-manifest.md
└── .specengine/
    ├── probes.md                           # 選填：覆寫 spec 01 的探測維度
    ├── sdd/
    │   ├── overview.md                     # 全域模組索引（狀態欄為快取）
    │   ├── matrix/<MODULE_ID>.json         # 行為矩陣
    │   ├── overview/<MODULE_ID>.md         # 模組釐清佇列總覽
    │   ├── flow-design/<MODULE_ID>.md      # 流程對齊索引（第一行為狀態：已通過／未通過）＋ <MODULE_ID>/ 各圖
    │   ├── data/  features/                # 待答選擇題
    │   ├── parked/                         # 掛起
    │   ├── resolved/                       # 已答歸檔；resolved/fixes/ 為形式化錯誤自修紀錄
    │   ├── locks/<MODULE_ID>.lock.json     # IMPLEMENTED 證據，進 git
    │   ├── steps-index.json                # 既有句型索引，進 git
    │   └── .spec-guard-snapshot.json       # spec 05 執行時態，加入 .gitignore
    └── spec/                               # 單一真實來源，spec 05 期間凍結
        ├── terms.md                        # 術語與固定文案
        ├── policy-defaults.md              # 跨模組慣例
        ├── exclusions.md                   # 刻意不做清單
        ├── erm.dbml
        └── features/*.feature
```

產品代碼、測試、Step、Driver 目錄的實際路徑見 manifest。

---

## 4. 模組階段（由 `spec-status.js` 推導）

| 階段 | 判定依據 | 下一步 |
| :--- | :--- | :--- |
| `CLARIFYING` | 佇列（`data/`、`features/`）有該模組的題 | spec 02 |
| `CLARIFIED` | 只有矩陣，佇列空 | flow-design 索引不存在或「未通過」→ spec flow-align；「已通過」→ spec 03 |
| `FORMALIZED` | `.feature` 中有 `@rule:R-<ID>-` | spec 04 |
| `STUBBED` | Step Definitions 中有 `@rule R-<ID>-` | spec 05 |
| `IMPLEMENTED` | `locks/<ID>.lock.json` 存在 | 完工；spec 06 定期巡檢 |

取最高一層存在的產物。不論階段，佇列有題就先回 spec 02。低層產物缺漏由腳本以警告回報，交人裁示。問題檔只有兩種結局：答了（`resolved/`）或掛起（`parked/`）。

---

## 5. 版本相容

每個模組的矩陣記錄建立時的 plugin 版本（`spec_engine_version`）。Skill 讀到與目前版本不一致的模組檔時，必須在彙報標示「此模組建立於版本 X，目前為 Y，請確認相容性」。

<!-- SPECENGINE:END -->
