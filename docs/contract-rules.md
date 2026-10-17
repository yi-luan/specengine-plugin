# 專案規格與契約表達規範 (Project Contract Rules)

本文件為 SpecEngine 之最高語法與語義憲法。所有自然語言轉譯、DBML 資料模型生成與 Gherkin BDD 形式化過程，皆必須 100% 遵守本規範之不變性約束。第 5 節定義所有輔助檔案的格式，各 Skill 不得自創格式。

---

# 1. 核心哲學與不變性原則 (Core Invariants)

1. **零腦補原則 (Zero Hallucination)**：
   - 原始需求與決策記錄未涵蓋之邏輯，嚴禁自行揣測或代為假設。
   - 凡遭遇未界定之邊界，必須於 `.specengine/sdd/` 建立多選題（MCQ）或標記 PARKED 掛起。
   - **例外：形式化錯誤可自修**。若矩陣與決策紀錄已經唯一決定了正確答案，只是 `.feature` 抄錯（Examples 數值、Then 文字與矩陣不符），這不是業務決策，執行者得自行修正 `.feature`，但必須在 `.specengine/sdd/resolved/fixes/` 留下紀錄（格式見第 5.6 節）。判準：能否只看矩陣就唯一推出正確寫法。能 → 自修；不能 → MCQ。
2. **單一真實來源 (Single Source of Truth)**：
   - `.specengine/spec/` 目錄為系統唯一權威規格。
   - 更新規格時，採取「取代而非矛盾累加」原則，舊有不符之敘述必須直接覆寫刪除。
3. **術語嚴格一致性 (Strict Terminology Consistency)**：
   - 所有的實體、欄位與行為描述，必須 100% 參照 `.specengine/spec/terms.md` 之領域詞彙對照表，嚴禁同義異詞混用。
   - 使用者回答時給出的固定錯誤訊息或提示文案，記在 `terms.md` 的「固定文案」節，`.feature` 的 Then 步驟與產品代碼逐字沿用。
4. **模組識別命名一致性 (Module ID Consistency)**：
   - `MODULE_ID` 一律採全大寫 SNAKE_CASE（例如 `POINTS_REDEMPTION`），且必須與 `.specengine/sdd/matrix/<MODULE_ID>.json`、`.specengine/sdd/overview/<MODULE_ID>.md`、`.specengine/spec/features/*.feature` 內 `Feature:` 對應的繁體中文名稱建立一一映射關係。
5. **組織慣例不得與規格矛盾 (Policy-Spec Consistency)**：
   - `.specengine/spec/policy-defaults.md` 之慣例條目一旦被套用寫入某模組，該模組內容不得與慣例立場矛盾；若需偏離，必須在問題檔中明確標註「偏離慣例 POLICY-XXX，原因：...」。
6. **行為矩陣是行為的唯一來源 (Matrix as Behaviour Source)**：
   - 行為類決策以 `.specengine/sdd/matrix/<MODULE_ID>.json` 為唯一來源，釐清階段的答案必須寫回矩陣，流程圖與 `.feature` 皆由矩陣推導。
   - 矩陣結構：頂層 `spec_engine_version`（字串）與 `rules`（陣列）。每條 Rule 含 `rule_id`（`R-<MODULE_ID>-NNN`）、`type`（只能是 `main_flow` 或 `edge_case`）、`actor`、`pre_conditions[]`、`trigger_event`、`post_assertions[]`，可選 `resolved_by`（字串或字串陣列，指向歸檔決策檔）。`feature-lint.js` 驗證結構，並要求已形式化模組的每條 Rule 與 `.feature` 的 `@rule:` tag 一一對應。
   - 矩陣只放「有人做了什麼 → 系統發生什麼」的規則。「系統刻意什麼都不做」與「不提供此功能」這兩類決定**不進矩陣**，記在 `.specengine/spec/exclusions.md`（第 5.4 節），流程圖的「已知取捨」區與 `.feature` 都不為它們產生分支或 Scenario。

