---
name: spec-run
description: 當使用者輸入 /spec-run [path] [MODULE_ID],或說「spec run」「跑一次全流程」「幫我把這個需求跑完」時使用。依序委派 spec-01 到 spec-05（含 spec-01、spec-02 之間的 spec-flow-align 強制關卡）,一次啟動全流程。不含 spec-06(巡檢屬週期性維護,不是線性建置步驟)。
---

# 目標
把 `spec-01-discovery-bootstrap` → `spec-02-interactive-clarify` → `spec-flow-align` → `spec-03-formalize-gherkin` → `spec-04-generate-test-stub` → `spec-05-coder-implement` 串成一次執行,不需要使用者在每個階段結束後手動重新輸入下一個指令。這是把「跑完 01 自動接續 02~05」這條規則變成真的會被執行的委派邏輯,而不是只停留在說明文字裡。

**串接起點依模組目前階段自動判定，不論現況一律從 spec-01 開始**（見下方 Step 00，對應 CLAUDE.md 第 2.1、4.2 節）：模組已冷啟動過且已釐清、已形式化、甚至已產出測試骨架的，直接從對應的下一階段接續，不重新掃描已完成的部分。

`[path]` 為選填之原始需求檔案路徑（例如 `inbox/requirement.md`）；若省略，視同使用者已在同一則訊息中貼上或另行提供需求文字。`[MODULE_ID]` 為選填參數；若省略，以 Step 00 判定或 spec-01 執行後產出的 `MODULE_ID` 作為後續階段的沿用值。

---

# 核心行為規範 (Hard Constraints)

1. **不得代答 (No Auto-Answer)**：
   - spec-02 需要使用者親自回答 MCQ 才能往下走，這是它本來就有的行為。spec-run 只負責在它完成後接手呼叫下一個階段，【嚴禁】為了讓流程跑完而自行代答任何一題。
2. **中途中止即停 (Halt on Stop)**：
   - 這裡指的是使用者明確表達「不要再繼續整條串接」的意圖（例如「先停在這裡」「中止 spec-run」「全部停下來」），此時立即停止串接，依各階段既有的「客觀狀態快照輸出」原則回報目前進度，不強行繼續。
   - **與 spec-02 自己的 `stop`/`done`/`exit`/`proceed` 不同，不要混淆**：使用者在 spec-02 的 MCQ 問答中輸入 `stop`/`done`/`exit`/`proceed`，只是結束「這一階段剩餘問題」的問答（spec-02 會將其標記 `Deferred` 並正常進入自己的完成回報），這**不代表**使用者要中止整條 spec-run——spec-02 完成後仍應照 Step 3~5 繼續往下呼叫。只有使用者話語明確指向「整個流程」而非「剩下的問題」時，才觸發本條的整體中止。無法判斷時，直接詢問使用者是指「跳過剩下的釐清問題就好」還是「整個 spec-run 都不跑了」，不要自行猜測。
3. **規格瑕疵退回即停 (Halt on Defect Escalation)**：
   - 任一階段因規格瑕疵或唯讀不變性驗證失敗而中止（例如 spec-05 Step 4 的 `spec-guard.js verify` 失敗），立即中止串接，回報違規細節，不自動跳過或吞掉錯誤繼續下一階段。

---

# 執行步驟

## Step 00: 起點判定（非互動）

1. 讀取 `.specengine/sdd/overview.md` 全域索引，找出 `MODULE_ID` 對應的那一列（若使用者未指定 `MODULE_ID`，比照 spec-02 Step 0 的模組解析邏輯：僅 1 個模組待處理則自動鎖定，2 個以上必須先請使用者指定）。
2. **佇列非空優先（見 CLAUDE.md 第 4.2 節）**：不論狀態欄寫什麼，先檢查 `.specengine/sdd/data/`、`.specengine/sdd/features/` 中是否仍有屬於該模組的未決問題檔。若有，一律視同 `CLARIFYING`，並在後續彙報中說明「狀態欄與佇列不一致，已以佇列為準」。
3. 依狀態欄（或上一步覆寫後的結果）決定起點：
   - 模組於全域索引中不存在對應列（尚未冷啟動過）→ 起點為 spec-01。
   - `CLARIFYING`（含舊值 `DISCOVERY`）→ 起點為 spec-02。
   - `CLARIFIED`：檢查 `.specengine/sdd/flow-design/<MODULE_ID>.md` 是否存在（`spec-flow-align` 的通過證明）。存在 → 起點為 spec-03；不存在 → 起點為 spec-flow-align（尚未做過流程圖對齊確認，此索引檔缺漏屬正常「尚未過關」，不算狀態欄與現實不符的異常，不需走下方第 4 點的裁決流程）。
   - `FORMALIZED` → 起點為 spec-04。
   - `STUBBED` → 起點為 spec-05。
   - `IMPLEMENTED` → 模組已完工，不執行任何階段，直接依「客觀狀態快照輸出」原則回報現況，結束本次 `spec-run`。
