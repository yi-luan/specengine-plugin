---
name: spec-flow-align
description: 當使用者輸入 /spec-flow-align [MODULE_ID]、/spec-run，或說「對齊流程」「畫流程圖確認」「流程圖給我看」時使用，把某模組已完成互動釐清（spec-02）的完整行為矩陣依業務子情境分組畫成流程圖，跟使用者當面確認有沒有遺漏的分支、使用者行為或畫面狀態；每個子情境會落盤為一份獨立的「{繁體中文流程階段名稱}-artifact.md」視覺化文件，確認過才算真正進入下一階段（spec-03）。是 spec-02 與 spec-03 之間的強制關卡，不可跳過。
---

# 目標

文字型 MCQ 逐題問答容易讓人「見樹不見林」——每題都答對了，但整體流程圖攤開來看還是可能漏了一整條分支，因為沒有人被要求「一次看完整張圖」。本階段把 spec-02 已經談妥的所有 Rule（主流程＋邊界情況）依業務子情境分組畫成流程圖，讓使用者用「看圖」而不是「逐題回想」的方式做最後一次完整性確認。確認有缺口時，不自行腦補分支內容，改用 spec-02 既有的 MCQ 機制補問，模組狀態退回 `CLARIFYING`；確認沒有缺口，才視為通過本關卡，可以繼續 spec-03 形式化。

