<!-- SPECENGINE:BEGIN v2.0.0 -->
# SpecEngine 指令路由與專案約束

本區塊由 `specengine` plugin（版本 2.0.0）透過 `spec-manifest-sync` 落地與同步，內容以 plugin 版本為準，不建議手動修改；專案特例請寫在本區塊【之外】。各階段的詳細執行步驟與硬性約束在各 Skill 內部，本區塊只記錄跨 Skill 共用的路由、狀態與不變性。

---

## 1. 核心不變性

1. **環境事實單一來源**：所有 Skill 的技術棧、目錄、指令、命名慣例皆以 `.claude/spec/architecture-manifest.md` 為準，Skill 內不寫死任何專案特定值。manifest 與現況脫鉤時執行 `spec manifest sync`。
2. **零腦補**：需求與決策未涵蓋的邏輯不得自行假設，一律推入 `.specengine/sdd/` 佇列以選擇題向使用者確認。選擇題必須由使用者親自回答，任何 Skill（含 `spec run`）不得代答。離開 `spec 02` 時沒答的題一律掛起為 PARKED，會變成 `.feature` 裡可見的 TODO。
3. **規格單一真實來源**：`.specengine/spec/` 為唯一權威規格，更新採「取代而非矛盾累加」。行為以 `.specengine/sdd/matrix/<MODULE_ID>.json` 為唯一來源，流程圖與 `.feature` 皆由矩陣推導。
4. **狀態是算出來的，不是存的**：模組階段由 `spec-status.js` 從產物存在性推導（見第 4 節）。`overview.md` 的狀態欄只是給人看的快取，與推導不符時以推導為準。
5. **硬性約束以腳本強制**：`feature-lint.js` 驗 `.feature`／`.dbml` 純淨度、`@rule:` tag、矩陣結構、矩陣與 feature 一一對應；`spec-guard.js` 在 `spec 05` 期間凍結 `.specengine/spec/`、Step 句型、Driver 介面，並驗 `@binds` 指向真實方法；完工後 `lock` 進 git，`spec 06` 以 `audit` 抓事後偷改。凡有腳本可驗證的規則，以腳本結果為準。
6. **Step 薄、Driver 厚**：manifest「Binding Layer」為 `driver` 時，Step Definitions 只翻譯句子並呼叫 Driver 介面，技術細節在 Driver 實作裡，同一份 `.feature` 以環境變數切換 in-process 或 UI 執行。
7. **模組命名空間隔離**：`MODULE_ID` 為全大寫 SNAKE_CASE，`matrix/`、`overview/`、`flow-design/`、`locks/` 依模組拆檔。未指定模組且有多個模組待處理時，必須請使用者指定。
8. **語言**：SpecEngine 產物（`.specengine/` 下所有檔案、選擇題、`.feature` 檔名與步驟文字）一律繁體中文；Gherkin 與 DBML 結構關鍵字保持英文。測試程式碼的識別字語言依 manifest 第 3 節「Test Identifier Language」。
9. **客觀狀態輸出**：各 Skill 完成時只輸出檔案異動與統計快照，「下一步」只轉述 `spec-status.js` 算出的結果，不另行催促。

---

## 2. 路由

使用者描述新的業務邏輯或功能要求、對既有模組的未決問題給出決策、要求把已確定邏輯寫成規格／測試／程式碼、問「現在到哪了」、或懷疑規格與現實脫鉤時，先依下表呼叫對應 Skill，再回應。使用者明確表示不走 SpecEngine、或請求與業務規格無關（環境設定、技術除錯、套件安裝）時略過。正處於某個 Skill 的互動回合中（例如 spec-02 的作答）時，由該 Skill 接手，不重新路由。

