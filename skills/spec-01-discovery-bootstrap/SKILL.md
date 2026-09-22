---
name: spec-01-discovery-bootstrap
description: 當使用者輸入 /spec-01、/spec-run，或說「冷啟動」「掃需求」「幫我分析這個需求」時使用，對新需求/新模組進行雙軌冷啟動（無互動靜態掃描需求、鎖定核心業務切片、抽取行為矩陣與 DBML 草稿、以高風險工程探測清單找盲點）。純掃描器角色，不會向使用者提問。
---

# 目標
靜態掃描原始需求與現有 `.specengine/spec/`，零腦補地解構為核心業務切片 (Core Business Slice)、行為矩陣與 DBML 資料模型草稿。
套用「高風險工程探測清單」發掘隱含的架構與業務邊界盲點；優先比對 `.specengine/spec/policy-defaults.md` 既有組織慣例自動套用，剩下無法套用的才轉換為低認知負擔的「多選題 (MCQ)」並更新至 `.specengine/sdd/` 狀態機佇列中。

# 核心行為規範 (Hard Constraints)

1. **純掃描器角色 (Pure Scanner)**：
   - 本階段【嚴禁】向使用者提出任何詢問或開啟對話。
   - 所有工作必須在背景完成檔案讀寫與 `.specengine/sdd/` 佇列初始化。
2. **零腦補原則 (Zero Hallucination)**：
   - 需求未提及的商業邏輯與邊界，【絕對不可】自行代為決定。
   - 確定事項進入模組矩陣與 `erm.dbml`，不確定事項一律推入 `.specengine/sdd/` 多選題佇列。
3. **歷史去重防範 (Anti-Duplicate Check)**：
   - 在建立新的多選題前，必須掃描 `.specengine/sdd/resolved/data/` 與 `.specengine/sdd/resolved/features/`。
   - 若問題已在 `resolved/` 歷史記錄中決策完成，絕不重複發問。
4. **模組識別與命名空間隔離 (Module Namespacing)**：
   - 每次冷啟動必須先從需求中提煉出唯一的 `MODULE_ID`（全大寫 SNAKE_CASE，例如 `POINTS_REDEMPTION`）。
   - 所有本次產出的矩陣檔、總覽檔皆以此 `MODULE_ID` 命名，嚴禁寫入或覆蓋其他模組的矩陣檔，確保多位使用者同時對不同模組執行 `spec 01` 時不會互相覆寫。
   - `.specengine/spec/erm.dbml`、`.specengine/spec/terms.md`、`.specengine/spec/policy-defaults.md` 為跨模組共用之單一真實來源，本規則不適用（這三者本來就該全域共用，允許增量擴充）。

---

# 輸入 (Inputs)
1. 原始需求文字 (`<raw_requirement>`) 或 `.specengine/spec/` 舊規格
2. 現有 `.specengine/spec/terms.md`（若存在）
3. 現有 `.specengine/spec/policy-defaults.md`（組織慣例字典，若存在）
4. 歷史決策紀錄 `.specengine/sdd/resolved/`（若存在）
5. `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 之 `version` 欄位（範本版本號）
6. `.claude/spec/architecture-manifest.md`（第 3 節命名語法規範，供 `erm.dbml` 之 Table/Column 命名對齊；本專案 Database Tables & Columns 為 `PascalCase`，見該節說明）

---

# 執行步驟與檔案操作

## Step 0: 鎖定核心業務切片 (Core Business Slice) 與模組識別

1. **模組識別**：從需求中提煉 `MODULE_ID`。若 `.specengine/sdd/overview.md` 全域索引中已存在同名模組且狀態非 `DEPRECATED`，視為對既有模組的增量擴充，不建立新模組。
2. **主幹 Flow**：完成該業務目標的最簡 Happy Path（不含任何例外與邊界），作為 `.specengine/sdd/matrix/<MODULE_ID>.json` 的第 0 號 Rule。
3. **骨架 Schema**：支撐此最簡 Flow 運作的最小 Table & 外鍵關係 (FK)，作為 `.specengine/spec/erm.dbml` 的基礎架構。

所有 Step 2 掃出的邊界問題（小數點、併發、重複取消），必須全部「掛載」在此核心業務切片的特定節點上。

---

## Step 1: 雙軌矩陣與 DBML 草稿冷啟動

1. **行為矩陣抽取 (`.specengine/sdd/matrix/<MODULE_ID>.json`)**：
   - 解析需求中 100% 確定的行為，拆解為 `rules` (Happy Path / Edge Cases)。
   - 填寫槽位：`rule_id`, `type`, `actor`, `pre_conditions`, `trigger_event`, `post_assertions`。
   - 檔案頂層必須包含 `"spec_engine_version"` 欄位，值取自 `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 之 `version` 欄位。