每個業務子情境確認通過後，會各自落盤為一份獨立的視覺化文件 `{繁體中文流程階段名稱}-artifact.md`，同時包含 Mermaid 版本（供 IDE／GitHub／瀏覽器等支援圖形渲染的環境使用）與 TUI 純文字版本（用 `|`、`+--`、`` `-- ``、`v`、`-->` 等任何字型與終端機都能正常顯示的純 ASCII 字元畫出樹狀／線性流程，不使用 `│`、`▼`、`├─`、`└─`、`▶` 這類 Unicode box-drawing 特殊字元，避免在某些字型或環境下顯示成亂碼），力求同一份規劃在任何檢視環境下都能被完整看懂，而不只是印在終端機訊息裡看完就結束。

---

# 核心行為規範 (Hard Constraints)

1. **只畫既有規則，不腦補新流程 (Zero Hallucination)**：
   - 流程圖必須 100% 依據 `.specengine/sdd/matrix/<MODULE_ID>.json` 已確定的 Rule 建構，嚴禁自行加入矩陣中不存在的分支或步驟，即使「看起來應該要有」。
   - 若在畫圖過程中自己發現矩陣有明顯缺口（例如某個分支沒有對應的失敗路徑），不可直接補畫，必須提出來當面詢問使用者，走 Step 3 的缺口處理流程。
2. **真實等待確認 (Hard Pause)**：
   - 印出流程圖後【必須真實等待使用者輸入】，嚴禁自行判斷「這張圖應該沒問題」就代替使用者確認並逕行放行到 spec-03。
   - 即使被 `spec-run` 委派呼叫，也一樣要真的停下來等使用者這一輪的實際回覆，不得跳過。
3. **缺口一律走 MCQ，不直接腦補答案**：
   - 使用者指出缺口時，依 `.claude/skills/spec-01-discovery-bootstrap/references/mcq-file-format.md` 的統一格式包裝成新問題，推入 `.specengine/sdd/data/` 或 `.specengine/sdd/features/`，不得自己猜測工程 Trade-off 並直接決定。
4. **模組命名空間隔離**：
   - 只讀寫本模組（`<MODULE_ID>`）對應的 `.specengine/sdd/matrix/<MODULE_ID>.json`、`.specengine/sdd/overview/<MODULE_ID>.md`、`.specengine/sdd/flow-design/<MODULE_ID>.md`，以及本模組專屬的 `.specengine/sdd/flow-design/<MODULE_ID>/` 子目錄，不觸碰其他模組的檔案。`.specengine/sdd/overview/` 僅存放各模組的釐清佇列總覽（`spec-02` 產出），流程對齊的產物一律歸在獨立的 `.specengine/sdd/flow-design/` 之下，不與佇列總覽混放。
5. **雙格式並存，不可只留一種 (Dual-Format Visualization)**：
   - 落盤的每份 `{繁體中文流程階段名稱}-artifact.md` 必須同時包含 Mermaid 區塊與 TUI 純文字區塊，兩者內容須完全一致（同一套節點與分支，只是呈現語法不同），不得只寫其中一種就視為完成——這是為了讓同一份文件不論在支援圖形渲染的環境（IDE、GitHub、瀏覽器）或純文字終端機中，都能被完整看懂。

---

# 輸入 (Inputs)

1. `.specengine/sdd/matrix/<MODULE_ID>.json`（spec-02 已完成互動釐清、所有 High/Medium 問題皆 Resolved/Deferred 的模組矩陣）
2. `.specengine/spec/erm.dbml`（供補充實體關聯脈絡，畫圖時可對照）
3. `.specengine/sdd/resolved/` 下屬於本模組的已歸檔決策（若流程圖需要引用決策細節）

---

# 執行步驟與檔案操作

## Step 0: 模組解析與前置檢查

1. 讀取 `.specengine/sdd/overview.md` 全域索引，比照 `spec-02-interactive-clarify` Step 0 的規則鎖定 `MODULE_ID`（未附帶模組名稱時，若僅 1 個模組狀態為 `CLARIFIED` 則自動鎖定；有多個則列出候選清單請使用者指定，嚴禁自行猜測）。
2. 確認該模組狀態確實為 `CLARIFIED`（或由 `spec-run` Step 00 判定起點為本階段）。若佇列中仍有未決的 High/Medium 問題（`CLARIFYING` 狀態），本階段拒絕執行，提示使用者應先完成 `spec 02`。

## Step 1: 讀取矩陣、建構流程圖節點

1. 讀取 `.specengine/sdd/matrix/<MODULE_ID>.json` 全部 Rule，依 `actor`、`pre_conditions`、`trigger_event`、`post_assertions` 萃取每條 Rule 的「起點狀態 → 觸發動作 → 分支條件 → 結果狀態」。
2. 依業務邏輯自然分組（例如：主流程一張圖、每個獨立子情境或角色視角各自一張圖），避免把所有 Rule 硬塞進同一張過於龐大、看不清楚的圖。
3. **為每個分組命名一個繁體中文的「流程階段名稱」**（例如「建立與作答主流程」「圖片增減流程」「上傳模式切換流程」），此名稱將直接用於 Step 4 落盤檔案的檔名（`{流程階段名稱}-artifact.md`），命名須精簡且能讓使用者一眼看出該圖涵蓋的業務範圍，不得使用英文或程式代號當檔名。
4. 每個節點/分支旁以註解或標籤方式標註對應的 `rule_id`，讓使用者能反查到矩陣裡的哪一條規則。

## Step 2: 產出流程圖並印出確認請求

1. 針對 Step 1 的每個分組，同時準備兩種格式的圖（內容須完全一致，只是語法不同）：
   - **Mermaid 版本**：`flowchart TD` 或 `flowchart LR`（依流程長度選擇較易讀的方向），全程繁體中文標籤（結構關鍵字除外）。
   - **TUI 純文字版本**：只用 `|`（垂直延續）、`+--`（分支）、`` `-- ``（最後一個分支）、`v`（向下箭頭）、`-->`（動作箭頭）等純 ASCII 字元畫出樹狀／線性流程，同樣全程繁體中文標籤，不使用 `│`、`▼`、`├─`、`└─`、`▶` 這類 Unicode box-drawing 特殊字元（避免在某些字型或終端機環境下顯示成亂碼）。這是**終端機呈現時的主要格式**——純文字終端機本來就不會渲染 Mermaid 語法（只會看到一堆文字），純 ASCII 字元才是真正能在任何終端機都正確視覺呈現的畫面。
