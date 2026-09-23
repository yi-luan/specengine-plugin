---
name: spec-manifest-sync
description: 當使用者輸入 /spec-manifest-sync,或說「核實環境宣告」「manifest 是不是過時了」「檢查一下 architecture-manifest 對不對」「這個專案還沒有 architecture-manifest，幫我建一份」「新專案幫我掃一下技術棧」「這個專案的 CLAUDE.md 還沒接 SpecEngine，幫我補上」「幫我把 SpecEngine 導入這個專案」時使用。若 `.claude/spec/architecture-manifest.md` 與/或專案 `CLAUDE.md` 裡的 SpecEngine 區塊尚不存在，先從 plugin 內建範本落地／插入初稿，再唯讀掃描專案實際狀態（套件安裝、指令、命名慣例、Multi-Tenancy、既有非 SpecEngine 的 `.claude/skills/` 工具等），核實或更新其中〔待確認〕項目與可能過時的既有宣告，查無法唯一判定者交由使用者決定，不自動修正程式碼或設定檔。屬環境治理性質，不屬於 spec-run 的線性串接範圍。
---

# 目標
`.claude/spec/architecture-manifest.md` 是所有 SpecEngine Skill（spec-01~06、spec-run）共同依賴的「單一環境事實來源」；若它跟專案實際狀態脫鉤（例如宣告的套件其實還沒裝、宣告的指令已經改名、〔待確認〕項目其實早就查得到答案），其他 Skill 會依錯誤前提產生不可執行的程式碼或做出錯誤判斷。本階段是**唯一**針對 manifest 本身做核實（或首次建立）的環節，只讀專案實際狀態（`package.json`、`*.csproj`、既有程式碼慣例等），核實或更新 manifest 內容，**絕不**代為修改程式碼、設定檔或 `.specengine/spec/` 規格本身——manifest 落後於現實時，是 manifest 該更新去描述現實，而不是反過來要求現實去配合 manifest。

這個環節同時取代舊有「整包複製別的專案 `architecture-manifest.md` 再手動改」的作法：新專案第一次執行本 Skill 時，若 `.claude/spec/architecture-manifest.md` 尚不存在，會先從 plugin 內建的通用範本落地初稿（所有項目皆為〔待確認〕），再立刻接續 Step 1~3 的掃描核實邏輯自動填入能查得到證據的項目，無法唯一判定者才留給使用者裁示——不是「AI 憑空猜專案架構」，而是「AI 讀真實檔案系統證據去填」，找不到唯一證據的一律誠實留白，不腦補。

本階段同時負責第二個「單一環境事實來源」：專案 `CLAUDE.md` 裡由 `<!-- SPECENGINE:BEGIN -->`／`<!-- SPECENGINE:END -->` 標記包住的 SpecEngine 區塊（命令路由、不變性條文、FSM 規則）。這個區塊取代舊有「整份 CLAUDE.md 手動複製貼上、零星漏貼」的作法：新專案第一次執行本 Skill 時，若專案 CLAUDE.md 沒有這個區塊，直接從 plugin 內建範本插入；若已有區塊但版本落後於目前安裝的 plugin 版本，回報落差交由使用者決定是否更新，絕不擅自覆寫標記【之外】的任何內容——CLAUDE.md 除了本區塊，通常還會有這個團隊自己寫的其他規範（例如 commit message 慣例），那些不屬於本階段的管轄範圍。

---

# 核心行為規範 (Hard Constraints)

