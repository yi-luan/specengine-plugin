---
name: spec-change
description: 當使用者輸入 /spec-change [MODULE_ID]，或對「已完工（IMPLEMENTED，有 lock）」的模組提出需求變更（「上限改成 35%」「這條規則要改」「多加一個條件」「需求變更單」）時使用；`spec status` 顯示 CHANGING 時也由本 Skill 續跑。先用腳本把變更分成「只改參數／改既有行為／新增規則」三級，再只走該級需要的站，最後重新上鎖並檢查沒被波及的規則一字未動。未完工模組的需求調整不走本 Skill，走 spec 02。
---

# 目標

已上鎖的模組要改需求時，依變更大小走最短的合法路徑：

| 分類（腳本判定） | 意思 | 要走的站 | 停下等人 |
| :--- | :--- | :--- | :--- |
| PARAMETER | 只有數字變了，條件、動作、結果的文字結構都沒變 | 核准 → 改 Examples → 改程式 → 重新上鎖 | 1 次（核准） |
| BEHAVIOR | 既有 Rule 的條件、動作或結果改了，或刪除 Rule | 核准 → 重畫受影響的流程階段 → 受影響 Rule 重新形式化 → 補 Step／Driver → 改程式 → 重新上鎖 | 2 次（核准、流程確認） |
| NEW_RULE | 新增 Rule | 核准 → 新 Rule 跑探測清單與選擇題 → 同 BEHAVIOR | 2 次以上 |

不論哪一級，**改規格一定要使用者點頭**（核准），**改完一定要重新上鎖**。省下的是不必要的站，不是這兩件事。

`${CLAUDE_PLUGIN_ROOT}` 為 plugin 根目錄。所有輔助檔案格式見 `${CLAUDE_PLUGIN_ROOT}/docs/contract-rules.md` 第 5 節。

---

# 硬性約束

1. **現行矩陣在核准前不得動**：執行者只改 `changes/<ID>/<時間>-<slug>/proposed.matrix.json`。寫回 `matrix/<ID>.json` 一律由 `spec-change.js apply` 執行，它會檢查 change.md 已填使用者核准原文。
2. **不得自行補洞**：變更單沒有唯一決定矩陣怎麼改時（缺數字、新名詞沒定義、有兩種讀法、與既有決策衝突），一律寫成選擇題，在核准那一組一起問。不猜。
3. **分類只能往上調**：腳本判定 PARAMETER，但執行者認為影響更大（例如數字跨過 0 讓某分支從「不可能」變成「可能」、或新數字讓既有 Examples 的意圖翻轉）時，可升級為 BEHAVIOR 並在 change.md 寫明理由。【嚴禁】把腳本判定往下調。
4. **只動範圍內的 Rule**：範圍 = 矩陣有差異的 Rule ＋ 以 `classify --also` 宣告的連帶受影響 Rule。範圍外的 `.feature` Rule 區塊必須逐字不變，`close` 會用變更前的備份逐字比對。連帶受影響指「矩陣文字沒變，但 Examples 期望值會跟著變」，例如全模組常數、檢查順序、共用計算式改變。【嚴禁】為了讓 close 通過而在矩陣上做無意義的文字改動，要用 `--also`。Feature 層描述（`Feature:` 之下、第一個 Rule 之前）不屬於任何 Rule，可隨變更同步修改。
5. **一次一份變更**：同一模組已有進行中的變更時，先完成或撤回它。
6. **使用者回「你決定」**：表述細節（回歸用例選哪個數字、格式標籤遷移）可以直接決定。業務規則（會改變系統行為的選擇）要再問一次，並附上你的建議選項與理由；使用者第二次仍回「你決定」，就採用你的建議。兩種情況都在 change.md 標註「使用者委由執行者決定」。
7. **寫 proposed 的規則**：改到計算式、條件或輸入輸出欄位時，把式子與欄位寫進 pre_conditions／post_assertions 的正文，不要藏在括號說明裡，否則腳本會低估分類。介面（函式參數、回傳欄位、資料欄位）有增減時，分類至少是 BEHAVIOR，腳本判 PARAMETER 也要升級。
8. **核准後又要改矩陣**：先改 proposed、在 change.md「核准後修正」寫入使用者答案原文，再執行 `spec-change.js amend`。【嚴禁】直接改 `matrix/<ID>.json`，close 會比對現行矩陣是否等於最後核准的版本。

---

# 執行步驟

