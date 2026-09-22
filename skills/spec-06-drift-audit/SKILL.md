---
name: spec-06-drift-audit
description: 當使用者輸入 /spec-06,或說「巡檢」「規格漂移」「檢查跟現實有沒有脫鉤」時使用，比對 .specengine/spec/erm.dbml 與實際資料庫 Schema、比對 Rule 覆蓋率與測試結果找出漂移。純唯讀巡檢，不自動修正任何一邊。建議每個 Sprint 或每次上線後手動執行一次，不屬於 spec-run 的線性串接範圍。
---

# 目標
Phase 01~05 是單向流程：`.specengine/spec/` → `src/`。但正式上線後常見的情況是 `src/` 因為 hotfix、緊急上線而偷偷跟 `.specengine/spec/` 脫鉤，或是 DB 被手動改過 migration 而沒回寫 `erm.dbml`。本階段是唯一「反向巡檢」的環節，定期（建議每個 Sprint 或每次上線後）手動執行 `spec 06`，找出落差並提報，**絕不自動修正任一邊**——因為漂移本身就是一個未界定的狀態，必須交由人工決定「現實是對的、規格該更新」還是「規格是對的、程式碼該修正」。

---

# 核心行為規範 (Hard Constraints)

1. **零自動修復原則 (No Auto-Fix)**：
   - 偵測到任何落差，僅可寫入 `.specengine/sdd/data/` 或 `.specengine/sdd/features/` 作為新的待決問題，嚴禁自動覆寫 `.specengine/spec/erm.dbml`、`.feature` 或 `src/` 任何一邊來「消除」落差。
2. **只讀巡檢 (Read-Only Audit)**：
   - 本階段對 `.specengine/spec/`、`src/`、`tests/` 皆為只讀，唯一的寫入目標是 `.specengine/sdd/`。
3. **可重複執行 (Idempotent)**：
   - 重複執行本階段若落差未變，不得產生重複的問題檔（比照 Phase 01 的歷史去重防範，掃描 `.specengine/sdd/resolved/` 與現有 `.specengine/sdd/data|features/` 是否已有同一落差的追蹤中問題）。

---

# 輸入 (Inputs)
1. `.specengine/spec/erm.dbml`（單一真實來源的資料模型）
2. 實際持久化層 Schema（依 `.claude/spec/architecture-manifest.md` 宣告：本專案為 EF Core 多 Provider 並存，無單一固定 Schema 檔，需依實際部署 Provider 執行對應之 `dotnet ef dbcontext scaffold` 或直接對資料庫執行 introspection）
3. `.specengine/sdd/matrix/*.json` 之全部模組矩陣（含 `@rule` ID 清單）
4. `.specengine/spec/features/*.feature` 之 `@rule` 標籤
5. 最近一次測試 Runner 執行結果（例如 `npm test` 的報告）

---

# 執行步驟與檔案操作

## Step 1: 資料模型漂移偵測 (Schema Drift Detection)

1. 解析 `.specengine/spec/erm.dbml` 的 Table / Column / Type / 約束。
2. 解析實際持久化層 Schema（依 manifest 宣告的 ORM schema 檔案或 introspection 結果）。
3. 逐一比對：
   - Column 存在於現實但 `erm.dbml` 未記載 → 落差類型 `UNDOCUMENTED_COLUMN`。
   - Column 存在於 `erm.dbml` 但現實已移除 → 落差類型 `MISSING_COLUMN`。
   - 型別或約束不一致 → 落差類型 `TYPE_MISMATCH`。
4. 每一項落差建立 `.specengine/sdd/data/<Entity>_drift_<落差類型>.md`，格式沿用 Phase 01 的 MCQ 問題檔格式，選項固定為：
   - `A.` 現實為準，更新 `.specengine/spec/erm.dbml` 覆寫舊敘述
   - `B.` 規格為準，回報需修正 `src/`／實際 Schema
   - `Short` 自訂決策

---

## Step 2: 規則覆蓋率巡檢 (Rule Coverage Regression)

1. 彙整 `.specengine/sdd/matrix/*.json` 中所有 `rule_id`。
2. 交叉比對 `.specengine/spec/features/*.feature` 的 `@rule` 標籤與最近一次測試結果：
   - 存在於矩陣但找不到對應 `.feature` Rule 區塊 → 標記 `MISSING_FORMALIZATION`。
   - 存在對應 Scenario 但測試結果為 FAIL 或找不到執行記錄 → 標記 `COVERAGE_REGRESSION`。
3. 將結果彙整進本次巡檢報告（不逐條建立問題檔，除非該 Rule 同時被標記為模組仍在 `IMPLEMENTED` 狀態卻回歸失敗——此時視為嚴重落差，依 Step 1 格式建立問題檔）。

---

## Step 3: 彙整巡檢報告

於 `.specengine/sdd/overview.md` 全域索引下方新增一個巡檢紀錄區塊（附加寫入，不覆蓋既有模組列），內容包含本次巡檢時間、發現落差數、已存在待決問題數（去重後）。

---

# 完成條件

- [ ] `.specengine/spec/erm.dbml` 已與實際持久化層 Schema 逐欄比對
- [ ] 所有新發現落差皆已建立問題檔，且與 `.specengine/sdd/resolved/` 及既有 `.specengine/sdd/data|features/` 去重
- [ ] `.specengine/sdd/matrix/*.json` 之 `rule_id` 已與 `.feature` 標籤及最近測試結果交叉比對
- [ ] `.specengine/sdd/overview.md` 已附加本次巡檢紀錄
- [ ] 全程對 `.specengine/spec/`、`src/`、`tests/` 保持唯讀，未自動修正任何一邊

# 完成彙報 (Terminal Output)

```text
[Phase 06: Drift Audit] 執行完成！

1. 資料模型漂移：
   - 已比對 Table 數：X 個
   - 發現落差：Y 項（UNDOCUMENTED_COLUMN: a｜MISSING_COLUMN: b｜TYPE_MISMATCH: c）
   - 新建問題檔：Z 項（已去重，historical 中重複的落差未重複建檔）

2. 規則覆蓋率：
   - 矩陣 Rule 總數：X 個
   - 未形式化 (MISSING_FORMALIZATION)：Y 個
   - 覆蓋率回歸 (COVERAGE_REGRESSION)：Z 個

所有落差已推入 .specengine/sdd/ 佇列待人工決策，本階段未自動修改 .specengine/spec/ 或 src/ 任何內容。
```

```text
[SpecEngine] spec-06 進度：Step 3 / 3 — 已完成
```