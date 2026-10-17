---
name: spec-04-generate-test-stub
description: 當使用者輸入 /spec-04 [MODULE_ID]、/spec-run，或說「產生測試骨架」「寫測試 stub」時使用。為已形式化的 Feature 檔，依 architecture-manifest.md 宣告的 BDD 框架、目錄與 Binding Layer，產出確定性紅燈的 Step Definitions、Driver 介面與 fixture 接線。
---

# 目標

把 `.feature` 的每個步驟綁成真正可執行的 Step Definition，並建立 step 與被測系統之間的綁定契約（Driver 介面）。產出全部拋確定性失敗，建立 TDD 紅燈基準。spec-05 要做的事因此從「呼叫產品碼」變成「實作明確的介面」。

---

# 硬性約束

1. **一切依 manifest**：目錄、框架、語言、命名、Binding Layer、Driver Directory 皆取自 `.claude/spec/architecture-manifest.md` 第 1、3、5 節，本 Skill 不預設任何技術棧。
2. **框架未就緒時不假裝**：manifest「BDD Execution Framework」為〔待確認〕、或宣告的套件在依賴清單查無安裝時，在彙報中明確提示，並詢問使用者是先安裝接線還是先產不可執行的示意骨架。不得生成會編譯失敗的 import 卻宣稱可執行。
3. **Binding Layer 未決時不猜**：manifest「Binding Layer」為〔待確認〕時，停下來請使用者在 `driver` 與 `direct` 之間選擇並填入 manifest，再繼續。這是團隊決策，不可代選。
4. **句型即契約**：Step Definition 的句型字串必須與 `.feature` 步驟文字一致，雙引號參數一律以 `{string}` 接收（見 contract-rules 第 3.3 條）。這些字串就是 spec-05 期間 `spec-guard.js` 凍結的對象。
5. **Step 薄、Driver 厚**（Binding Layer 為 `driver` 時）：step 函式體只做「參數型別轉換 → 呼叫 Driver 介面方法 → 斷言」，不含任何 Playwright、HTTP、ORM 細節。所有技術細節都在 Driver 實作裡。
6. **狀態隔離**：嚴禁全域變數。跨步驟狀態放在 Driver 實例或框架的 World／fixture 裡。
7. **確定性紅燈**：Step 與 Driver 介面方法預設皆拋 `Contract Not Implemented`（或該語言對應的例外）。
8. **識別字與檔名語言依 manifest**：Driver 介面名、方法名、fixture 名、以及 step／driver 檔名，皆依 manifest 第 3 節「Test Identifier Language」。`en`（預設）時用英文識別字與 kebab-case 英文檔名、中文放註解；`zh-TW` 時用領域中文識別字與中文檔名。範例檔兩種都有示範。
9. **`@binds` 必須指向真的存在的方法**：`spec-guard.js snapshot` 會逐一驗證 step 檔的 `@binds X.y` 在 Driver 介面檔中找得到 `y`，找不到會 Fail Loud，spec-05 開不了工。產出後自己先跑一次 snapshot 確認。

---

# 執行步驟

## Step 0: 讀取 manifest 與前置檢查

取得 `Step Definitions Directory`、`Driver Directory`、`Binding Layer`、`BDD Execution Framework`、`Assertion Library`、`Test Data Seeding Strategy`、命名規範。檢查框架安裝狀態與 Binding Layer（硬性約束 2、3）。

## Step 1: 讓框架列出未定義步驟

優先用框架本身的 dry-run 取得未定義步驟清單與函式樣板，而非由 LLM 從 `.feature` 轉寫：

- cucumber-js：`--dry-run --format snippets`（輸出會逐 Scenario 重複，先依句型去重）
- playwright-bdd：`npx bddgen`，再執行測試取得 undefined step 報告
- 其他框架：依 manifest 宣告的框架查其對應指令

框架無 dry-run 能力時，才退回解析 `.feature` 自行產生。

## Step 2: 解析來源

