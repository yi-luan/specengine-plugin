---
name: spec-02-interactive-clarify
description: 當使用者輸入 /spec-02 [MODULE_ID]、/spec-run,或說「釐清」「回答問題」「繼續問我」時使用，對某模組進行互動釐清——把 .specengine/sdd/ 佇列裡的未決問題以白話 MCQ 選擇題逐一詢問使用者，並將決策原子化寫回 .specengine/spec/。
---

# 目標
消滅 `.specengine/sdd/` 佇列中的未知槽位。透過「白話轉譯」降低提問認知負擔，引導使用者進行工程/業務 Trade-off 決策，並將答案原子化整合至 `.specengine/spec/erm.dbml` 與 `.specengine/spec/terms.md` 中；若決策具跨模組複用價值，同步晉升至 `.specengine/spec/policy-defaults.md`。

---

## Step 0: 模組解析 (Module Resolution)

1. 讀取 `.specengine/sdd/overview.md` 全域索引。
2. 若使用者輸入 `spec 02` 時已附帶模組名稱（例如 `spec 02 POINTS_REDEMPTION`），直接鎖定該模組。
3. 若未附帶模組名稱：
   - 若全域索引中僅有 1 個模組處於 `CLARIFYING` 狀態（含舊值 `DISCOVERY`，依 CLAUDE.md 第 4.2 節「舊值相容」視同 `CLARIFYING`），自動鎖定該模組。
   - 若有 2 個以上模組同時待釐清，【必須】先列出候選模組清單向使用者提問「請指定要繼續釐清哪一個模組」，嚴禁自行猜測或合併處理。
4. 鎖定模組後，本輪所有讀寫僅限於 `.specengine/sdd/overview/<MODULE_ID>.md`、`.specengine/sdd/matrix/<MODULE_ID>.json` 及其下轄的問題檔，不觸碰其他模組的檔案。

---

## Step 1: 佇列載入與術語準備

1. **讀取佇列**：載入 `.specengine/sdd/overview/<MODULE_ID>.md`，挑選優先級最高（High 優先）且無未解依賴的問題。
2. **載入術語字典**：讀取 `.specengine/spec/terms.md` 與 `.specengine/spec/erm.dbml`，建立「技術欄位 ↔ 領域白話用詞」對照表（例如：`points_balance` ➔ `點數餘額`）。

---

## Step 2: 題目白話轉譯與 CLI 呈現

在將選項印出至 Terminal 前，必須執行**白話化翻譯**：
- 將英文欄位與程式術語（如 `null`, `>=`, `cascade`）轉換為領域中文（如「空白」、「大於等於」、「連帶刪除」）。
- 嚴禁自行發明術語，必須與 `.specengine/spec/terms.md` 保持 100% 用詞一致。

**單題單回合原則（Hard Constraint）**：每次只印出一題並停在等待使用者輸入的狀態，【絕對禁止】在同一次回應內連續列印多題或替使用者代答——即使是被 `spec-run` 委派呼叫、或推測使用者接下來的答案，也必須真的等到使用者這一輪的實際輸入之後，才能進入下一題。這是「零腦補」原則在本階段的具體體現，不因呼叫方是人類或另一個 Skill 而放寬。

**Terminal 印出格式：**

```text
====================================================================
❓ [模組：<MODULE_ID>] [釐清進度：第 X / 總 Y 題] [優先級：High/Medium/Low]
標題：<白話化問題標題>
📍 定位：<指向 Entity.Attribute 或 Rule ID>
🎯 影響範圍：<說明此決策影響哪些實體、API 或測試案例>
--------------------------------------------------------------------
  [A] <白話選項 A>
  [B] <白話選項 B>
  [C] <白話選項 C> (若有)
  [Short] 輸入自訂簡答 (<=5 字)
====================================================================
請輸入選項 (A/B/C 或自訂文字，輸入 'stop' 可隨時結束)：
```

---

## Step 3: 回答驗證與優雅終止

- **正常回答**：驗證輸入是否為合法選項 (A/B/C) 或 Short 簡答。若回答含糊，要求立即重答。
- **終止觸發**：若使用者輸入 `stop`, `done`, `exit` 或 `proceed`，立即中斷本階段的 MCQ 迴圈，將剩餘未處理問題標記為 `Deferred`，直接進入 Step 5 完成回報。
- **範圍限定**：這裡的 `stop`/`done`/`exit`/`proceed` 只結束「本階段的問答迴圈」，本階段仍視為正常完成（進入 Step 5），不是要求中止整條 `spec-run` 串接。若使用者的意圖是要中止整個多階段流程（而不只是跳過剩餘問題），那是 `spec-run` 層級的終止語意，由呼叫方（`spec-run`）自行判斷使用者這句話指向的是哪一層，本階段不負責分辨。

---

## Step 4: 三向原子化更新 (Atomic Persistence)

每次答案被接受後，**必須同時執行以下 4 項檔案操作**（第 4 項僅在該問題標記為可複用慣例候選時觸發）：

