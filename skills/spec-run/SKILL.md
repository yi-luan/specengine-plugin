---
name: spec-run
description: 當使用者輸入 /spec-run [path] [MODULE_ID]，或說「spec run」「跑一次全流程」「幫我把這個需求跑完」時使用。以 spec-status.js 判定模組目前階段作為起點，依序委派 spec-01 → spec-02 → spec-flow-align → spec-03 → spec-04 → spec-05。不含 spec-06 與 spec-manifest-sync。
---

# 目標

把六個階段串成一次執行，使用者不必在每個階段結束後手動輸入下一個指令。**起點由 `spec-status.js` 推導，嚴禁不論現況一律從 spec-01 開始**。

`[path]` 為選填的原始需求檔案路徑；省略時視同需求文字已在訊息中。`[MODULE_ID]` 為選填；省略時由 Step 00 判定或由 spec-01 產出後沿用。

---

# 硬性約束

1. **不得代答**：spec-02 的選擇題與 spec-flow-align 的確認都必須由使用者親自回答。spec-run 只負責在它們完成後接手呼叫下一階段，【嚴禁】為了讓流程跑完而代答。
2. **整體中止與階段內終止不同**：使用者在 spec-02 中輸入 `stop` 只是掛起剩餘題目，spec-run 仍應繼續往下。只有使用者明確指向「整個流程」（「中止 spec-run」「全部停下來」）才整體中止。無法判斷時直接問，不猜。
3. **瑕疵即停，但形式化錯誤除外**：任一階段因規格瑕疵（業務未定義或矛盾）、lint 失敗或 `spec-guard.js` 失敗而中止，立即停止串接並回報細節，不跳過、不吞錯。spec-05 發現的「形式化錯誤」（矩陣正確、`.feature` 抄錯）由 spec-05 依其硬性約束 4b 自修並留紀錄，不中止串接。

---

# 執行步驟

## Step 00: 起點判定（非互動）

1. 執行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/spec-status.js" --json`（指定模組時加 `--module <MODULE_ID>`）。
2. exit code 2（沒有任何矩陣）或 3（指定模組不存在）→ 起點為 spec-01。
3. 未指定 `MODULE_ID` 且有多個模組 → 列出候選請使用者指定，不猜。
4. 依該模組的 `next` 欄位決定起點：`spec 02`、`spec flow-align`、`spec 03`、`spec 04`、`spec 05`。`next` 為「已完工」→ 若使用者這次帶來的是對該模組的需求變更，改用 Skill 工具執行 `spec-change`；否則不執行任何階段，回報現況後結束。`next` 為 `spec change`（階段 CHANGING）→ 用 Skill 工具執行 `spec-change` 續跑。
5. 腳本回報的 `warnings`（例如「有 Step 但找不到 .feature」「缺流程對齊證明」）原樣轉述給使用者，並暫停本次 spec-run，由使用者裁示。【嚴禁】自行補建產物或改狀態欄。唯一例外是「overview.md 狀態欄與推導不符」，這只是快取過期，照推導結果繼續即可。
6. 使用者明確要求「從頭跑」「重新冷啟動」→ 忽略推導結果，起點為 spec-01。

## Step 0: 進度追蹤

若有 TodoWrite 工具，依起點建立六個階段的任務項目，起點之前的標記 `completed`。沒有則略過。

## Step 1: spec-01（僅當起點為 spec-01）

用 Skill 工具執行 `spec-01-discovery-bootstrap`，帶入需求文字或檔案路徑。完成後從其彙報讀出 `MODULE_ID` 沿用。

## Step 2: spec-02（起點為 spec-02，或 spec-01 剛完成且佇列非空）

用 Skill 工具執行 `spec-02-interactive-clarify`，帶入 `MODULE_ID`。它會分組真實等待使用者輸入；等它完成後再繼續。spec-02 完成後若已走過小模組精簡確認（`spec-status.js` 的 `flowAligned` 為 true），跳過 Step 2b。

## Step 2b: spec-flow-align（起點為 spec-flow-align，或 spec-02 剛完成且 `flowAligned` 為 false）

用 Skill 工具執行 `spec-flow-align`，帶入 `MODULE_ID`。

- 確認無缺口 → 繼續 Step 3。
- 指出缺口 → spec-flow-align 會新增 MCQ。此時**中止串接**，回報新增的問題清單；由使用者重新執行 `spec 02` 後再 `spec run`，不自動迴圈。

## Step 3～5: spec-03、spec-04、spec-05（非互動，連續執行）

用 Skill 工具依序執行三者，皆帶入 `MODULE_ID`。任一階段回報違規即停止。

## Step 6: 彙整總覽

---

# 完成條件

- [ ] 起點由 `spec-status.js` 推導，彙報中說明起點與理由
- [ ] 起點之前的階段未被重新執行
- [ ] 範圍內的 spec-02、spec-flow-align 皆由使用者親自回答
- [ ] 範圍內的 spec-03 通過 lint，spec-05 通過 verify 並產出 lock
- [ ] 若中途中止，已回報進度快照

# 完成彙報

```text
[spec-run] 執行完成！模組：<MODULE_ID>

起點：<階段>（spec-status 推導），起點之前階段略過

1. spec-01  → 完成 ｜ 略過
2. spec-02  → 完成 ｜ 略過（已解決 X、掛起 Y）
3. flow-align → 完成 ｜ 略過 ｜ 小模組精簡確認
4. spec-03  → 完成 ｜ 略過（lint PASS）
5. spec-04  → 完成 ｜ 略過
6. spec-05  → 完成 ｜ 略過（全綠，verify PASS，lock 已建）

階段：IMPLEMENTED
```

中途中止時：

```text
[spec-run] 已於 <階段> 中止，原因：<整體中止 / 規格瑕疵 / 流程對齊發現缺口 / spec-status 警告待裁示>
已完成：<階段清單>；未執行：<階段清單>
```
