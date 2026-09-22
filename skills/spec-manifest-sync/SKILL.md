---
name: spec-manifest-sync
description: 當使用者輸入 /spec-manifest-sync,或說「核實環境宣告」「manifest 是不是過時了」「檢查一下 architecture-manifest 對不對」「這個專案還沒有 architecture-manifest，幫我建一份」「新專案幫我掃一下技術棧」時使用。若 `.claude/spec/architecture-manifest.md` 尚不存在，先從 plugin 內建範本落地初稿，再唯讀掃描專案實際狀態（套件安裝、指令、命名慣例、Multi-Tenancy 等），核實或更新其中〔待確認〕項目與可能過時的既有宣告，查無法唯一判定者交由使用者決定，不自動修正程式碼或設定檔。屬環境治理性質，不屬於 spec-run 的線性串接範圍。
---

# 目標
`.claude/spec/architecture-manifest.md` 是所有 SpecEngine Skill（spec-01~06、spec-run）共同依賴的「單一環境事實來源」；若它跟專案實際狀態脫鉤（例如宣告的套件其實還沒裝、宣告的指令已經改名、〔待確認〕項目其實早就查得到答案），其他 Skill 會依錯誤前提產生不可執行的程式碼或做出錯誤判斷。本階段是**唯一**針對 manifest 本身做核實（或首次建立）的環節，只讀專案實際狀態（`package.json`、`*.csproj`、既有程式碼慣例等），核實或更新 manifest 內容，**絕不**代為修改程式碼、設定檔或 `.specengine/spec/` 規格本身——manifest 落後於現實時，是 manifest 該更新去描述現實，而不是反過來要求現實去配合 manifest。

這個環節同時取代舊有「整包複製別的專案 `architecture-manifest.md` 再手動改」的作法：新專案第一次執行本 Skill 時，若 `.claude/spec/architecture-manifest.md` 尚不存在，會先從 plugin 內建的通用範本落地初稿（所有項目皆為〔待確認〕），再立刻接續 Step 1~3 的掃描核實邏輯自動填入能查得到證據的項目，無法唯一判定者才留給使用者裁示——不是「AI 憑空猜專案架構」，而是「AI 讀真實檔案系統證據去填」，找不到唯一證據的一律誠實留白，不腦補。

---

# 核心行為規範 (Hard Constraints)

1. **只讀掃描、只寫 manifest (Read-Only Scan, Manifest-Only Write)**：
   - 本階段的唯一寫入目標是 `.claude/spec/architecture-manifest.md`。嚴禁修改 `Controllers/`、`Models/`、`wwwroot/`、`tests/`、`package.json`、`*.csproj` 等任何程式碼或設定檔，也不修改 `.specengine/spec/` 或 `.specengine/sdd/`。
   - 若核實過程中發現程式碼本身有問題（例如套件版本衝突），僅可在彙報中提及，不得動手修正。
   - 首次建立（Step 0）時，讀取來源限定為 `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md`（plugin 內建、不隨專案而異的通用範本），一樣只落地到 `.claude/spec/architecture-manifest.md` 這個唯一目標，不視為違反本條約束。
2. **零腦補、無法唯一判定即交由使用者 (Zero Hallucination on Ambiguity)**：
   - 每一項〔待確認〕或既有宣告，只有在能找到「唯一、可驗證」的證據時才可直接更新（例如：`package.json` 明確列出某套件版本、`*.csproj` 明確宣告 `TargetFramework`）。
   - 若證據矛盾、找不到證據，或需要團隊決策而非單純查證（例如「要不要導入 Multi-Tenancy」），一律維持〔待確認〕原樣或標註為新的待決問題，並在彙報中列出，交由使用者裁示，不得自行猜測填入。
3. **變更需可追溯 (Traceable Updates)**：
   - 更新 manifest 任一行時，若原文已有〔待確認〕字樣，直接替換為查證後的實際值；若是核實既有宣告後發現已過時（例如指令已改名、目錄已搬移），採「取代而非矛盾累加」，直接覆寫為現況，不得保留新舊兩種矛盾敘述並存。
   - 彙報中必須列出「本次變更了 manifest 的哪幾行、變更前後內容」，讓使用者能快速 Review diff，不得只說「已更新」而不給細節。
4. **不強制路由至其他 Skill (No Forced Chaining)**：
   - 本階段獨立於 `spec-run` 串接之外（見 CLAUDE.md 第 2.0、2.1 節），不會自動觸發 spec-01~06 中任何一個，也不建議使用者「請執行 spec XX」（見 CLAUDE.md 第 1.3 條客觀狀態快照輸出原則）。

---

# 輸入 (Inputs)

1. `.claude/spec/architecture-manifest.md`（本次核實對象；若不存在，見 Step 0）
2. `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md`（僅當 Step 0 判定需要首次建立時讀取）
3. `package.json`、`*.csproj`（實際安裝之套件與版本、TargetFramework）；若專案技術棧非 Node/.NET，改讀該技術棧對應之依賴清單檔（例如 `requirements.txt`、`pom.xml`、`go.mod`）
4. 實際目錄結構，核對第 1 節路徑宣告是否仍正確
5. 既有程式碼慣例樣本（例如既有 Migration/Model 檔案的命名、既有錯誤處理寫法、驗證機制設定），核對第 3、4、6 節宣告

---

# 執行步驟與檔案操作

## Step 0: 判定首次建立或例行核實

1. 檢查 `.claude/spec/architecture-manifest.md` 是否存在。
2. **不存在** → 首次建立模式：讀取 `${CLAUDE_PLUGIN_ROOT}/templates/architecture-manifest.template.md` 全文，原樣落地為 `.claude/spec/architecture-manifest.md`（此時全部欄位皆為〔待確認〕），接著直接進入 Step 1，此輪 Step 1 的「待核實清單」等同於範本全部欄位。
3. **已存在** → 例行核實模式：略過本步驟，直接進入 Step 1，比照既有邏輯僅掃描其中標註〔待確認〕與既有宣告之項目。
4. 兩種模式的後續 Step 1~3 邏輯完全相同，差異只在「待核實清單」的初始範圍（全部欄位 vs. 僅缺口欄位）。

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

- [ ] Step 0 已判定本輪為「首次建立」或「例行核實」，並於彙報中說明
- [ ] `architecture-manifest.md` 全文已逐節掃描，待核實清單已建立
- [ ] 每一項待核實項目皆已嘗試核實，能唯一判定的已更新，無法判定的維持〔待確認〕並列入彙報
- [ ] 未修改 `architecture-manifest.md` 以外的任何檔案
- [ ] 彙報中列出本次實際變更的行數與變更前後內容，不僅是籠統摘要

# 完成彙報 (Terminal Output)

執行完畢後，在 Terminal 印出狀態快照：

```text
[spec-manifest-sync] 執行完成！

0. 執行模式：首次建立（已從 plugin 範本落地初稿） | 例行核實（就既有檔案核實差異）

1. 核實統計：
   - 待核實項目總數：X 項
   - 已核實並更新：Y 項
   - 仍待確認（需團隊決策）：Z 項

2. 本次變更明細：
   - 第 N 節「<項目名稱>」：<變更前> → <變更後>
   - ...（逐項列出，Y 項全部列出）

3. 仍待確認清單：
   - 第 N 節「<項目名稱>」：<原因，例如「需團隊決策，非單純查證」>

本階段全程未修改 architecture-manifest.md 以外的任何檔案。
```

```text
[SpecEngine] spec-manifest-sync 進度：Step 3 / 3 — 已完成
```