4. **產物存在性交叉驗證（見 CLAUDE.md 第 4.2 節）**：依下表確認狀態欄宣稱的產物是否真的存在；任一項缺少時，【嚴禁】逕自補建產物或改掉狀態欄，必須停下來列出「狀態欄宣稱值 vs 實際缺少的產物清單」，先判別是否為 git 分支差異（`git log --all --oneline --name-only --diff-filter=A -- '*<MODULE_ID>*'` + `git branch -a --contains <commit>`），若屬分支差異僅回報不動任何檔案；若屬真實落差，交由使用者決定是重跑對應階段、修正狀態欄，還是推入 `.specengine/sdd/` 佇列追蹤，本次 `spec-run` 暫停，不強行往下猜測起點。

   | 狀態 | 應存在之產物 |
   | :--- | :--- |
   | `CLARIFYING`／`CLARIFIED` | `.specengine/sdd/matrix/<MODULE_ID>.json`、`.specengine/sdd/overview/<MODULE_ID>.md` |
   | `FORMALIZED` | 上列全部，加上 `.specengine/spec/features/` 中屬於該模組的 `.feature` |
   | `STUBBED` | 上列全部，加上 `tests/steps/` 中對應的 Step Definitions 檔 |
   | `IMPLEMENTED` | 上列全部 |

5. 模組列存在但缺少狀態欄（舊資料相容性缺口）：於彙報中提示落差，保守地以 spec-01 為起點。
6. 使用者已明確要求「從頭跑」「重新冷啟動」時，以使用者指示為準，忽略既有階段狀態，起點固定為 spec-01。

---

## Step 0: 建立進度追蹤

若當前執行環境有 TodoWrite 工具，依 Step 00 判定的起點建立任務項目（起點之前的階段標記 `completed`，不重新執行）：

```
TodoWrite([
  { content: "spec-01 discovery-bootstrap", status: "pending" | "completed" },
  { content: "spec-02 interactive-clarify",  status: "pending" | "completed" },
  { content: "spec-flow-align",              status: "pending" | "completed" },
  { content: "spec-03 formalize-gherkin",    status: "pending" | "completed" },
  { content: "spec-04 generate-test-stub",   status: "pending" | "completed" },
  { content: "spec-05 coder-implement",      status: "pending" | "completed" },
])
```

若沒有這個工具，仍以下方「進度提示」慣例手動維持可見度，不是硬依賴。

---

## Step 1: 呼叫 spec-01（僅當 Step 00 判定起點為 spec-01 時執行）

用 Skill 工具執行 `spec-01-discovery-bootstrap`，帶入原始需求文字/檔案路徑。

完成後，從其終端摘要（`[Phase 01: Discovery Bootstrap] 執行完成！模組：<MODULE_ID>`）讀出 `MODULE_ID`，供 Step 2~5 沿用。若使用者已在呼叫 `spec-run` 時明確指定 `MODULE_ID`，以使用者指定值為準。

---

## Step 2: 呼叫 spec-02（起點為 spec-02，或前一階段已完成時執行）

用 Skill 工具執行 `spec-02-interactive-clarify`，帶入 `MODULE_ID`。

這一步依賴 spec-02 自己的「單題單回合原則」（每次只問一題、真正等待使用者這一輪的實際輸入才問下一題）——spec-run 本身不重複實作這個暫停機制，但也不能假設它「自然就會發生」：呼叫 spec-02 時必須讓它照自己的 Step 2/3 規則逐題進行，不得為了讓 `spec-run` 一次跑完而代替使用者回答任何一題。單純等 spec-02 完成（或使用者觸發其 `stop`/`done`/`exit`/`proceed` 優雅終止語意，兩者都視為 spec-02 正常完成）後再繼續下一步。

---

## Step 2b: 呼叫 spec-flow-align（起點為 spec-flow-align，或前一階段（spec-02）剛完成且 `.specengine/sdd/flow-design/<MODULE_ID>.md` 尚不存在時執行）

用 Skill 工具執行 `spec-flow-align`，帶入 `MODULE_ID`。

這一步依賴 spec-flow-align 自己的「真實等待確認」規則（印出 Mermaid 流程圖與白話複述後真正停下來等使用者這一輪的實際回覆）——spec-run 本身不重複實作這個暫停機制，也【嚴禁】自行判斷「這張圖應該沒問題」代替使用者確認並逕行放行到 spec-03。