1. 本模組 `.feature` 的 Rule／Scenario／Background 階層與 `@rule:` tag。
2. `erm.dbml` 實體屬性表，供 `@schema` 註解。

## Step 3: 產出 Step Definitions

每個不重複的步驟一個函式，寫入 `Step Definitions Directory`，檔名依 manifest 第 3 節。每個 Step 上方三行註解：

```
// @rule R-XXXX-NNN, R-XXXX-MMM（多條以逗號分隔，寫完整 ID；全模組共用的 Step 寫 R-<MODULE_ID>-*）
// @schema Entity.column: type（無資料綁定寫 none）
// @binds <Driver 介面>.<方法>（direct 模式寫 <Service>.<方法>）
```

函式體：`driver` 模式呼叫 Driver 介面；`direct` 模式直接拋例外，由 spec-05 接 Service。結構 Read `references/typescript-stub-example.md`，API 依 manifest 框架替換。

## Step 4: 產出 Driver 層（Binding Layer 為 `driver` 時）

1. **介面檔** `<Driver Directory>/<模組名稱>.driver.<副檔名>`：依 Step 3 的 `@binds` 彙整出所有方法，只有簽章與一行說明。有 interface 的語言用 interface；沒有的語言（JavaScript、Python）用「全部方法拋 `Contract Not Implemented` 的基底類別」當介面檔。檔名與識別字語言依硬性約束 8。此檔會被 spec-guard 全字節凍結。
2. **in-process 實作** `<模組名稱>.inprocess.<副檔名>`：實作介面，每個方法拋 `Contract Not Implemented`。spec-05 的紅綠迴路用它。
3. **第二實作**：僅當 manifest 第 2 節「UI Component Framework」或第 4 節「API Interface Standard」已填時產出 `<模組名稱>.ui.<副檔名>` 或 `.api.<副檔名>`，同樣全部拋例外。兩欄皆〔待確認〕則不產，彙報註明「僅 in-process」。
4. **fixture 接線**：若 `<Test Root Directory>/fixtures.<副檔名>` 不存在則建立，依環境變數（例如 `BINDING=inprocess|ui`）選擇 Driver 實作並注入 step。已存在則只追加本模組的 fixture。**確認框架真的會載入它**：檢查框架設定檔（例如 cucumber 的 `require`／`import` 路徑、playwright 的 `testDir`）是否涵蓋 fixture 檔；不涵蓋就在 step 檔內 `require`／`import` 它，並在彙報註明。

Binding Layer 為 `direct` 時跳過本步驟。

## Step 5: 寫回狀態

將 `overview.md` 本模組狀態 `FORMALIZED` → `STUBBED`。

---

# 完成條件

- [ ] manifest 已讀取，框架安裝狀態與 Binding Layer 已確認
- [ ] 每個 Step 句型與 `.feature` 一致，附 `@rule`、`@schema`、`@binds`
- [ ] `driver` 模式：介面檔、至少一個實作、fixture 接線已產出；step 內不含技術細節
- [ ] 無跨 Scenario 全域狀態
- [ ] 所有 Step 與 Driver 方法為確定性失敗
- [ ] `spec-guard.js snapshot` 可成功建立（@binds 全部有效）
- [ ] 狀態欄已寫為 `STUBBED`

# 完成彙報

```text
[Phase 04: Generate Test Stub] 執行完成！模組：<MODULE_ID>

1. 框架：<框架>（已安裝 ｜ 未安裝，已提示）；Binding Layer：<driver | direct>
2. 產出：
   - <Step Definitions Directory>/<檔名>（Step X 個）
   - <Driver Directory>/<模組>.driver.<ext>（方法 Y 個）
   - <Driver Directory>/<模組>.inprocess.<ext>、<模組>.ui.<ext>
   - <Test Root>/fixtures.<ext>（新建 ｜ 追加）
3. 對齊 DBML 欄位 Z 個，100% Red Stage
4. 模組階段狀態：STUBBED（已寫回 .specengine/sdd/overview.md）
```