2. 額外用白話文字逐條複述一遍目前圖上有哪些分支/情境，供兩種圖形格式之外的最後一層保險——供任何極端不支援上述字元的執行環境仍能看懂完整內容。文字複述是不可省略的資訊本體，不因有圖就省略。
3. 依下列格式印出至 Terminal（Terminal confirm 階段以 TUI 純文字版本為主顯示；Mermaid 版本會在 Step 4 確認通過後寫入落盤的 artifact 檔案，供支援渲染的環境使用，Terminal 階段不必重複貼一份）：

```text
====================================================================
🗺️ [模組：<MODULE_ID>] 流程圖對齊確認
====================================================================

**圖 1：<流程階段名稱 1>（涵蓋 rule_id：...）**

```text
<TUI 純文字流程圖內容>
```

（如有圖 2、圖 3...，依序重複）

以下是目前規劃的完整流程（依 Rule 逐條複述）：
  1. <白話描述 Rule 1，標註 rule_id>
  2. <白話描述 Rule 2，標註 rule_id>
  ...
--------------------------------------------------------------------
請確認：
  (1) 有沒有遺漏的分支、使用者行為或畫面狀態？
  (2) 圖上有沒有跟你原本設想不一致的地方？
若都沒問題請回覆「確認」或「OK」；若有缺口，請直接描述缺口內容。
====================================================================
```

4. 【真實等待使用者輸入】，不得自行判斷後代答。

## Step 3: 分歧處理

- **使用者確認無缺口**（回覆「確認」「OK」「沒問題」等肯定語意）：進入 Step 4。
- **使用者指出缺口**：
  1. 依 `.claude/skills/spec-01-discovery-bootstrap/references/mcq-file-format.md` 的統一格式，把每個缺口包裝成新的 MCQ 問題檔，寫入 `.specengine/sdd/data/` 或 `.specengine/sdd/features/`（依問題性質判斷資料模型類或流程行為類）。
  2. 將 `.specengine/sdd/overview.md` 與 `.specengine/sdd/overview/<MODULE_ID>.md` 的模組狀態由 `CLARIFIED` 改回 `CLARIFYING`，並更新待釐清數量統計。
  3. 中止本輪，於完成彙報中列出本次新增的缺口問題清單，提示使用者這些新問題需要透過 `spec 02` 釐清；不得在本階段自行決定答案，也不得省略回退狀態這一步就強行放行到 Step 4。

## Step 4: 落盤確認結果

1. **為每個流程階段各自產出一份視覺化 artifact 檔案**：於 `.specengine/sdd/flow-design/<MODULE_ID>/{流程階段名稱}-artifact.md`（檔名採 Step 1.3 命名之繁體中文流程階段名稱；與 `matrix/<MODULE_ID>.json`、`overview/<MODULE_ID>.md` 同一套「頂層依產物類型分類、內層依模組拆分」慣例，不歸在 `overview/` 底下，避免和 spec-02 的釐清佇列總覽混放），內容依序包含：
   - 標題（`# <流程階段名稱>`）與一句話白話摘要＋本圖涵蓋的 `rule_id` 清單。
   - **涵蓋範圍聲明**：分「本圖涵蓋」與「本圖不涵蓋／刻意排除」兩點條列。後者是為了讓使用者一眼分辨「這裡沒畫到」是因為刻意排除在本階段範圍之外（例如已屬於其他流程階段的圖），還是真的遺漏——沒有東西要排除時，寫「無」，不得省略此欄位。
   - Mermaid 版本（```mermaid 區塊）。
   - TUI 純文字版本（```text 區塊）。
   - 白話複述（逐條列點，僅含本流程階段的分支/情境，標註對應 `rule_id`）。
   - **已知限制清單**：把矩陣/決策裡「刻意不處理」「已知取捨」類的分支（例如某種前置條件下系統選擇維持現狀、不自動修復）獨立條列出來並標註對應 `rule_id`，不要讓這類重要取捨只藏在圖上某個分支的標籤文字裡而不顯眼——目的是讓使用者能區分「這是遺漏」還是「這是已經做過的工程決策」。沒有已知限制時，寫「無」。
   - **對齊確認清單**：針對本流程階段量身設計 3~6 條具體的確認提示（例如「這個分支的錯誤訊息文字是否符合預期？」「這個角色的操作權限有沒有遺漏？」），用意是引導使用者從具體面向覆核，而不是只給「有沒有遺漏分支」這種籠統問法容易讓人隨口回「OK」。
   - 確認時間戳（`> 確認時間：YYYY-MM-DD HH:mm`）。
   兩種圖形格式的節點與分支內容須完全一致（見 Hard Constraint 5），不可只寫一種。