- 使用者確認無缺口（spec-flow-align 寫出 `.specengine/sdd/flow-design/<MODULE_ID>.md`）→ 視為本步驟完成，繼續 Step 3~5。
- 使用者指出缺口（spec-flow-align 將缺口包裝為新 MCQ、模組狀態退回 `CLARIFYING`）→ **中止串接**，回報新增的缺口問題清單，提示使用者需重新執行 `spec 02` 釐清後再重新呼叫 `spec-run`，不自動迴圈跳回本次的 Step 2。

---

## Step 3~5: 依序呼叫 spec-03、spec-04、spec-05（起點為 spec-03／04／05，或前一階段已完成時執行）

用 Skill 工具依序執行 `spec-03-formalize-gherkin`、`spec-04-generate-test-stub`、`spec-05-coder-implement`，皆帶入 `MODULE_ID`，全程連續執行、不暫停等待使用者輸入。

任一階段回報違規或中止（見上方「規格瑕疵退回即停」），立即停止，不繼續呼叫後續階段。

---

## Step 6: 彙整總覽

全部六個階段完成後，彙整各階段各自的終端摘要，印出一份總覽（見下方完成彙報）。

---

# 完成條件

- [ ] Step 00 已完成起點判定（含佇列非空優先覆寫與產物存在性交叉驗證），並於彙報中說明本次起點與理由
- [ ] 起點之前的階段未被重新執行
- [ ] spec-01（若在本次執行範圍內）已完成，`MODULE_ID` 已鎖定並沿用至後續階段
- [ ] spec-02（若在本次執行範圍內）所有 High/Medium 問題已釐清或標記 Deferred（使用者親自回答，非代答）
- [ ] spec-flow-align（若在本次執行範圍內）已印出流程圖並【真實等待】使用者確認，未自行代答；確認通過已產出 `.specengine/sdd/flow-design/<MODULE_ID>.md` 及各流程階段 artifact 檔案，發現缺口已中止串接並回退狀態
- [ ] spec-03（若在本次執行範圍內）已產出 `.feature` 並通過 `feature-lint.js`
- [ ] spec-04（若在本次執行範圍內）已產出測試 stub，全數為 Red Stage
- [ ] spec-05（若在本次執行範圍內）已完成實作，全數 Scenario 綠燈，且 `spec-guard.js verify` 通過
- [ ] 各階段皆已依 CLAUDE.md 第 4.2 節將對應狀態值寫回 `.specengine/sdd/overview.md`
- [ ] 過程中若有 `stop`、規格瑕疵中止，或狀態欄與產物不符，已回報目前進度快照，未強行跳過繼續

# 完成彙報 (Terminal Output)

```text
[spec-run] 全流程執行完成！模組：<MODULE_ID>

0. 起點判定：本次自 spec-0N 開始（模組原狀態：<STATE>），<起點之前階段 → 略過，已完成>

1. spec-01 Discovery Bootstrap  → 完成 ｜ 略過（.specengine/sdd/matrix/<MODULE_ID>.json、.specengine/spec/erm.dbml 草稿）
2. spec-02 Interactive Clarify  → 完成 ｜ 略過（已解決 X 項、延後 Y 項）
3. spec-flow-align              → 完成 ｜ 略過（.specengine/sdd/flow-design/<MODULE_ID>.md，使用者確認無缺口）
4. spec-03 Formalize Gherkin    → 完成 ｜ 略過（.specengine/spec/features/<module>.feature，feature-lint PASS）
5. spec-04 Generate Test Stub   → 完成 ｜ 略過（tests/steps/<module>.spec.ts）
6. spec-05 Coder Implement      → 完成 ｜ 略過（全數 Scenario 綠燈，spec-guard verify PASS）

模組階段狀態：IMPLEMENTED（已寫回 .specengine/sdd/overview.md）
專案目前處於 100% 綠燈可交付狀態。
```

若 Step 00 判定模組已是 `IMPLEMENTED`：

```text
[spec-run] 模組 <MODULE_ID> 已於先前完工（IMPLEMENTED），本次未執行任何階段。
```

```text
[SpecEngine] spec-run 進度：Step 7 / 7 — 全流程已完成，模組：<MODULE_ID>
```

若中途中止：

```text
[SpecEngine] spec-run 進度：Step N / 7 — 已於 spec-0X／spec-flow-align 中止，原因：<stop 指令 / 規格瑕疵退回 / 流程對齊發現缺口>
```