| 指令 alias | Skill | 任務 |
| :--- | :--- | :--- |
| `spec status [MODULE_ID]` | `spec-status` | 推導各模組階段、待答題數、下一步。唯讀。 |
| `spec 01 [path]` | `spec-01-discovery-bootstrap` | 靜態掃描需求，產出行為矩陣、DBML 草稿與選擇題佇列。 |
| `spec 02 [MODULE_ID]` | `spec-02-interactive-clarify` | 分組選擇題釐清，決策寫回矩陣與 `.specengine/spec/`。小模組可在此直接完成流程確認。 |
| `spec flow-align [MODULE_ID]` | `spec-flow-align` | 把矩陣畫成流程圖請使用者確認完整性。spec 02 與 spec 03 之間的關卡。 |
| `spec 03 [MODULE_ID]` | `spec-03-formalize-gherkin` | 矩陣轉 Gherkin `.feature`，lint 驗證。 |
| `spec 04 [MODULE_ID]` | `spec-04-generate-test-stub` | 依 manifest 產出紅燈 Step Definitions、Driver 介面與 fixture。 |
| `spec 05 [MODULE_ID]` | `spec-05-coder-implement` | TDD 紅轉綠，spec-guard 凍結、verify、lock。 |
| `spec 06` | `spec-06-drift-audit` | lock audit、`erm.dbml` 與實際 Schema、Rule 覆蓋率，漂移回寫佇列，不自動修正。 |
| `spec manifest sync` | `spec-manifest-sync` | 建立或核實 `architecture-manifest.md` 與本區塊。 |
| `spec run [path] [MODULE_ID]` | `spec-run` | 以 `spec status` 判定起點，串接 01 → 02 → flow-align → 03 → 04 → 05。 |

`[MODULE_ID]` 可省略，僅一個模組待處理時自動鎖定。`[path]` 為原始需求檔案路徑，省略時視同需求文字已在訊息中。

BDD 三階段對應：Discovery = spec 01 + 02 + flow-align；Formulation = spec 03；Automation = spec 04 + 05。spec 06、spec manifest sync、spec status 不在 `spec run` 串接範圍。

---

## 3. 目錄結構

plugin 本身隨 plugin 分發，不進本 repo。本 repo 只有以下兩處 SpecEngine 相關內容：

```text
├── .claude/spec/architecture-manifest.md   # 環境宣告，由 spec-manifest-sync 建立與同步
└── .specengine/
    ├── probes.md                           # 選填：覆寫 spec 01 的高風險探測維度
    ├── sdd/
    │   ├── overview.md                     # 全域模組索引（狀態欄為快取）
    │   ├── matrix/<MODULE_ID>.json         # 行為矩陣（01 建、02 補）
    │   ├── overview/<MODULE_ID>.md         # 模組釐清佇列總覽
    │   ├── flow-design/<MODULE_ID>.md      # 流程對齊通過證明 ＋ <MODULE_ID>/ 各流程圖
    │   ├── data/  features/                # 待答選擇題
    │   ├── parked/                         # 掛起（會變成 .feature 的 TODO）
    │   ├── resolved/                       # 已答歸檔
    │   ├── locks/<MODULE_ID>.lock.json     # IMPLEMENTED 證據，進 git
    │   ├── steps-index.json                # lint 產出的既有句型索引，進 git
    │   └── .spec-guard-snapshot.json       # spec 05 執行時態，加入 .gitignore
    └── spec/                               # 單一真實來源
        ├── terms.md  policy-defaults.md  erm.dbml
        └── features/*.feature              # 繁體中文檔名，Rule 掛 @rule: tag
```

產品程式碼、測試、Step、Driver 目錄的實際路徑見 `architecture-manifest.md`。


---

## 4. 模組階段（由 `spec-status.js` 推導）

| 階段 | 判定依據 | 下一步 |
| :--- | :--- | :--- |
| `CLARIFYING` | 佇列（`data/`、`features/`）有該模組的題 | spec 02 |
| `CLARIFIED` | 只有矩陣，佇列空 | `flow-design/<ID>.md` 不存在 → spec flow-align；存在 → spec 03 |
| `FORMALIZED` | `.feature` 中有 `@rule:R-<ID>-` | spec 04 |
| `STUBBED` | Step Definitions 中有 `@rule R-<ID>-` | spec 05 |
| `IMPLEMENTED` | `locks/<ID>.lock.json` 存在 | 完工；spec 06 定期巡檢 |

取最高一層存在的產物。不論階段，佇列有題就先回 spec 02（例如 spec 06 新建的漂移題）。低層產物缺漏（有 Step 沒 feature、有 lock 沒 Step）由腳本以警告回報，交人裁示，Skill 不自行補建。

問題檔只有兩種結局：答了（移至 `resolved/`）或掛起（移至 `parked/`）。佇列裡不留懸而未決的檔案。

---

## 5. 版本相容

每個模組的 `matrix/<MODULE_ID>.json` 記錄建立時的 plugin 版本（`spec_engine_version`）。Skill 讀到與目前 plugin 版本不一致的模組檔時，必須在彙報中標示「此模組建立於版本 X，目前為 Y，請確認相容性」，不得靜默假設格式相同。

<!-- SPECENGINE:END -->