1. **只讀掃描、只寫兩個指定目標 (Read-Only Scan, Two Designated Write Targets)**：
   - 本階段僅允許寫入兩個目標：`.claude/spec/architecture-manifest.md` 全文，以及專案 `CLAUDE.md` 中 `<!-- SPECENGINE:BEGIN -->` 與 `<!-- SPECENGINE:END -->` 這兩個標記【之間】的內容。嚴禁修改 `Controllers/`、`Models/`、`wwwroot/`、`tests/`、`package.json`、`*.csproj` 等任何程式碼或設定檔，也不修改 `.specengine/spec/` 或 `.specengine/sdd/`。
   - CLAUDE.md 標記【之外】的任何文字（例如團隊自訂的 commit message 慣例、其他與 SpecEngine 無關的專案規範）一律不得觸碰，即使看起來像是可以順手整理或調整格式。
   - 若核實過程中發現程式碼本身有問題（例如套件版本衝突），僅可在彙報中提及，不得動手修正。
   - 首次建立（Step 0）時，讀取來源限定為 `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md` 與 `${CLAUDE_PLUGIN_ROOT}/templates/claude-md-specengine-section.template.md`（皆為 plugin 內建、不隨專案而異的通用範本），一樣只落地到上述兩個目標，不視為違反本條約束。
2. **零腦補、無法唯一判定即交由使用者 (Zero Hallucination on Ambiguity)**：
   - 每一項〔待確認〕或既有宣告，只有在能找到「唯一、可驗證」的證據時才可直接更新（例如：`package.json` 明確列出某套件版本、`*.csproj` 明確宣告 `TargetFramework`）。
   - 若證據矛盾、找不到證據，或需要團隊決策而非單純查證（例如「要不要導入 Multi-Tenancy」），一律維持〔待確認〕原樣或標註為新的待決問題，並在彙報中列出，交由使用者裁示，不得自行猜測填入。
3. **變更需可追溯 (Traceable Updates)**：
   - 更新 manifest 任一行時，若原文已有〔待確認〕字樣，直接替換為查證後的實際值；若是核實既有宣告後發現已過時（例如指令已改名、目錄已搬移），採「取代而非矛盾累加」，直接覆寫為現況，不得保留新舊兩種矛盾敘述並存。
   - 彙報中必須列出「本次變更了 manifest 的哪幾行、變更前後內容」，讓使用者能快速 Review diff，不得只說「已更新」而不給細節。
4. **不強制路由至其他 Skill (No Forced Chaining)**：
   - 本階段獨立於 `spec-run` 串接之外（見 CLAUDE.md 第 2.0、2.1 節），不會自動觸發 spec-01~06 中任何一個，也不建議使用者「請執行 spec XX」（見 CLAUDE.md 第 1.3 條客觀狀態快照輸出原則）。
5. **CLAUDE.md 區塊版本落差不自動覆寫 (No Silent Overwrite on Version Drift)**：
   - 若專案 CLAUDE.md 已存在 `<!-- SPECENGINE:BEGIN v{X} -->` 區塊，且 X 與目前安裝的 plugin 版本不同，【嚴禁】自行判斷「反正是同一份區塊」就直接覆寫——區塊存在期間，團隊有可能已經在標記內手動加了專案特例註記（雖然不建議，但無法排除）。必須先在彙報中列出版本差異與可能受影響的段落，交由使用者決定是否要覆寫更新；使用者同意後才可整段取代標記內文字。
   - 若區塊完全不存在（不論是全新 CLAUDE.md 還是既有 CLAUDE.md 缺少此區塊），視為首次建立，可直接插入，不需詢問。

---

# 輸入 (Inputs)