---

# 2. DBML 資料模型表達規範 (DBML Specification Rules)

1. **強型別與註解規範**：
   - 所有 Table 之 Column 必須顯式指定 Data Type（如 `int`, `varchar`, `decimal`, `timestamp`, `boolean`）。
   - 每個 Column 必須附帶 `note` 說明，註解內容採用領域中文，並標明數值約束（例如：`note: "點數餘額，必須 >= 0"`）。
2. **外鍵與關聯性定義**：
   - 實體間之關係必須於 DBML 底部顯式定義（例如：`Ref: Order.user_id > User.id`）。
3. **不可變條件與狀態標示**：
   - 若欄位具備狀態機屬性（如 `status`），必須於 `note` 中枚舉所有合法狀態值（例如：`note: "狀態: Pending | Approved | Cancelled"`）。
4. **命名依 manifest，待確認時有固定 fallback**：
   - Table／Column 命名依 `architecture-manifest.md` 第 3 節。該節仍為〔待確認〕時一律用 `snake_case`，並在 dbml 檔頭以註解寫明「命名慣例待 manifest 核實，目前暫採 snake_case」。manifest 日後填入不同慣例時，由 `spec-06` 偵測為漂移。

---

# 3. Gherkin BDD 形式化規範 (Gherkin Formalization Rules)

1. **結構關鍵字全英文**：`Feature`, `Rule`, `Scenario`, `Scenario Outline`, `Given`, `When`, `Then`, `And`, `Examples`。絕對禁止寫入 `# language: zh-TW`。
2. **階層嚴格性 (Feature > Rule > Scenario)**：
   - 所有驗證場景必須包裹於 `Rule:` 區塊之下。
   - 每個 `Rule:` 正上方必須掛 tag `@rule:R-XXXX`（tag 而非註解，測試報告才帶得出 Rule ID）。舊的 `# @rule R-XXXX` 註解形式已廢止，`feature-lint.js` 視為違規。
3. **參數雙引號與表達式規範**：
   - 步驟中所有可變參數、數值、狀態，一律使用雙引號 `""` 包裹。
   - Step Definition 一律以 `{string}` 接收，數值在函式體內轉換。不使用 `{int}`／`{float}`。
4. **多邊界表格化 (Scenario Outline)**：2 個以上相似數值邊界強制用 `Scenario Outline` + `Examples`。
5. **Examples 必須可由矩陣推導**：每一列 Examples 的輸入值與期望結果，必須能對照該 Rule 的 `pre_conditions`／`post_assertions` 唯一推出。spec-03 落盤前逐列核對；核對不過的列是形式化錯誤，不是規格瑕疵。
6. **未確定議題標註 (Parked Annotation)**：PARKED 議題於該 Rule 的 `@rule:` tag 上方標註 `# TODO: PARKED - [R-XXXX] <問題摘要>`。

---

# 4. 檔案 Sanitization 與語法純淨度規範