1. **覆寫 Single Source of Truth (`.specengine/spec/`)**：
   - 資料模型問題（`.specengine/sdd/data/*.md`）➔ 更新 `.specengine/spec/erm.dbml`（更新欄位型別、`note` 註解或約束條件）。
   - 流程行為問題（`.specengine/sdd/features/*.md`）➔ 同樣寫入 `.specengine/spec/erm.dbml`，作為該決策所涉及欄位/表格的 `note` 補充說明（本專案目前沒有獨立的「行為規格」檔案，行為類決策一律以 Note 形式掛在最相關的資料表上，並在 Note 中引用 `.specengine/sdd/resolved/features/` 的決策檔路徑）。
   - 純領域命名問題（如「這個欄位中文該怎麼稱呼」，不涉及約束或行為）➔ 更新 `.specengine/spec/terms.md`。
   - **更新原則**：【取代而非矛盾累加】。若決策否定了先前的模糊陳述，直接覆寫取代，絕不保留互相矛盾的文字。
2. **寫入 Audit Log 並歸檔**：
   - 在該問題檔（`.specengine/sdd/data/*.md` 或 `.specengine/sdd/features/*.md`）底部追加解決記錄：
     ```markdown
     ---
     # 最終決策 (Resolution Log)
     - **決策選項**：<使用者選擇的選項與內容>
     - **更新檔案**：<更新的 .specengine/spec/ 檔案路徑>
     - **時間戳**：<YYYY-MM-DD HH:mm>
     ```
   - 將該檔案移動至 `.specengine/sdd/resolved/data/` 或 `.specengine/sdd/resolved/features/`。
3. **更新狀態機**：
   - `.specengine/sdd/overview/<MODULE_ID>.md`：從待處理清單中移除該項目，更新 Resolved 數量統計。
   - `.specengine/sdd/overview.md`（全域索引）：更新本模組對應那一列的統計數字。
   - **狀態欄寫回（見 CLAUDE.md 第 4.2 節）**：當本模組所有 High/Medium 問題皆已 Resolved 或 Deferred（含使用者以 `stop`/`done`/`exit`/`proceed` 觸發本階段優雅終止、剩餘題目標記 `Deferred` 的路徑）時，將狀態欄由 `CLARIFYING` 改寫為 `CLARIFIED`；若仍有未處理的 High/Medium 問題，維持 `CLARIFYING` 不動。
4. **可複用慣例晉升 (Policy Promotion)**：
   - 若該問題檔標記「可複用慣例候選 (Reusable Policy Candidate): Yes」，依 `.specengine/spec/policy-defaults.md` 的條目格式，將此次決策追加為一條新的 `POLICY-<序號>` 條目（「首次決策來源」填入本模組 ID 與已歸檔路徑，「套用次數」初始為 0）。
   - 若 `.specengine/spec/policy-defaults.md` 中已存在語義相近的條目，優先更新既有條目而非新增重複條目。

---

# 完成條件

- [ ] 所有 High/Medium 優先級問題皆已釐清或標記 `Deferred`
- [ ] 每個已解決問題皆完成三向原子化更新（`.specengine/spec/` 覆寫、Audit Log 歸檔、狀態機更新）
- [ ] 符合資格的決策已晉升或合併至 `.specengine/spec/policy-defaults.md`
- [ ] `.specengine/sdd/overview/<MODULE_ID>.md` 與 `.specengine/sdd/overview.md` 統計數字已同步
- [ ] 若所有 High/Medium 問題皆已 Resolved/Deferred，`.specengine/sdd/overview.md` 狀態欄已由 `CLARIFYING` 改寫為 `CLARIFIED`

# Step 5: 完成彙報 (Completion Report)

當所有 High/Medium 問題釐清完畢或觸發終止時，在 Terminal 輸出摘要：

```text
🎉 [Phase 02: Interactive Clarify] 執行完成！模組：<MODULE_ID>

1. 決策統計：
   - 已解決 (Resolved)：X 項
   - 已延後 (Deferred)：Y 項
   - 晉升為組織慣例 (Promoted to Policy)：N 項

2. 規格檔更新摘要：
   - .specengine/spec/erm.dbml (已更新 Z 個欄位約束與註解)
   - .specengine/spec/terms.md (已新增 N 個領域術語)
   - .specengine/spec/policy-defaults.md (已新增/更新 N 個慣例條目)

👉 所有確定決策已歸檔至 `.specengine/sdd/resolved/`。

3. 模組階段狀態：<CLARIFYING | CLARIFIED>（已寫回 .specengine/sdd/overview.md）

4. 下一關卡（僅當狀態為 CLARIFIED 時適用）：本模組尚未通過流程圖對齊（`.specengine/sdd/flow-design/<MODULE_ID>.md` 尚不存在），下一階段為 `spec-flow-align`，並非直接進入 `spec-03`。
```

```text
[SpecEngine] spec-02 進度：Step 5 / 5 — 已完成，模組：<MODULE_ID>
```