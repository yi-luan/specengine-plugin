# 專案規格與契約表達規範 (Project Contract Rules)

本文件為 SpecEngine 之最高語法與語義憲法。所有自然語言轉譯、DBML 資料模型生成與 Gherkin BDD 形式化過程，皆必須 100% 遵守本規範之不變性約束。

---

# 1. 核心哲學與不變性原則 (Core Invariants)

1. **零腦補原則 (Zero Hallucination)**：
   - 原始需求與決策記錄未涵蓋之邏輯，嚴禁自行揣測或代為假設。
   - 凡遭遇未界定之邊界，必須於 `.specengine/sdd/` 建立多選題（MCQ）或標記 PARKED 掛起。
2. **單一真實來源 (Single Source of Truth)**：
   - `.specengine/spec/` 目錄為系統唯一權威規格。
   - 更新規格時，採取「取代而非矛盾累加」原則，舊有不符之敘述必須直接覆寫刪除。
3. **術語嚴格一致性 (Strict Terminology Consistency)**：
   - 所有的實體、欄位與行為描述，必須 100% 參照 `.specengine/spec/terms.md` 之領域詞彙對照表，嚴禁同義異詞混用。
4. **模組識別命名一致性 (Module ID Consistency)**：
   - `MODULE_ID` 一律採全大寫 SNAKE_CASE（例如 `POINTS_REDEMPTION`），且必須與 `.specengine/sdd/matrix/<MODULE_ID>.json`、`.specengine/sdd/overview/<MODULE_ID>.md`、`.specengine/spec/features/*.feature` 內 `Feature:` 對應的繁體中文名稱建立一一映射關係，不得同一業務切片使用兩個不同的 `MODULE_ID`。
5. **組織慣例不得與規格矛盾 (Policy-Spec Consistency)**：
   - `.specengine/spec/policy-defaults.md` 之慣例條目一旦被套用寫入某模組的 `.specengine/spec/erm.dbml` 或 `.feature`，該模組內容不得與慣例條目描述之立場矛盾；若模組有正當理由需要偏離既有慣例，必須在該模組的問題檔中明確標註「偏離慣例 POLICY-XXX，原因：...」，不可悄悄寫出不一致的敘述。

---

# 2. DBML 資料模型表達規範 (DBML Specification Rules)

1. **強型別與註解規範**：
   - 所有 Table 之 Column 必須顯式指定 Data Type（如 `int`, `varchar`, `decimal`, `timestamp`, `boolean`）。
   - 每個 Column 必須附帶 `note` 說明，註解內容必須採用領域中文，並標明數值約束（例如：`note: "點數餘額，必須 >= 0"`）。
2. **外鍵與關聯性定義**：
   - 實體間之關係必須於 DBML 底部顯式定義關聯（例如：`Ref: Order.user_id > User.id`）。
3. **不可變條件與狀態標示**：
   - 若欄位具備狀態機屬性（如 `status`），必須於 `note` 中枚舉所有合法狀態值（例如：`note: "狀態: Pending | Approved | Cancelled"`）。

---

# 3. Gherkin BDD 形式化規範 (Gherkin Formalization Rules)

1. **結構關鍵字全英文**：
   - 結構關鍵字強制統一採用全英文：`Feature`, `Rule`, `Scenario`, `Scenario Outline`, `Given`, `When`, `Then`, `And`, `Examples`。
   - 絕對禁止寫入 `# language: zh-TW`。
2. **階層嚴格性 (Feature > Rule > Scenario)**：
   - 所有驗證場景必須包裹於 `# @rule R-XXXX` 與 `Rule:` 區塊之下，禁止直接於 `Feature:` 下宣告無 Rule 歸屬之 Scenario。
3. **參數雙引號與表達式規範**：
   - 步驟中所有可變參數、數值、狀態，一律使用標準雙引號 `""` 包裹（例：`"50000"`）。
   - 數值與參數必須設計為易於被 Cucumber Expressions (`{string}`, `{int}`) 抽離之句型。
4. **多邊界表格化 (Scenario Outline)**：
   - 凡涉及 2 個以上相似數值邊界之測試，強制採用 `Scenario Outline:` 搭配 `Examples:` 表格，禁止複製貼上重複結構之 Scenario。
5. **未確定議題標註 (Parked Annotation)**：
   - 若 Rule 包含尚未決策之議題（PARKED），必須於 Rule 上方標註 `# TODO: PARKED - [R-XXXX] <問題摘要>` 註解，確保編譯不被阻斷。

---

# 4. 檔案 Sanitization 與語法純淨度規範

1. **禁止標籤污染**：
   - 產出之 .feature 與 .dbml 檔案，絕對禁止夾帶任何 XML 標籤、YAML Header (`---`) 或 Markdown 程式碼區塊標記 (```)。
2. **縮排與換行規範**：
   - 縮排統一採用 2 個空格。
   - 檔案末尾必須保留單一換行符，確保 Git Version Control 異動乾淨。