1. `.claude/spec/architecture-manifest.md`（本次核實對象；若不存在，見 Step 0）
2. 專案 `CLAUDE.md`（核對其中 SpecEngine 區塊是否存在、版本是否落後；若專案根本沒有 CLAUDE.md，視為區塊也不存在）
3. `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md`（僅當 Step 0 判定 architecture-manifest.md 需要首次建立時讀取）
4. `${CLAUDE_PLUGIN_ROOT}/templates/claude-md-specengine-section.template.md`（僅當 Step 0 判定 CLAUDE.md 的 SpecEngine 區塊需要首次插入或更新時讀取）
5. `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`（讀取目前安裝的 plugin 版本號，用於填入範本與比對既有區塊版本）
6. `package.json`、`*.csproj`（實際安裝之套件與版本、TargetFramework）；若專案技術棧非 Node/.NET，改讀該技術棧對應之依賴清單檔（例如 `requirements.txt`、`pom.xml`、`go.mod`）
7. 實際目錄結構，核對第 1 節路徑宣告是否仍正確；另外列出 `.claude/skills/` 底下（或已安裝的其他 plugin 提供）非 SpecEngine 本體的既有工具，供 CLAUDE.md 區塊「既有工具」段落使用
8. 既有程式碼慣例樣本（例如既有 Migration/Model 檔案的命名、既有錯誤處理寫法、驗證機制設定），核對第 3、4、6 節宣告

---

# 執行步驟與檔案操作

## Step 0: 判定首次建立或例行核實（兩個目標分別判定）

**Step 0a：`.claude/spec/architecture-manifest.md`**

1. 檢查該檔案是否存在。
2. **不存在** → 首次建立模式：讀取 `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md` 全文，原樣落地為 `.claude/spec/architecture-manifest.md`（此時全部欄位皆為〔待確認〕），接著直接進入 Step 1，此輪 Step 1 的「待核實清單」等同於範本全部欄位。
3. **已存在** → 例行核實模式：略過落地，直接進入 Step 1，比照既有邏輯僅掃描其中標註〔待確認〕與既有宣告之項目。
4. 兩種模式的後續 Step 1~3 邏輯完全相同，差異只在「待核實清單」的初始範圍（全部欄位 vs. 僅缺口欄位）。

**Step 0b：專案 `CLAUDE.md` 的 SpecEngine 區塊**

