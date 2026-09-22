---
name: spec-03-formalize-gherkin
description: 當使用者輸入 /spec-03 [MODULE_ID]、/spec-run,或說「形式化」「產生 feature 檔」「寫 Gherkin」時使用，把已釐清的模組矩陣形式化為 Gherkin（產出 .specengine/spec/features/*.feature，並以 ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js 實際驗證純淨度與排序）。
---

# 目標
將消滅歧義後的狀態矩陣與決策，轉譯為低維護成本、高可複用性且 100% 符合 Cucumber 語法規範的標準 Gherkin DSL 特性檔案。若存在掛起之議題（PARKED），將其轉換為註解，確保預覽與編譯不中斷。

---

# 核心行為規範與硬性約束 (Hard Constraints)

1. **句型正規化與複用 (Step Normalization & Reuse)**：
   - 相同語義的步驟必須使用完全一致的句型（例：統一使用 `Given 使用者選擇 "使用點數折抵"`）。
   - 優先讀取現有 `.specengine/spec/features/*.feature` 既有的 Step 句型與 `.specengine/spec/terms.md` 術語，防止 Step Definitions 數量暴增。
2. **雙引號參數化 (Parameter Extraction)**：
   - 步驟中的變數、狀態值、字串一律使用標準雙引號 `""` 包裹。
   - 數值與參數必須易於被 Cucumber `{string}` / `{int}` 正則表達式抽離。
3. **確定性生成與 Git 友善 (Deterministic Sorting & Formatting)**：
   - 縮排統一使用 2 個空格，檔案末尾保留單一換行符，防止產生無意義的 Git Diff 污染。
   - Rule 排序規則見 `references/gherkin-structure-example.md`。
4. **邊界條件表格化 (Scenario Outline)**：
   - 若同一 Rule 包含 2 個以上相似的數值邊界驗證，強制重構成 `Scenario Outline:` 搭配 `Examples:` 表格。
5. **PARKED 狀態轉置 (Parked Item Handling)**：
   - 若 `.specengine/sdd/parked/` 中有屬於該 Feature 的未解議題，不阻斷編譯，將其轉譯為 `# TODO: PARKED - [R-XXXX] <問題摘要>` 註解附於對應 Rule 上方。
6. **純淨落盤與實際驗證 (Parser Sanitization, Enforced)**：
   - 檔案第一行必須直接進入 `Feature:` 或 `# @rule` 註解。
   - 絕對禁止夾帶 XML 標籤（如 `<gherkin_feature>`）、YAML Header (`---`) 或 Markdown 程式碼區塊標記 (```)。
   - 絕對禁止寫入 `# language: zh-TW`。結構關鍵字強制統一使用英文 (`Feature`, `Rule`, `Scenario`, `Scenario Outline`, `Given`, `When`, `Then`, `And`, `Examples`)。
   - 以上規則【不得僅憑肉眼觀察判斷合規】，落盤後必須實際執行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js` 驗證；若回報非 0 exit code，必須依報錯內容修正後重新執行，直至通過為止才可進入完成彙報。

---

# 執行步驟與檔案操作

## Step 0: 模組解析 (Module Resolution)

同 `spec-02-interactive-clarify` Step 0 之邏輯：若使用者未指定模組，且 `.specengine/sdd/overview.md` 中有多個模組同時處於 `CLARIFIED` 狀態（已釐清完畢、尚未產出 `.feature`），必須先請使用者指定，嚴禁自行猜測。

---

## Step 1: 載入單一真實來源 (Single Source of Truth)

1. 讀取 `.specengine/sdd/matrix/<MODULE_ID>.json` (確定邏輯)。
2. 讀取 `.specengine/sdd/resolved/` 中所有屬於本模組已決策的決策檔案。
3. 讀取 `.specengine/sdd/parked/` 中所有屬於本模組掛起的議題檔案（若有）。
4. 讀取 `.specengine/spec/terms.md` (名詞字典)、`.specengine/spec/policy-defaults.md`（組織慣例，用於句型措辭一致性）與現有 `.specengine/spec/features/*.feature` (既有句型庫)。

---

## Step 2: 句型與參數對齊 (Normalization)

1. 檢查所有 Given/When/Then 步驟，將同義異詞統一替換為 `.specengine/spec/terms.md` 中定義的術語。
2. 自動將可變參數與數值包裹雙引號，並抽離為 Cucumber 可解析格式。

---

## Step 3: Gherkin AST 結構編譯與 PARKED 標註

Read `references/gherkin-structure-example.md`，依其結構範例與排序規則進行轉譯與編譯。

---

## Step 4: 落盤、實際驗證與必要時修正

1. 寫入實體檔案：`.specengine/spec/features/[module_name].feature`。
2. 執行 `node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js`。
3. 若有違規回報，逐項修正對應檔案後重新執行 Step 4.2，直到 exit code 為 0。
4. **狀態欄寫回（見 CLAUDE.md 第 4.2 節）**：`feature-lint.js` 通過後，將 `.specengine/sdd/overview.md` 中本模組對應那一列的狀態欄由 `CLARIFIED` 改寫為 `FORMALIZED`，不改動其他模組的列。

---

# 完成條件

- [ ] `.specengine/spec/features/[module_name].feature` 已落盤
- [ ] 句型與術語 100% 對齊 `.specengine/spec/terms.md`，未新增未經核准的同義詞
- [ ] Rule 區塊依 `@rule` ID 字典序排序
- [ ] 檔案不含 XML 標籤、Markdown 程式碼區塊標記、`# language: zh-TW`
- [ ] `node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js` exit code 為 0
- [ ] `.specengine/sdd/overview.md` 本模組狀態欄已由 `CLARIFIED` 改寫為 `FORMALIZED`

# 完成彙報 (Terminal Output)

執行完畢後，在 Terminal 印出狀態快照：

```text
[Phase 03: Formulate Gherkin] 執行完成！模組：<MODULE_ID>

1. 產出檔案概況：
   - .specengine/spec/features/[module_name].feature (已覆寫落盤)

2. 編譯指標快照：
   - Rule 數量：X 條
   - Scenario / Outline 數量：Y 個
   - PARKED 標註數量：Z 個 (# TODO 註解)
   - 句型與術語 100% 對齊 .specengine/spec/terms.md

3. 自動驗證結果：
   - node ${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js → PASS (exit code 0)

4. 模組階段狀態：FORMALIZED（已寫回 .specengine/sdd/overview.md）
```

```text
[SpecEngine] spec-03 進度：Step 4 / 4 — 已完成，模組：<MODULE_ID>
```