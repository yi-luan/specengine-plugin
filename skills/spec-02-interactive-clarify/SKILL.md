---
name: spec-02-interactive-clarify
description: 當使用者輸入 /spec-02 [MODULE_ID]、/spec-run，或說「釐清」「回答問題」「繼續問我」時使用。把 .specengine/sdd/ 佇列裡的未決問題以白話選擇題分組詢問使用者（優先用 AskUserQuestion 工具），每題答完立即把決策寫回行為矩陣、刻意不做清單或 .specengine/spec/。未答的題一律掛起為 PARKED。
---

# 目標

消滅佇列中的未知槽位。透過白話轉譯降低提問負擔，引導使用者做工程／業務 Trade-off 決策，並依決策性質分別寫回矩陣（行為）、`exclusions.md`（刻意不做）、`erm.dbml`（資料）、`terms.md`（術語與固定文案）。具跨模組複用價值的決策晉升至 `policy-defaults.md`。所有檔案格式依 `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md` 第 5 節。

---

## Step 0: 模組解析

1. 執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --json`。
2. 使用者已附帶 `MODULE_ID` → 直接鎖定。
3. 未附帶：`pending > 0` 的模組僅一個 → 自動鎖定；兩個以上 → 列出候選請使用者指定。
4. 本輪讀寫僅限本模組的 `matrix/`、`overview/` 與問題檔，以及跨模組共用的 `.specengine/spec/`。

## Step 1: 載入佇列、術語、分組

1. 載入 `overview/<MODULE_ID>.md` 與 `data/`、`features/` 中屬於本模組的問題檔。
2. 讀 `terms.md` 與 `erm.dbml`，建立「技術欄位 ↔ 領域白話」對照。
3. **分組規則（固定優先序）**：先依問題檔的「定位」分組（同一 Entity 或同一 Rule 一組），每組最多 4 題；再依各組內最高優先級排組的先後（含 High 的組先）；同組內 High 排前。定位交疊的題歸入它主要影響的那一組。

## Step 2: 白話轉譯與提問

印出前把技術術語轉成領域中文，用詞與 `terms.md` 一致。

**提問工具**：有 AskUserQuestion 工具時【必須】用它，一次送出一組，每題選項對應 A／B／C，另加「其他」。沒有該工具時用終端機文字一次印一組：

```text
====================================================================
❓ [模組：<MODULE_ID>] [第 X～Y / 共 N 題] [定位：<Entity 或 Rule ID>]
--------------------------------------------------------------------
Q1（High）<白話問題標題>
  影響：<影響哪些實體、API 或測試>
  [A] <白話選項 A>  [B] <白話選項 B>  [C] <白話選項 C>  [Short] 自訂（<=5 字）
====================================================================
請依序回答（例如「1A 2B 3短:拒絕」），或輸入 'stop' 把剩餘題目掛起。
```

只有 1 題時標題寫「[第 X / 共 N 題]」。

**不代答（硬性約束）**：必須真的等到使用者這一輪的實際輸入才處理答案。【絕對禁止】替使用者選或假設答案。即使被 `spec-run` 委派呼叫也一樣。

## Step 3: 回答驗證與掛起

- **正常回答**：驗證每題為合法選項或簡答，含糊的題要求重答。使用者附帶的補充文字（例如錯誤訊息文案）一併記錄。
- **掛起**：使用者輸入 `stop`、`done`、`exit`、`proceed`，或明確表示「先這樣」→ 剩餘所有未答題（含 Low）移到 `parked/`，問題檔底部追加 `# 掛起原因：使用者於 <時間> 延後`。沒有「Deferred」：題目只有「答了」或「掛起」兩種結局。
- 這只結束本階段，不代表中止整條 `spec-run`。

## Step 4: 原子化更新

每組答案被接受後**立即**對每一題執行以下操作：

1. **依決策性質寫回**（一題可能同時命中多類）：
   - **行為類**（有人做了什麼 → 系統發生什麼）→ 矩陣新增 Rule（`type: edge_case`）或修改既有 Rule 的 `pre_conditions`／`post_assertions`。被決策新增或修改的 Rule 加 `resolved_by`（字串；多個來源用陣列）。使用者的補充文字若能改寫為條件或結果，直接編進對應欄位。
   - **刻意不做類**（系統無動作、不提供功能、屬其他模組）→ `.specengine/spec/exclusions.md` 新增一列，**不進矩陣**。
   - **資料類** → `erm.dbml`（型別、note、約束）。
   - **命名與固定文案** → `terms.md`（術語表或固定文案節）。
   - 原則：**取代而非矛盾累加**。
2. **驗證**：`node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`（驗矩陣結構）。
3. **歸檔**：問題檔底部追加決策記錄後移至 `resolved/data/` 或 `resolved/features/`。
   ```markdown
   ---
   # 最終決策
   - **決策選項**：<選項與內容，含使用者補充文字>
   - **寫回位置**：<矩陣 Rule ID / exclusions ID / erm.dbml 欄位 / terms.md 條目>
   - **時間戳**：<YYYY-MM-DD HH:mm，取自 date 指令>
   ```
4. **更新快取**：`overview/<MODULE_ID>.md` 移除該項並更新統計；`overview.md` 本模組列的待答／已解決數字。狀態欄在中途維持不動，只在佇列清空時依 `spec-status.js` 改為 `CLARIFIED`。
5. **慣例晉升**（問題檔標記「可複用慣例候選：Yes」）：依第 5.3 節格式追加 `POLICY-<序號>`，一題一條，抽象到跨模組仍成立；已有語義相近條目則更新而非新增。

## Step 5: 小模組的精簡流程確認

佇列清空後，若矩陣 Rule 少於 4 條且無分支，不另跑 `spec flow-align`：在完成彙報裡逐條白話複述所有 Rule 與本模組的 exclusions，問使用者「有沒有漏」，真實等待。確認無缺口 → 依第 5.5 節格式寫 `flow-design/<MODULE_ID>.md`，狀態行寫「狀態：已通過」，註明「小模組精簡確認」；有缺口 → 包成 MCQ 推回佇列。超過門檻時不走此路徑。

---

# 完成條件

- [ ] 佇列已清空（全部答完或掛起），`spec-status.js` 顯示 `pending: 0`
- [ ] 每題已依性質寫回、歸檔、更新快取
- [ ] 矩陣通過 lint
- [ ] 符合資格的決策已晉升
- [ ] 小模組已完成精簡確認並寫入索引，或已註明需走 `spec flow-align`

# Step 6: 完成彙報

```text
[Phase 02: Interactive Clarify] 執行完成！模組：<MODULE_ID>

決策：已解決 X 項 ｜ 掛起 Y 項 ｜ 晉升慣例 N 項
寫回：matrix（+R 新增／M 修改）｜ exclusions（+E）｜ erm.dbml（Z 欄異動）｜ terms.md（+T 術語、+F 文案）
階段：CLARIFIED ｜ 下一步：<spec flow-align ｜ spec 03（已完成精簡確認）>
```
