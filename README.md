# SpecEngine Plugin

狀態驅動的 BDD 規格治理框架，打包為 Claude Code Plugin。技術棧、目錄、測試指令全部由各專案自己的 `.claude/spec/architecture-manifest.md` 宣告，plugin 本身不綁定任何語言或框架。

## 內容

| 目錄 | 內容 |
| :--- | :--- |
| `skills/` | 10 個 Skill：`spec-01` ~ `spec-06`、`spec-flow-align`、`spec-run`、`spec-manifest-sync`、`spec-status` |
| `scripts/` | `spec-status.js`（從產物推導模組階段）、`feature-lint.js`（feature／dbml 純淨度、`@rule:` tag、矩陣結構、矩陣↔feature 一致性、句型索引）、`spec-guard.js`（snapshot／verify 凍結、`@binds` 驗證、lock／audit）。只用 Node 內建模組 |
| `docs/contract-rules.md` | Gherkin 與 DBML 的表達規範 |
| `templates/` | `architecture-manifest.template.md`、`claude-md-specengine-section.template.md`，首次導入時由 `spec-manifest-sync` 落地 |

## 流程

```text
spec-01 冷啟動 ──► spec-02 釐清 ──► spec-flow-align 流程圖確認 ──► spec-03 Gherkin ──► spec-04 紅燈骨架 ──► spec-05 紅轉綠
                   （MCQ，使用者親答）  （使用者親自確認）              （feature-lint）                      （spec-guard）

spec-06 漂移巡檢、spec-manifest-sync 環境核實：週期性治理，不在 spec-run 串接範圍
```

`spec-run` 以 `spec-status.js` 推導的階段為起點，不重跑已完成的階段。隨時可用 `spec status` 查「現在到哪、下一步是什麼」。

## 狀態是算出來的

模組階段不存在任何狀態欄裡，而是從產物推導：有 `locks/<ID>.lock.json` 就是 IMPLEMENTED，有含該模組 `@rule` 的 Step 檔就是 STUBBED，有含 `@rule:` tag 的 feature 就是 FORMALIZED，佇列有題就是 CLARIFYING，只有矩陣就是 CLARIFIED。`overview.md` 的狀態欄只是給人看的快取。問題檔只有兩種結局：答了進 `resolved/`，沒答進 `parked/` 變成 feature 裡的 TODO。

## 三種決定，三個家

- **會發生動作的規則**（有人做了什麼，系統發生什麼）→ 矩陣 → 流程圖分支 → `.feature` Scenario → 測試。
- **刻意不做的決定**（系統無動作、不提供功能、屬其他模組）→ `.specengine/spec/exclusions.md`。流程圖確認時列在「已知取捨」區，不畫分支、不寫測試。
- **形式化錯誤**（矩陣對、`.feature` 抄錯）→ 執行者自修，留紀錄在 `resolved/fixes/`，不問使用者。真正的規格瑕疵才開選擇題。

這個分法是在真實專案跑一輪後定下來的。所有輔助檔案的格式在 `docs/contract-rules.md` 第 5 節。

## 從句子到程式碼的綁定

整條鏈靠一個東西貫穿：步驟句子的文字。

```text
.feature          Given 會員點數餘額為 "100"             ← 句子 + 雙引號參數，spec-guard 凍結
steps/            Given('會員點數餘額為 {string}', ...)   ← 句子變成函式的 key，只呼叫 Driver
drivers/*.driver  interface 點數折抵Driver { 設定會員餘額(n) }   ← 綁定契約，spec-guard 凍結
drivers/*.inprocess / *.ui                                ← 技術細節，spec-05 實作，可切換
src/              PointsRedemptionService.redeem()        ← 產品代碼
```

manifest 的 `Binding Layer` 設為 `driver` 時走上面的結構；設為 `direct` 時 step 直接呼叫 Service，省掉 Driver 層。每個 `Rule:` 掛 `@rule:R-XXXX` tag，測試報告帶著它，`spec-06` 直接從報告算覆蓋率。

## 被腳本強制的不變性

| 不變性 | 腳本 | 時機 |
| :--- | :--- | :--- |
| feature／dbml 純淨、Rule 掛 tag 且排序 | `feature-lint.js` | spec-03 收工 |
| 矩陣結構齊全、矩陣 Rule 與 feature tag 一一對應 | `feature-lint.js` | spec-01／02／03 |
| 既有句型索引，供 spec-03 複用 | `feature-lint.js` 產出 `steps-index.json` | 每次 lint 通過 |
| `@binds` 指向真實存在的 Driver 方法 | `spec-guard.js snapshot` | spec-05 開工 |
| 實作期間規格、句型、Driver 介面不動 | `spec-guard.js snapshot`／`verify` | spec-05 頭尾 |
| 完工後規格、句型、介面不被事後偷改 | `spec-guard.js lock`／`audit` | spec-05 收工、spec-06 |
| 模組階段 | `spec-status.js` | spec-run 起點、任何時候 |

零腦補與不代答仍靠 Skill 內的硬性約束維持，無法用腳本驗證。

## 安裝

```
/plugin marketplace add https://github.com/yi-luan/specengine-plugin
/plugin install specengine@specengine-marketplace
```

repo 為私有時，執行 `/plugin marketplace add` 的機器需要能以 git 認證存取該 repo（例如已登入的 Git Credential Manager 或 SSH 金鑰）。

升級：

```
/plugin marketplace update specengine-marketplace
```

## 新專案導入

裝好後在專案裡說「幫我把 SpecEngine 導入這個專案」或執行 `/specengine:spec-manifest-sync`，它會：

1. 從範本落地 `.claude/spec/architecture-manifest.md`，掃描依賴清單與目錄結構，把能找到唯一證據的欄位填入，其餘留〔待確認〕交給團隊。
2. 在專案 `CLAUDE.md` 末尾附加 `<!-- SPECENGINE:BEGIN -->` / `<!-- SPECENGINE:END -->` 包住的路由與約束區塊。標記之外的內容不會被動到。
3. 之後 plugin 升級或專案架構變動，再跑一次即可；版本落差會先回報，經同意才覆寫區塊。

請把 `.specengine/sdd/.spec-guard-snapshot.json` 加入專案 `.gitignore`，它是 `spec-05` 的執行時態。`locks/` 與 `steps-index.json` 要進 git。

專案可在 `.specengine/probes.md` 覆寫 spec-01 的高風險探測維度，例如內容型模組不需要「計算精度」但需要「權限與可見性」。

## 目錄慣例（消費端專案）

```text
.claude/spec/architecture-manifest.md   環境宣告
.specengine/sdd/                        執行時態：overview.md、matrix/、overview/、flow-design/、data/、features/、parked/、resolved/、locks/、steps-index.json
.specengine/spec/                       規格單一真實來源：terms.md、policy-defaults.md、erm.dbml、features/*.feature
```

## 版本與授權

版本號以 `.claude-plugin/plugin.json` 的 `version` 為準。每個模組的矩陣檔記錄建立時的版本，Skill 讀到不一致時會提示。變更紀錄見 `CHANGELOG.md`。授權為 MIT，見 `LICENSE`。