## Step 0：前置與續跑判定

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --module <ID> --json`。
   - `stage` 為 `CHANGING` → 讀 `changes` 指向的 change.md 狀態行續跑：「草稿」從 Step 3 開始（proposed 已存在就沿用）；「已核准」從 Step 5 開始，依 change.md「異動檔案」每行的步驟編號（5A.1、5A.2…）找出最後完成的子步驟往下接。`.spec-guard-snapshot.json` 的修改時間早於 `approved.json` 的 approvedAt 時，視為 5D.1 尚未執行。續跑不重跑 Step 1 的 audit。
   - `stage` 為 `IMPLEMENTED` → 繼續 Step 1。
   - 其他階段 → 本 Skill 不適用：把變更內容寫成選擇題推入 `.specengine/sdd/features/`，回報「模組尚未完工，請走 spec 02」後結束。
2. 未指定 `MODULE_ID` 且有多個 IMPLEMENTED 模組 → 依變更單內容提出候選請使用者確認，不猜。

## Step 1：基準稽核

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" audit`。該模組或共用規格有 LOCK_DRIFT → **中止**，回報漂移項目：先釐清那些改動是誰做的，再處理本次變更。
2. `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"`。變更前就不通過（常見於舊版格式，例如矩陣 `type` 仍是舊值）→ 不中止，把「是否一併遷移格式」列為 Step 4 的一題，並在 change.md 記錄基準 lint 結果。變更結束時 lint 必須通過。

## Step 2：開啟變更

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-change.js" start <ID> <slug>`（slug 為繁中短名，例如「折抵上限35趴」）。
2. 把使用者給的變更內容**逐字**貼進 change.md「變更單原文」。

## Step 3：改 proposed 矩陣

1. 只改 `proposed.matrix.json`，照變更單字面改。被改到的 Rule 在 `resolved_by` 追加本次 change.md 的相對路徑。
2. 新增 Rule 時沿用現有編號往後排，`type` 只能是 `main_flow` 或 `edge_case`。
3. 變更單有洞（硬性約束 2）→ 依 `${CLAUDE_PLUGIN_ROOT}/skills/spec-01-discovery-bootstrap/references/mcq-file-format.md` 寫選擇題到 `.specengine/sdd/features/`，「來源」欄寫「需求變更單」。proposed 中該處先照「最保守、不改既有行為」的讀法寫，並在題目中說明。
4. 同時列出矩陣以外會被波及的規格文字：`terms.md`、`erm.dbml` note、`exclusions.md`、`policy-defaults.md`（被推翻的慣例：保留為跨模組預設並加註本模組例外，除非使用者明確要改預設）、流程圖裡的數字標籤、Feature 層描述。只列不改，Step 5 才改。
5. 檢查連帶受影響的 Rule：逐條看現有 `.feature` 的 Examples，矩陣文字沒變但期望值會因本次變更改變的 Rule，記下來，Step 4 用 `--also` 宣告。
6. 有新增 Rule 時（NEW_RULE），在這裡就對新 Rule 跑 spec-01 的探測清單，產生的選擇題跟核准題一起在 Step 4 問，不要等到核准之後。

## Step 4：分類與核准（停下等人：第 1 次）

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-change.js" classify <ID> [--also R-xxx,R-yyy]`，輸出貼進 change.md「分類」。依硬性約束 3、7 決定是否升級。
2. 向使用者提出一組題目。改前改後的細節（每條 Rule 的改前 → 改後、連帶受影響的 Rule 與原因、Examples 會怎麼變、會走哪些站）先用一般文字列出；題目本身只放簡短選項。有 AskUserQuestion 工具就用它，一次最多 4 題，超過就分兩組依序問；沒有就用文字一次列完。
   - 第 1 題固定為核准題，選項為「核准」「要修改（請說明）」「撤回這次變更」。`--also` 宣告的每條 Rule 都要在說明文字裡逐條寫出，apply 會檢查。
   - 其後為 Step 3 的選擇題（若有）。
3. 使用者回答後：
   - 選「要修改」或選擇題答案改變了 proposed → 改 proposed、重跑 classify。分類升級、或範圍多出新的 Rule → 只就「升級的理由」與「新增的 Rule」再問一次核准；兩者都沒變，把修改內容補記在核准區塊即可。
   - 選「撤回」→ change.md 狀態行改為「已撤回」，回報後結束。現行矩陣未被動過，不需回滾。
   - 選擇題依 spec-02 的方式歸檔到 `resolved/`。
4. 核准題與答案原文寫進 change.md「使用者核准」，然後 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-change.js" apply <ID>`。

## Step 5：依分類執行

每完成一項，在 change.md「異動檔案」追加一行（檔案路徑與一句說明），供中斷後續跑。

### 5A：PARAMETER

