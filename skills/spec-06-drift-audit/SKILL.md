---
name: spec-06-drift-audit
description: 當使用者輸入 /spec-06，或說「巡檢」「規格漂移」「檢查跟現實有沒有脫鉤」時使用。比對 .specengine/spec/erm.dbml 與實際資料庫 Schema、比對 Rule 覆蓋率與測試結果，找出漂移並推入佇列。純唯讀巡檢，不自動修正任一邊。不屬於 spec-run 串接範圍。
---

# 目標

spec 01~05 是單向流程：規格 → 程式碼。上線後常見程式碼因 hotfix 偷偷脫鉤，或 DB 被手動改過沒回寫 `erm.dbml`。本階段是唯一的反向巡檢，定期執行找出落差並提報，**絕不自動修正**：漂移是未界定狀態，必須由人決定「現實對、規格該更新」還是「規格對、程式碼該修」。

---

# 硬性約束

1. **零自動修復**：落差只寫入 `.specengine/sdd/data/` 或 `features/` 作為新問題，嚴禁改 `erm.dbml`、`.feature` 或產品代碼。
2. **只讀巡檢**：對 `.specengine/spec/`、產品代碼、測試目錄皆只讀，唯一寫入目標是 `.specengine/sdd/`。
3. **冪等**：重複執行若落差未變，不產生重複問題檔（比對 `resolved/` 與現有 `data/`、`features/`）。

---

# 輸入

1. `.specengine/spec/erm.dbml`
2. 實際持久化層 Schema：依 manifest 第 5 節 `Schema Introspection Command` 取得；若該欄位為〔待確認〕，在彙報中提示並略過 Step 1。
3. `.specengine/sdd/matrix/*.json` 全部模組的 `rule_id`
4. `.specengine/spec/features/*.feature` 的 `@rule:` tag
5. 最近一次測試報告：manifest 第 5 節 `Test Report Path` 指向的 JSON／JUnit 檔。報告中每個 Scenario 帶有 `@rule:R-XXXX` tag，覆蓋率直接從報告統計，不比對文字。報告不存在時先執行 `Test Execution Command` 產生。

---

# 執行步驟

## Step 0: lock 比對（規格與句型是否被事後偷改）

執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" audit`。它會拿每個 IMPLEMENTED 模組的 `.specengine/sdd/locks/<ID>.lock.json` 與現況比對 feature 雜湊、Step 句型、Driver 介面。有差異即為 `LOCK_DRIFT`：這些改動沒走過 spec 02～05。每個有 drift 的模組建一個問題檔 `.specengine/sdd/features/<ID>_drift_LOCK_DRIFT.md`，選項固定：

- `A.` 改動是合法的規格變更，重跑對應階段後重新 lock
- `B.` 改動不該發生，回滾到 lock 的版本
- `Short` 自訂

## Step 1: 資料模型漂移

1. 解析 `erm.dbml` 的 Table／Column／Type／約束。
2. 取得實際 Schema。
3. 逐一比對：現實有但 dbml 未記載 → `UNDOCUMENTED_COLUMN`；dbml 有但現實已移除 → `MISSING_COLUMN`；型別或約束不一致 → `TYPE_MISMATCH`。
4. 每項落差建 `.specengine/sdd/data/<Entity>_drift_<類型>.md`，沿用 MCQ 格式，選項固定：
   - `A.` 現實為準，更新 `erm.dbml`
   - `B.` 規格為準，需修正程式碼／Schema
   - `Short` 自訂

## Step 2: Rule 覆蓋率

1. 彙整所有矩陣的 `rule_id`。
2. 從 `.feature` 抓出所有 `@rule:` tag；從測試報告抓出每個 Scenario 的 tag 與結果。
3. 三方比對：矩陣有但 `.feature` 無 → `MISSING_FORMALIZATION`；`.feature` 有但報告中無任何該 tag 的 Scenario → `NOT_EXECUTED`；報告中該 tag 有 FAIL → `COVERAGE_REGRESSION`。
4. 彙整進報告。僅當模組狀態為 `IMPLEMENTED` 卻 `COVERAGE_REGRESSION` 時，視為嚴重落差，依 Step 1 格式建問題檔。

## Step 3: 巡檢紀錄

在 `.specengine/sdd/overview.md` 下方附加一個巡檢紀錄區塊（不覆蓋模組列）：時間、發現落差數、去重後新建問題數。

---

# 完成條件

- [ ] `spec-guard.js audit` 已執行，LOCK_DRIFT 已建問題檔
- [ ] `erm.dbml` 已與實際 Schema 逐欄比對（或已提示 introspection 指令未填）
- [ ] 新落差已建檔並去重
- [ ] `rule_id` 已與 `.feature` 與測試結果交叉比對
- [ ] 巡檢紀錄已附加
- [ ] 全程唯讀，未自動修正

# 完成彙報

```text
[Phase 06: Drift Audit] 執行完成！

0. lock 比對：IMPLEMENTED 模組 N 個 ｜ LOCK_DRIFT M 個（<模組清單>）
1. 資料模型漂移：比對 Table X 個 ｜ 落差 Y 項（UNDOCUMENTED a ｜ MISSING b ｜ TYPE_MISMATCH c）｜ 新建問題檔 Z 項（已去重）
2. Rule 覆蓋率（來源：<Test Report Path>）：矩陣 Rule X 個 ｜ MISSING_FORMALIZATION Y ｜ NOT_EXECUTED W ｜ COVERAGE_REGRESSION Z

所有落差已推入 .specengine/sdd/ 佇列待人工決策，未修改規格或程式碼。
```