1. 讀取 `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 取得目前安裝的 plugin 版本號（下稱「目前版本」）。
2. 檢查專案根目錄是否存在 `CLAUDE.md`；若存在，搜尋是否含有 `<!-- SPECENGINE:BEGIN v{X} -->` ... `<!-- SPECENGINE:END -->` 這組標記。
3. **CLAUDE.md 不存在**，或**存在但沒有 SPECENGINE 標記** → 首次插入模式：
   - 讀取 `${CLAUDE_PLUGIN_ROOT}/templates/claude-md-specengine-section.template.md`，將其中 `{{PLUGIN_VERSION}}` 替換為「目前版本」；`{{EXISTING_TOOLS_NOTE}}` 依 Step 1 輸入 7 的掃描結果替換——若專案 `.claude/skills/`（或其他已安裝 plugin）存在非 SpecEngine 本體的既有工具，替換為一行「> 本專案另有既有工具：`<工具名>`（與 SpecEngine 並存，非本區塊管轄範圍）」；若無任何既有工具，直接整行移除（不留空行佔位）。
   - 若 `CLAUDE.md` 不存在：以替換完成的範本內容原樣建立新檔。
   - 若 `CLAUDE.md` 已存在但無此區塊：在檔案**最末尾**附加一個空行，再附加替換完成的範本內容；不得插入到既有內容中間，不得調整既有內容的順序或格式。
4. **已存在 SPECENGINE 標記，且 `v{X}` 與「目前版本」相同** → 略過，視為已同步，不需任何動作。
5. **已存在 SPECENGINE 標記，但 `v{X}` 與「目前版本」不同** → 版本落差模式：
   - 【嚴禁】自動覆寫。在彙報中列出「現有區塊版本 `v{X}` vs 目前 plugin 版本」，並說明「如需更新，會將標記內全部內容整段取代為新版範本（標記外內容不受影響）」，交由使用者決定是否執行；使用者明確同意後，才依上一點的替換規則整段取代標記內文字（含更新 `v{X}` 版本號本身）。
   - 使用者未回應或明確拒絕時，維持現狀，不視為本次執行失敗。

---

## Step 1: 逐節掃描 manifest 現況

讀取 `architecture-manifest.md` 全文，列出所有標註〔待確認〕的項目，以及所有具體宣告值（路徑、指令、套件名稱、版本號等），建立「待核實清單」。

---

## Step 2: 逐項核實

針對待核實清單逐項執行：

1. **路徑與目錄結構類**（第 1 節）：用實際檔案系統結構核對宣告路徑是否存在、是否仍是該用途的正確位置。
2. **套件與版本類**（第 2、5 節）：讀取該專案技術棧對應的依賴清單檔（例如 `package.json` devDependencies/dependencies、`*.csproj` PackageReference、`requirements.txt`、`pom.xml`、`go.mod` 等，依實際專案為準），核對宣告的套件是否已安裝、版本是否相符；若宣告「尚未安裝」但實際已安裝（或反之），直接更新。
3. **指令類**（第 2、5 節）：核對 `package.json` scripts 或該技術棧慣用的既有文件化指令，是否仍是宣告的那個指令字串。
4. **命名慣例類**（第 3 節）：抽樣既有程式碼（優先選最近異動的檔案，避免引用已知例外）核對宣告的命名慣例是否仍成立；若抽樣結果不一致，標註「部分不一致，建議人工複查」而非直接下結論。
5. **待確認且無法自行查證類**（第 4、6 節等）：維持原樣，於彙報中列為「仍待確認，需團隊決策」。

---

## Step 3: 落盤更新

依 Step 2 結果，僅更新 `architecture-manifest.md` 中可唯一判定的項目；無法判定的維持不動。更新採「取代而非矛盾累加」，不得保留新舊兩種敘述並存。

---

# 完成條件

- [ ] Step 0a 已判定 architecture-manifest.md 本輪為「首次建立」或「例行核實」，並於彙報中說明
- [ ] `architecture-manifest.md` 全文已逐節掃描，待核實清單已建立
- [ ] 每一項待核實項目皆已嘗試核實，能唯一判定的已更新，無法判定的維持〔待確認〕並列入彙報
- [ ] Step 0b 已判定 CLAUDE.md 的 SpecEngine 區塊本輪為「首次插入」「已同步無需動作」或「版本落差待使用者裁示」，並於彙報中說明
- [ ] 若為版本落差，未經使用者同意不得覆寫；若使用者同意，已整段取代標記內文字且未動到標記外任何內容
- [ ] 未修改上述兩個目標以外的任何檔案
- [ ] 彙報中列出本次實際變更的行數與變更前後內容，不僅是籠統摘要

# 完成彙報 (Terminal Output)

執行完畢後，在 Terminal 印出狀態快照：

```text
[spec-manifest-sync] 執行完成！

0. 執行模式：
   - architecture-manifest.md：首次建立（已從 plugin 範本落地初稿） | 例行核實（就既有檔案核實差異）
   - CLAUDE.md SpecEngine 區塊：首次插入（新建 CLAUDE.md） | 首次插入（附加到既有 CLAUDE.md 末尾） | 已同步無需動作 | 版本落差待裁示（現有 vX → 目前 vY）

1. 核實統計（architecture-manifest.md）：
   - 待核實項目總數：X 項
   - 已核實並更新：Y 項
   - 仍待確認（需團隊決策）：Z 項

2. 本次變更明細（architecture-manifest.md）：
   - 第 N 節「<項目名稱>」：<變更前> → <變更後>
   - ...（逐項列出，Y 項全部列出）

3. 仍待確認清單（architecture-manifest.md）：
   - 第 N 節「<項目名稱>」：<原因，例如「需團隊決策，非單純查證」>

4. CLAUDE.md 異動摘要：
   - <說明本次對 CLAUDE.md 做了什麼，或為何未做任何動作>

本階段全程未修改上述兩個目標以外的任何檔案。
```

```text
[SpecEngine] spec-manifest-sync 進度：Step 3 / 3 — 已完成
```
