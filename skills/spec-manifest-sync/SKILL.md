---
name: spec-manifest-sync
description: 當使用者輸入 /spec-manifest-sync，或說「核實環境宣告」「manifest 是不是過時了」「這個專案還沒有 architecture-manifest，幫我建一份」「幫我把 SpecEngine 導入這個專案」「CLAUDE.md 還沒接 SpecEngine，幫我補上」時使用。若 .claude/spec/architecture-manifest.md 或專案 CLAUDE.md 的 SpecEngine 區塊不存在，先從 plugin 範本落地初稿，再唯讀掃描專案實際狀態核實或更新〔待確認〕項目，掃描後一次問完仍缺的必填欄位。不修改程式碼或設定檔。不屬於 spec-run 串接範圍。
---

# 目標

`.claude/spec/architecture-manifest.md` 是所有 Skill 共同依賴的環境事實來源。本階段是唯一針對它做首次建立或核實的環節：只讀專案實際狀態，更新 manifest，**絕不**反過來改程式碼去配合 manifest。同時負責專案 `CLAUDE.md` 中 `<!-- SPECENGINE:BEGIN -->`／`<!-- SPECENGINE:END -->` 包住的區塊。

---

# 硬性約束

1. **只寫兩個目標**：manifest 全文，以及 `CLAUDE.md` 兩個標記之間。嚴禁修改程式碼、設定檔、依賴清單、`.specengine/`。
2. **證據分級**：
   - **直接證據**（依賴清單明列套件與版本、設定檔明確宣告路徑或指令）→ 直接填。
   - **唯一候選**（例如 `src/` 是專案裡唯一可能的來源目錄，即使還是空的）→ 可填，但在值後標註「（唯一候選，待程式碼進駐後核實）」。
   - **本機實測**（例如 `node --version`，依賴清單未宣告）→ 可填，標註「（本機實測，package.json 未宣告 engines）」。
   - **團隊決策或無證據** → 維持〔待確認〕。
3. **變更可追溯**：既有宣告過時時採「取代而非矛盾累加」。彙報列出每一行變更的前後內容。
4. **不強制串接**：不自動觸發其他 Skill。
5. **版本落差不自動覆寫**：`CLAUDE.md` 區塊版本與目前 plugin 不同時，列出差異交由使用者決定；區塊不存在時直接插入。

---

# 輸入

1. `.claude/spec/architecture-manifest.md`、專案 `CLAUDE.md`（若存在）
2. `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md`、`claude-md-specengine-section.template.md`
3. `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 的 `version`
4. 專案依賴清單（`package.json`、`*.csproj`、`requirements.txt`、`pom.xml`、`go.mod` 等）與測試框架設定檔
5. 實際目錄結構；`.claude/skills/` 下非 SpecEngine 的既有工具
6. 既有程式碼慣例樣本

---

# 執行步驟

## Step 0a: architecture-manifest.md

- 不存在 → 從範本原樣落地，待核實清單為全部欄位。
- 已存在 → 待核實清單為〔待確認〕項目與所有具體宣告值。

## Step 0b: CLAUDE.md SpecEngine 區塊

1. 讀取目前 plugin 版本。
2. `CLAUDE.md` 不存在或無標記 → 讀範本，替換 `{{PLUGIN_VERSION}}`；`{{EXISTING_TOOLS_NOTE}}` 依輸入 5 替換為一行「> 本專案另有既有工具：`<名稱>`（與 SpecEngine 並存）」，無則整行移除。`CLAUDE.md` 不存在則新建；存在則附加到檔尾。
3. 已有標記且版本相同 → 略過。
4. 已有標記且版本不同 → 彙報差異，等使用者同意後整段取代。

## Step 1～2: 逐項掃描與核實

1. **路徑類**（第 1 節）：以實際檔案系統核對。
2. **套件與版本類**（第 2、5 節）：讀依賴清單。
3. **指令類**（第 2、5 節）：核對 scripts 或既有文件化指令；測試報告路徑從測試框架設定檔讀。
4. **命名慣例類**（第 3 節）：抽樣最近異動的程式碼；不一致時標註「部分不一致，建議人工複查」。
5. **需團隊決策類**（第 4、6 節等）：維持〔待確認〕。

## Step 3: 必填欄位一次問完

掃描後仍為〔待確認〕的【必填】欄位（Source Root Directory、Step Definitions Directory、BDD Execution Framework、Test Execution Command、Binding Layer），用 AskUserQuestion 工具**一次**問完（最多 4 題一組），每題給掃描到的候選值當選項、另加「其他」。沒有該工具時用一段文字一次列出。

**條件必填的處理**：Binding Layer 題的 `driver` 選項文字內直接寫明「選此項則 Driver Directory 填為 `<掃到的候選目錄>`」；使用者選 `driver` 即視為同意該值。掃不到候選目錄時，同一組內多加一題問 Driver Directory。不另起一輪。

不追問選填欄位。拒答的維持〔待確認〕並在彙報標示「必填未填，spec 04／05 將無法執行」。

## Step 4: 落盤

更新可唯一判定的項目，依證據分級標註來源，採「取代而非矛盾累加」。

---

# 完成條件

- [ ] 兩個目標的模式已判定並說明
- [ ] 待核實項目逐項處理，證據分級已標註
- [ ] 必填欄位已一次問完，已填或已標示未填
- [ ] 版本落差未經同意未覆寫
- [ ] 未修改兩個目標以外的任何檔案
- [ ] 彙報含逐行變更前後內容

# 完成彙報

```text
[spec-manifest-sync] 執行完成！
模式：manifest <首次建立 | 例行核實> ｜ CLAUDE.md 區塊 <首次插入 | 已同步 | 版本落差待裁示（vX → vY）>
核實：待核實 X 項 ｜ 已更新 Y 項 ｜ 仍待確認 Z 項 ｜ 必填缺口 W 項（已問／未填）
變更明細：
  - 第 N 節「<項目>」：<變更前> → <變更後>（<證據等級>）
仍待確認：
  - 第 N 節「<項目>」：<原因>
未修改上述兩個目標以外的任何檔案。
```
