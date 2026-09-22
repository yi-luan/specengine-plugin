---
name: spec-04-generate-test-stub
description: 當使用者輸入 /spec-04 [MODULE_ID]、/spec-run,或說「產生測試骨架」「寫測試 stub」時使用，為已形式化的 Feature 檔產生測試骨架（對齊 architecture-manifest.md 技術棧與 DBML Schema，產出強型別 TDD 紅燈測試 stub）。
---

# 目標
讀取 `architecture-manifest.md` 所定義之技術棧與測試框架變數，將 Gherkin 特性檔案與 DBML 資料模型進行雙向契約綁定，自動生成具備強型別測試 Context (Custom World)、雙層 Background 作用域隔離與確定性失敗斷言之測試程式碼骨架。本專案採 Cucumber 風格（真正可執行的 Gherkin 引擎），每個 Given/When/Then 必須是真的綁定到 `.feature` 文字的 Step Definition，而非僅描述性的骨架。

---

# 核心行為規範與硬性約束 (Software Engineering Invariants)

1. **動態環境變數對齊 (Manifest Dynamic Alignment)**：
   - 必須讀取 `architecture-manifest.md`，根據其定義之 `Test Root Directory`、`Step Definitions Directory`、`BDD Execution Framework` 與命名規範產生符合該技術棧規範之測試檔案與目錄。
   - **本專案為單軌**（見 manifest 第 1、5 節）：所有 Rule 一律以 `playwright-bdd`（TypeScript）綁定，不分 UI／後端層級，不需要 Reqnroll 或其他 C# 測試框架分流。
   - 若 manifest 該節仍標註〔待確認並實際安裝〕（`playwright-bdd` 尚未安裝、`playwright.config.ts` 尚未呼叫 `defineBddConfig()`），必須在完成彙報中明確提示此限制，並詢問是否先安裝套件與補上最小接線設定，或改採 `references/typescript-stub-example.md` 的示意骨架寫法（不可執行，僅供 review 用）；不得自行假裝套件已安裝而生成實際上會編譯失敗的 import。
2. **DBML 實體型別符號綁定 (DBML Schema Symbol Binding)**：
   - 所有步驟引用的資料欄位，必須顯式標註 DBML 實體與型別（例如 `@schema ImageUpload.TotalSlices: int`）。
   - 自動將 Gherkin 中的變數，根據 manifest 命名規範轉換為強型別參數。
3. **測試狀態隔離與 Context 封裝 (Scenario State Isolation)**：
   - 嚴禁使用全域變數儲存跨步驟狀態。所有狀態轉移必須封裝於獨立之 Playwright fixture／自訂 World 中，確保測試場景間 100% 獨立隔離。
4. **雙層 Background 作用域映射 (Scoped Background Hooks)**：
   - Feature-level Background 映射為全域或 Feature 作用域之 setup 步驟。
   - Rule-level Background 映射為特定 Rule 區塊之 setup 步驟，確保前置資料建立之順序性與隔離性。
5. **TDD 確定性失敗契約 (Deterministic Red-Stage Assertion)**：
   - 產出之步驟實作區塊，預設注入確定性失敗例外，確保初始狀態必定進入 Red Stage：`throw new Error("Contract Not Implemented: [Step Text]");`。

---

# 執行步驟與檔案操作

## Step 0: 讀取架構宣告 (Load Architecture Manifest)

1. 載入 `architecture-manifest.md`，獲取測試目錄結構、程式語言型別系統與 BDD 框架模組名稱。

---

## Step 1: 符號表抽離與型別定義

1. 解析 `.specengine/spec/features/*.feature` 提取 Feature、Rule、Scenario 與 Background 階層結構。
2. 解析 `.specengine/spec/erm.dbml` 建立實體屬性符號表 (Symbol Table)。
3. 根據 DBML 實體定義與 manifest 命名規範，建構測試專用之強型別 Context 介面。

---

## Step 2: 雙層 Background 與 Hook 結構構建

1. **Feature Background 處理**：轉譯為測試執行前之基礎 Context 初始化步驟。
2. **Rule Background 處理**：轉譯為對應 Rule 標籤 (`# @rule R-XXXX`) 作用域下之獨立前置步驟。

---

## Step 3: Step Definitions 轉譯與實體落盤

1. 提取 Given/When/Then 步驟中的雙引號參數，自動對應為 TypeScript `{string}`/`{int}` Cucumber Expression。
2. 注入 Schema 追溯註解與確定性失敗斷言（見上方核心行為規範 #5）。
3. 產出程式碼結構請 Read `references/typescript-stub-example.md`（`playwright-bdd` 結構範例）——完整沿用其結構（雙層 Background、`@schema` 追溯註解、確定性紅燈斷言、Context/World 狀態隔離）。
4. 寫入實體檔案至 manifest 指定之 `Step Definitions Directory`（`tests/steps/`）目錄下。
5. **狀態欄寫回（見 CLAUDE.md 第 4.2 節）**：測試骨架落盤（Red Stage）後，將 `.specengine/sdd/overview.md` 中本模組對應那一列的狀態欄由 `FORMALIZED` 改寫為 `STUBBED`，不改動其他模組的列。

---

# 完成條件

- [ ] `architecture-manifest.md` 之技術棧變數已讀取並套用
- [ ] 每個 Step 皆標註對應的 DBML 實體與型別（`@schema`）
- [ ] 無跨 Scenario 共用的全域變數，狀態皆封裝於 `TestContext`
- [ ] Feature-level 與 Rule-level Background 已分層映射
- [ ] 所有 Step 實作區塊皆為確定性失敗例外（`throw new Error(...)`），確認為 Red Stage
- [ ] `.specengine/sdd/overview.md` 本模組狀態欄已由 `FORMALIZED` 改寫為 `STUBBED`

# 完成彙報 (Terminal Output)

執行完畢後，在 Terminal 印出狀態快照：

```text
[Phase 04: Generate Test Stub] 執行完成！

1. 讀取架構宣告：architecture-manifest.md
2. 產出檔案概況：
   - tests/steps/[module_name].spec.ts (playwright-bdd)

3. 契約綁定指標快照：
   - 轉譯 Step 數量：X 個
   - 對齊 DBML Table/Column 數量：Y 個
   - TestContext 狀態欄位數：Z 個
   - TDD 斷言覆蓋度：100% Red Stage（確定性失敗例外）

4. 模組階段狀態：STUBBED（已寫回 .specengine/sdd/overview.md）
```

```text
[SpecEngine] spec-04 進度：Step 3 / 3 — 已完成
```