2. **寫入／更新總覽索引 `.specengine/sdd/flow-design/<MODULE_ID>.md`**：內容包含本次確認時間戳、涵蓋 Rule 總數、以及各流程階段的清單，每一項以相對路徑連結至對應的 `<MODULE_ID>/{流程階段名稱}-artifact.md`，並附一句話說明該階段涵蓋範圍。此檔案本身**不重複貼出**完整圖形內容（圖形內容在各自的 artifact 檔案裡），只作為索引與「已通過流程對齊」的產物證據——`spec-run` Step 00 判斷起點、`spec 06` 巡檢回顧，皆只需檢查這個索引檔案是否存在，不需逐一檢查子目錄內每個 artifact 檔案。
3. 模組狀態欄維持 `CLARIFIED` 不變（本階段不引入新的狀態值；`.specengine/sdd/flow-design/<MODULE_ID>.md` 是否存在才是判斷「是否已通過流程對齊」的依據，見根目錄 `CLAUDE.md` 第 2.1 節 Step 00）。

---

# 完成條件

- [ ] `MODULE_ID` 已鎖定，且確認模組狀態為 `CLARIFIED`（佇列無未決 High/Medium 問題）
- [ ] 已依矩陣現況分組並為每組命名繁體中文流程階段名稱，產出 TUI 純文字圖與白話複述，並印出完整確認請求
- [ ] 已【真實等待】使用者輸入，未自行代答
- [ ] 若使用者指出缺口：已包裝為 MCQ 問題檔落盤、模組狀態已退回 `CLARIFYING`，本輪中止
- [ ] 若使用者確認無缺口：每個流程階段皆已產出對應的 `.specengine/sdd/flow-design/<MODULE_ID>/{流程階段名稱}-artifact.md`（含 Mermaid 與 TUI 純文字兩種圖形格式、涵蓋範圍聲明、已知限制清單、對齊確認清單），且總覽索引 `.specengine/sdd/flow-design/<MODULE_ID>.md` 已寫入／更新並連結至各 artifact 檔案

# 完成彙報 (Terminal Output)

**確認通過時：**

```text
✅ [Phase Flow-Align: 流程圖對齊] 執行完成！模組：<MODULE_ID>

1. 流程圖涵蓋範圍：
   - 已涵蓋 Rule 數：X 條
   - 產出流程階段數：Y 個

2. 使用者確認結果：無缺口，流程圖對齊通過。

3. 產出：
   - .specengine/sdd/flow-design/<MODULE_ID>.md（總覽索引）
   - .specengine/sdd/flow-design/<MODULE_ID>/<流程階段名稱 1>-artifact.md
   - .specengine/sdd/flow-design/<MODULE_ID>/<流程階段名稱 2>-artifact.md
     ...（依實際產出張數列出）

👉 模組可繼續進入 spec-03 形式化階段。
```

**發現缺口時：**

```text
🔁 [Phase Flow-Align: 流程圖對齊] 發現缺口，模組狀態已退回 CLARIFYING！模組：<MODULE_ID>

1. 使用者提出的缺口：
   - <缺口摘要 1>
   - <缺口摘要 2>

2. 已新增 MCQ 問題：Z 項（見 .specengine/sdd/overview/<MODULE_ID>.md）

👉 請先執行 spec 02 釐清這些新問題，完成後可重新執行 spec-flow-align 再次確認。
```

```text
[SpecEngine] spec-flow-align 進度：Step 4 / 4 — 已完成，模組：<MODULE_ID>
```
