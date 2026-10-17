---
name: spec-01-discovery-bootstrap
description: 當使用者輸入 /spec-01 [path]、/spec-run，或說「冷啟動」「掃需求」「幫我分析這個需求」時使用。對新需求靜態掃描：鎖定核心業務切片、抽取行為矩陣與 DBML 草稿、初始化術語表、套用既有組織慣例、以高風險探測清單找盲點並轉成 MCQ 佇列。純掃描器角色，唯一允許問的是「這屬於哪個模組」。
---

# 目標

靜態掃描原始需求與現有 `.specengine/spec/`，零腦補地解構為核心業務切片、行為矩陣、DBML 草稿與術語表。先比對 `policy-defaults.md` 自動套用既有慣例，剩下無法套用的盲點才轉成 MCQ 推入佇列。

# 硬性約束

1. **純掃描器**：不向使用者提問，唯一例外是需求無法唯一對應到一個 `MODULE_ID` 時可以問一題。其餘一律落盤成 MCQ。
2. **零腦補**：需求未提及的邏輯與邊界【絕對不可】自行決定。確定事項進矩陣與 `erm.dbml`，不確定事項進 MCQ 佇列。
3. **歷史去重**：建立 MCQ 前掃描 `resolved/` 與 `parked/`，已決策或已掛起的問題不重複發問。
4. **模組命名空間**：`MODULE_ID` 為全大寫 SNAKE_CASE。`erm.dbml`、`terms.md`、`policy-defaults.md`、`exclusions.md` 為跨模組共用，允許增量擴充。
5. **格式依 contract-rules**：矩陣結構（第 1.6 節）、DBML（第 2 節）、terms.md（第 5.2 節）、exclusions.md（第 5.4 節）、overview.md（第 5.1 節）皆依 `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md`，不自創格式。落盤後執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"` 驗矩陣結構，未通過不得進入完成彙報。

---

# 輸入

1. 原始需求文字或檔案
2. `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md`（必讀，格式依據）
3. `.specengine/spec/terms.md`、`policy-defaults.md`、`exclusions.md`、`erm.dbml`（若存在）
4. `.specengine/sdd/resolved/`、`parked/`（若存在）
5. `.claude/spec/architecture-manifest.md` 第 3 節命名規範；待確認時依 contract-rules 第 2.4 節 fallback
6. 探測清單：專案 `.specengine/probes.md` 優先，否則 `references/devil-probes.md`
7. `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 的 `version`

---

# 執行步驟

## Step 0: 鎖定核心業務切片與模組識別

1. 從需求提煉 `MODULE_ID`。`.specengine/sdd/matrix/` 已有同名模組 → 增量擴充。無法唯一判定 → 問一題。
2. **主幹 Flow**：最簡 Happy Path，作為 `R-<MODULE_ID>-000`，`type: main_flow`。
3. **骨架 Schema**：支撐主幹的最小 Table 與 FK。

## Step 1: 矩陣、DBML、術語表

1. **`.specengine/sdd/matrix/<MODULE_ID>.json`**：100% 確定的行為拆成 `rules`，每條 `type` 為 `main_flow` 或 `edge_case`。需求明寫「不做 X」「不支援 Y」的，**不進矩陣**，記入 `exclusions.md`（類型「不提供功能」）。
2. **`.specengine/spec/erm.dbml`**：實體與屬性，依 contract-rules 第 2 節（每欄 note、底部 Ref、status 枚舉、命名 fallback）。
3. **`.specengine/spec/terms.md`**：不存在則建立；收錄需求中出現的領域名詞與其對應欄位。spec-02 的白話轉譯依賴此檔。

## Step 2: 套用慣例，再掃盲點

1. 讀 `policy-defaults.md`。每類潛在盲點先查是否命中慣例：命中則直接寫入矩陣或 dbml，**不建 MCQ**，並在模組總覽列出套用的 POLICY ID。
2. 讀探測清單，逐維度壓力測試。

## Step 3: MCQ 包裝與落盤

1. 依 `references/mcq-file-format.md` 建檔：資料模型類 → `data/`，流程行為類 → `features/`。「定位」含 `MODULE_ID`，「來源」填 `spec-01`。
2. **`.specengine/sdd/overview/<MODULE_ID>.md`**：問題統計、建議提問順序、本輪套用的慣例清單。
3. **`.specengine/sdd/overview.md`**：依第 5.1 節格式新增或更新本模組列，狀態欄填 `spec-status.js` 的推導結果。
4. `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`。

---

# 完成條件

- [ ] `MODULE_ID` 已鎖定，核心切片已完成
- [ ] 矩陣已產出並通過 lint，`type` 皆為合法值
- [ ] `erm.dbml` 依第 2 節；`terms.md` 已建立或擴充
- [ ] 需求明寫的「不做」已進 `exclusions.md`
- [ ] 命中的慣例已套用，其餘盲點已轉為 MCQ 並去重
- [ ] 兩份 overview 已依格式更新
- [ ] 除模組歸屬外未向使用者提問

# 完成彙報

```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：<MODULE_ID>

矩陣：X 條 Rules ｜ erm.dbml：Y 個 Tables ｜ terms.md：N 個術語 ｜ exclusions：E 條 ｜ 套用慣例：P 項
待答：Z 題（High A ｜ Medium B ｜ Low C）
階段：<CLARIFYING ｜ CLARIFIED>
```
