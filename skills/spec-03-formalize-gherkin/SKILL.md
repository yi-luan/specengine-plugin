---
name: spec-03-formalize-gherkin
description: 當使用者輸入 /spec-03 [MODULE_ID]、/spec-run，或說「形式化」「產生 feature 檔」「寫 Gherkin」時使用。把已釐清並通過流程對齊的模組矩陣形式化為 Gherkin，逐列核對 Examples 可由矩陣推導，產出 .specengine/spec/features/*.feature，並以 feature-lint.js 實際驗證。
---

# 目標

將消滅歧義後的行為矩陣，轉譯為低維護成本、100% 符合 Cucumber 語法的 Gherkin 特性檔。`exclusions.md` 的條目不產生 Scenario。PARKED 議題轉為註解。

---

# 硬性約束

1. **句型正規化與複用**：寫任何步驟前先查 `.specengine/sdd/steps-index.json`（feature-lint 產出的既有句型索引），能沿用的一律沿用。索引不存在時先執行一次 lint 產生。
2. **雙引號參數化**：變數一律 `""` 包裹，Step 以 `{string}` 接收。
3. **確定性格式**：2 空格縮排，檔尾單一換行，Rule 依 `@rule:` ID 字典序。
4. **邊界表格化**：同一 Rule 2 個以上相似數值邊界時用 `Scenario Outline` + `Examples`。
5. **Examples 必須可由矩陣推導（contract-rules 第 3.5 節）**：每一列的輸入值與期望結果都要能從該 Rule 的 `pre_conditions`／`post_assertions` 唯一推出。這次實測的瑕疵正是一列 Examples 與矩陣優先序矛盾，到 spec-05 才被抓到。
6. **固定文案逐字沿用**：Then 步驟裡的錯誤訊息等文字必須與 `terms.md` 固定文案節逐字一致。
7. **Rule ID 以 tag 掛載**：每個 `Rule:` 正上方 `@rule:R-XXXX`。
8. **純淨落盤，實際驗證**：落盤後【必須】執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`，非 0 則修正重跑。lint 會比對矩陣 Rule 與 tag 一一對應，不可為了過 lint 去改矩陣。

---

# 執行步驟

## Step 0: 模組解析

`node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --json`：未指定且多個模組 `next` 為 `spec 03` 時請使用者指定；該模組 `flowAligned` 必須為 true，否則拒絕執行。

## Step 1: 載入來源

1. `matrix/<MODULE_ID>.json`（含 spec-02 寫回的 Rule）
2. `parked/` 中屬於本模組的議題
3. `terms.md`（術語與固定文案）、`policy-defaults.md`、`exclusions.md`（確認哪些不該出現）、`steps-index.json`

## Step 2: 句型與參數對齊

同義異詞統一為 `terms.md` 術語；可變參數包雙引號；錯誤訊息用固定文案。

## Step 3: 結構編譯

Read `references/gherkin-structure-example.md`，依其結構與排序規則轉譯。

## Step 3b: Examples 逐列核對

對每個 Scenario 與每列 Examples：
1. 把輸入值代入該 Rule 的 `pre_conditions`，確認條件成立（例如「未超過餘額但超過訂單金額」要同時檢查兩個條件）。
2. 由 `post_assertions` 推出期望結果，與 Then 寫的值逐字比對。
3. 若有多條 Rule 有優先序（例如「兩者皆超過以餘額為準」），確認該列落在正確的那條。
4. 核對不過的列當場修正。在彙報記「核對 N 列，修正 M 列」。

## Step 4: 落盤、驗證、寫回狀態

1. 寫入 `.specengine/spec/features/<繁體中文模組名稱>.feature`。
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`，有違規逐項修正後重跑。
3. 通過後 `overview.md` 本模組狀態 `CLARIFIED` → `FORMALIZED`。

---

# 完成條件

- [ ] `.feature` 已落盤，檔名為繁體中文模組名稱
- [ ] 句型對齊索引與 `terms.md`，固定文案逐字一致
- [ ] 每列 Examples 已逐列核對
- [ ] `exclusions.md` 條目未出現為 Scenario
- [ ] lint exit code 為 0
- [ ] 狀態欄已寫為 `FORMALIZED`

# 完成彙報

```text
[Phase 03: Formalize Gherkin] 執行完成！模組：<MODULE_ID>
產出：.specengine/spec/features/<模組名稱>.feature
指標：Rule X 條 ｜ Scenario/Outline Y 個（展開 Z）｜ 句型 S 個（沿用 R 個）｜ PARKED 註解 P 個
Examples 核對：N 列，修正 M 列 ｜ feature-lint → PASS
階段：FORMALIZED
```