2. **資料模型草稿 (`.specengine/spec/erm.dbml`)**：
   - 提取需求涉及的實體與屬性，Table/Column 命名依 `architecture-manifest.md` 第 3 節宣告之規範（本專案為 `PascalCase`）。
   - 若 `.specengine/spec/erm.dbml` 不存在則建立 Initial Draft；若存在則增量擴充 Table/Column/Type 與 `note`。

---

## Step 2: 套用組織慣例，再以高風險工程探測清單掃描剩餘盲點

1. **優先套用既有慣例**：讀取 `.specengine/spec/policy-defaults.md`。針對每一類潛在盲點，先檢查是否已有命中的慣例條目：
   - 若命中，直接依該慣例決策寫入矩陣與 `erm.dbml`，**不建立 MCQ**，並將該慣例條目的「套用次數」+1。
   - 若未命中，才進入以下探測清單掃描。
2. **高風險工程探測清單**：Read `references/devil-probes.md`，取得 5 個高風險工程維度的完整檢查清單，逐一針對需求執行「極限壓力測試」，找出隱含缺失。

---

## Step 3: 多選題 (MCQ) 包裝與 `.specengine/sdd/` 佇列落盤

針對 Step 2 未被既有慣例覆蓋的每一個盲點，Read `references/mcq-file-format.md`，依其定義的選項品質規範、可複用慣例候選判定邏輯與統一問題檔案格式，將其封裝為**具備真實工程 Trade-off 的多選題**：

1. **建立獨立問題檔**：
   - 資料模型類 ➔ `.specengine/sdd/data/<Entity>_<問題摘要>.md`
   - 流程行為類 ➔ `.specengine/sdd/features/<Feature>_<問題摘要>.md`
2. **產出模組總覽文件 (`.specengine/sdd/overview/<MODULE_ID>.md`)**：
   - 彙整當前模組問題統計（資料數 / 功能數）。
   - 依優先級排序，提供建議的提問順序策略（先核心資料模型，後邊界行為）。
   - 列出本輪自動套用的既有慣例清單（來源慣例 ID + 套用位置）。
3. **附加更新全域索引 (`.specengine/sdd/overview.md`)**：
   - 僅新增或更新本模組對應的那一列（狀態、待釐清數、範本版本），不改動其他模組的列。
   - **狀態欄寫回（見 CLAUDE.md 第 4.2 節「模組階段狀態機」）**：本輪掃描結束後，若 `.specengine/sdd/` 佇列（`data/`、`features/`）中該模組仍有 High/Medium 未決問題，寫入 `CLARIFYING`；若本輪套用既有慣例後佇列剛好淨空（無需任何 MCQ），直接寫入 `CLARIFIED`。新增列時 `範本版本` 欄填入 `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 之 `version` 當前值。

---

# 完成條件

- [ ] `MODULE_ID` 已鎖定，核心業務切片（最簡 Happy Path + 核心 FK Schema）已完成
- [ ] `.specengine/sdd/matrix/<MODULE_ID>.json` 已產出，含 `spec_engine_version` 欄位
- [ ] `.specengine/spec/erm.dbml` 已更新（新建或增量擴充）
- [ ] 已比對 `.specengine/spec/policy-defaults.md`，命中的慣例已直接套用、未重複發問
- [ ] Step 2 未被慣例覆蓋的盲點，皆已轉為符合格式的 MCQ 問題檔並去重
- [ ] `.specengine/sdd/overview/<MODULE_ID>.md` 與 `.specengine/sdd/overview.md` 已更新，狀態欄已依佇列現況寫入 `CLARIFYING` 或 `CLARIFIED`
- [ ] 全程未向使用者提出任何詢問

# 輸出彙報合約 (Terminal Output)

執行完畢後，在 Terminal 印出簡潔摘要：

```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：<MODULE_ID>

1. 業務切片與雙軌產出概況：
   - 核心業務切片 (Core Business Slice)：已鎖定最簡貫穿 Happy Path 與核心 FK Schema
   - 行為矩陣：.specengine/sdd/matrix/<MODULE_ID>.json (共 X 條確定 Rules)
   - 資料模型：.specengine/spec/erm.dbml (共 Y 個 Tables 草稿)

2. 組織慣例套用概況：
   - 自動套用既有慣例：N 項（無需發問，見 .specengine/spec/policy-defaults.md）

3. .specengine/sdd/ 盲點佇列初始化：
   - 待釐清總數：Z 項
   - 優先級分佈：High (A) | Medium (B) | Low (C)
   - 可複用慣例候選：M 項

4. 模組階段狀態：<CLARIFYING | CLARIFIED>（已寫回 .specengine/sdd/overview.md）
```

```text
[SpecEngine] spec-01 進度：Step 3 / 3 — 已完成，MODULE_ID=<MODULE_ID>
```