1. 更新 Step 3.4 列出的規格文字中的舊數字。流程圖只改數字標籤，不重畫、不重新確認；在 `flow-design/<ID>.md` 末尾追加「變更紀錄」一行（日期、change.md 路徑、「參數變更，分支未變」）。
2. `.feature`：只改受影響 Rule 的區塊。Step 句子不改，只改 Examples 與單一 Scenario 中的數值。依 spec-03 Step 3b 逐列核對每個期望值能從新矩陣唯一推出。
3. **補回歸列**：測試要能分辨改前改後。數值邊界移動時，在結果會翻轉的那條 Rule 加一列落在舊值與新值之間（例如上限 30% → 35%，主流程加「訂單 1000 折 320 點：改前被拒、改後成功」）；拒絕類 Rule 不可能有這種列，改調整既有列的輸入讓它保留原本的意圖（例如「上限取整為 0」那列從訂單 3 元改為 2 元）。行為翻轉（拒絕改成功）時，翻轉的那幾列本身就是回歸列。
4. `node "${CLAUDE_PLUGIN_ROOT}/scripts/feature-lint.js"` 必須 PASS。
5. 依 manifest 的 BDD 框架跑 dry-run，不得出現未定義步驟；出現 → 升級為 BEHAVIOR，在 change.md 寫明，改走 5B 的第 4 步起。
6. 跳到 5D。

### 5B：BEHAVIOR

1. 更新規格文字（同 5A.1，但不限數字）。
2. **流程確認（停下等人：第 2 次）**：讀 `flow-design/<ID>.md`，找出圖中分支內容會因本次變更而不同的流程階段，只重畫那幾張（輸出格式同 spec-flow-align，含「執行者疑似缺口」區），附白話複述與「改前 → 改後」對照，請使用者確認。某張圖只是列出受影響 Rule 的編號、分支內容不變，就不重畫。重畫的圖在確認前放在變更目錄的 `flow-drafts/`，確認後才覆寫 `flow-design/`；索引第一行狀態不動，確認後在索引末尾追加「變更紀錄」一行。使用者指出缺口 → 寫成選擇題請使用者回答，改 proposed 後走 `amend`（硬性約束 8）。
3. `.feature`：受影響 Rule 依 spec-03 規則重寫，含 Step 3b 逐列核對與回歸列（同 5A.3）。未受影響 Rule 不動。lint 必須 PASS。
4. 依 spec-04 規則只補缺的部分：dry-run 列出未定義步驟，補 Step 與 Driver 介面方法、實作骨架。既有 Step 句子不改名；需要改句子時視為刪舊增新，並確認舊句子已無任何 `.feature` 使用。
5. 跳到 5D。

### 5C：NEW_RULE

1. 新 Rule 的探測選擇題已在 Step 3.6 產生、Step 4 問完。
2. 新 Rule 若不屬於既有任何流程階段，新增一張流程圖並在索引檔登記。
3. 其餘同 5B（流程確認、形式化、補骨架）。

### 5D：實作、驗證、上鎖（共用）

1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-guard.js" snapshot` 凍結**變更後**的規格（直接覆蓋上一輪留下的快照）。
2. 依 spec-05 規則改產品碼與 Driver 實作，紅轉綠。變更時的紅燈基準是「新規格跑舊程式」，只有範圍內的列會紅，不要求全紅。失敗分類（程式錯誤／形式化錯誤／規格瑕疵）照 spec-05。規格瑕疵 → 中止，change.md 停在「已核准」，回報待答題。
3. 測試全綠後 `spec-guard.js verify` → `spec-guard.js lock <ID>`。
4. `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-change.js" close <ID>`。未通過（例如範圍外改動）→ 修正後再 close，不得刪改 base 備份。
5. `spec-guard.js audit` 應通過。
6. `overview.md` 的狀態欄只是快取，變更期間不必維護；收尾後依 `spec-status` 結果更新為 IMPLEMENTED 即可。lock 與 `changes/` 目錄應進 git，是否 commit 依使用者指示。

---

# 完成條件

- [ ] Step 1 audit 通過後才開始
- [ ] 現行矩陣只經由 `apply` 寫回，change.md 有使用者核准原文
- [ ] 分類未被往下調；升級時有寫理由
- [ ] 受影響 Rule 的 Examples 逐列核對過，且每個變動的數值邊界有回歸列
- [ ] `close` 通過：重新上鎖、lock 記錄現行矩陣雜湊、未受影響 Rule 逐字未動
- [ ] `spec-status` 推導回到 IMPLEMENTED，audit 通過

# 完成彙報

```text
[spec change] 執行完成！模組：<MODULE_ID>

分類：<PARAMETER|BEHAVIOR|NEW_RULE>（腳本判定<；執行者升級，理由：…>）
受影響 Rule：<清單> ｜ 未受影響 Rule：<N> 條逐字未動
停下等人：<N> 次（核准 1<、流程確認 1>）
異動：矩陣 <N> 條 ｜ .feature <N> 區塊（回歸列 +<N>）｜ Step +<N> ｜ Driver 方法 +<N> ｜ 產品碼 <檔案>
測試：PASS <X>/<X> ｜ verify PASS ｜ lock 已重建 ｜ close PASS ｜ audit PASS
變更紀錄：<change.md 路徑>
```