1. **禁止標籤污染**：
   - `.feature` 與 `.dbml` 絕對禁止夾帶 XML 標籤、YAML Header (`---`) 或 Markdown 程式碼區塊標記 (```)。
   - `.feature` 第一行必須是 `Feature:` 或 Gherkin `@tag`；Scenario Outline 的 `<placeholder>` 為合法語法。
2. **縮排與換行規範**：2 個空格縮排；檔案末尾單一換行符。

---

# 5. 輔助檔案格式 (Auxiliary File Formats)

所有時間戳一律 `YYYY-MM-DD HH:mm`，取本機時區（以 shell 的 `date` 指令為準）。`spec-guard.js` 的 lock 另存 ISO 時間供機器比對。

## 5.1 `.specengine/sdd/overview.md`（全域模組索引）

Markdown 表格，欄位順序固定，`spec-status.js` 以第 2 欄為狀態快取：

```markdown
| 模組 | 狀態 | 待答 | 掛起 | 已解決 | 版本 | 更新時間 |
| :--- | :--- | ---: | ---: | ---: | :--- | :--- |
| POINTS_REDEMPTION | CLARIFIED | 0 | 0 | 11 | 2.0.0 | 2026-10-18 01:30 |
```

狀態欄只是快取，真相由 `spec-status.js` 推導。表格下方可附加 `## 巡檢紀錄` 區塊（spec-06 寫入）。

## 5.2 `.specengine/spec/terms.md`（領域術語）

```markdown
# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 點數餘額 | 會員目前可用的點數 | members.points_balance | POINTS_REDEMPTION |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | 折抵點數超過餘額 | R-POINTS_REDEMPTION-002 拒絕訊息 | resolved/features/點數折抵_超過上限時的系統反應.md |
```

spec-01 建立並收錄需求中的名詞；spec-02 的命名類決策與使用者給的固定文案寫入此檔。

## 5.3 `.specengine/spec/policy-defaults.md`（跨模組慣例）

```markdown
| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 數值超過上限一律拒絕並報錯，不自動截斷 | POINTS_REDEMPTION | resolved/features/... | 2026-10-18 |
```

一題可晉升一條；多個情境若立場相同可合併成一條，抽象到「跨模組仍成立」的程度。

## 5.4 `.specengine/spec/exclusions.md`（刻意不做清單）

```markdown
| ID | 內容 | 類型 | 模組 | 來源決策 | 日期 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| X-POINTS_REDEMPTION-001 | 會員折抵後離開或逾時，系統不自動退點 | 系統無動作 | POINTS_REDEMPTION | resolved/features/... | 2026-10-18 |
| X-POINTS_REDEMPTION-002 | 不提供部分取消折抵 | 不提供功能 | POINTS_REDEMPTION | resolved/features/... | 2026-10-18 |
```

`類型` 只能是「系統無動作」「不提供功能」「範圍外（屬其他模組）」。此檔屬 `.specengine/spec/`，spec-05 期間凍結。flow-align 的「已知取捨」區直接列出本模組的條目。

## 5.5 `.specengine/sdd/flow-design/<MODULE_ID>.md`（流程對齊索引）

第一行必須是狀態行，`spec-status.js` 以此判定是否過關：

```markdown
> 狀態：已通過 ｜ 確認時間：2026-10-18 01:45 ｜ Rule 總數：11
```

或

```markdown
> 狀態：未通過（缺口 1） ｜ 最近確認：2026-10-18 01:15
```

兩種狀態下都要有以下區塊，讓缺口分支也能保存使用者已裁示的結論：

```markdown
## 使用者已裁示非缺口
- 「送出訂單」屬訂單模組，不在本模組範圍（2026-10-18）

## 已確認無不一致的流程圖
- 折抵驗證與成交（R-000, 001, 002, 003, 007, 008）

## 流程階段檔案
- [折抵驗證與成交](POINTS_REDEMPTION/折抵驗證與成交.md)
```

同一 Rule 可出現在多張圖中。

## 5.6 `.specengine/sdd/resolved/fixes/<MODULE_ID>_<摘要>.md`（形式化錯誤自修紀錄）

```markdown
# 形式化錯誤自修
- **發現階段**：spec-05
- **檔案**：.specengine/spec/features/點數折抵.feature
- **錯在哪**：R-006 Outline 第 3 列，餘額 100、輸入 501 同時超過餘額與訂單金額，期望卻寫「超過訂單金額」
- **依據**：矩陣 R-002 pre_conditions「兩者皆超過以餘額為準」
- **改成**：前置餘額改 1000，使該列只超過訂單金額，Then 維持「折抵點數超過訂單金額」
- **快照**：已重建（原因：規格經自修合法變更）
- **時間**：2026-10-18 02:20
```

## 5.7 MCQ 問題檔

見 `skills/spec-01-discovery-bootstrap/references/mcq-file-format.md`。「定位」欄必須含 `MODULE_ID`，「來源」欄記發現階段。
