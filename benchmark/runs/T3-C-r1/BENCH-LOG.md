# BENCH-LOG（T3-C-r1）

- 開始時間：2026-10-20 07:43:48
- 中斷：約 2026-10-20 07:47（session 意外結束；manifest 與 CLAUDE.md 已落盤，本紀錄尚未建立）
- 恢復時間（第 1 次）：2026-10-20 07:51:44
- 中斷（第 2 次）：約 2026-10-20 08:00 前後，外部 API 限額
- 恢復時間（第 2 次）：2026-10-20 15:14:58
- 結束時間：2026-10-20 15:23:53
- plugin：SpecEngine 2.0.0（唯讀，腳本以絕對路徑在專案根目錄執行）

## 角色紀錄說明
「【執行者】」為執行 Skill 的角色；「【需求方】」為依 answers.md 回答的角色。每題以「執行者問 → 需求方答」記錄。

---

## 階段 (a)：spec-manifest-sync

### 【執行者】掃描結果
- Step 0a：manifest 不存在 → 從範本原樣落地，待核實清單為全部欄位（33 項）。
- Step 0b：CLAUDE.md 不存在 → 從範本新建，`{{PLUGIN_VERSION}}`=2.0.0，`.claude/skills/` 不存在 → `{{EXISTING_TOOLS_NOTE}}` 整行移除。
- 直接證據：Source Root `src/`（README、tsconfig）、Test Root `tests/`、Step Definitions `tests/steps/`（README、cucumber.cjs）、BDD Framework `@cucumber/cucumber ^11.3.0`（實裝 11.3.0）、Test Command `npm test`、Report `reports/cucumber.json`（cucumber.cjs）、TypeScript ^5.6.3（實裝 5.9.3）、ESM。
- 本機實測：Node.js v24.18.0（package.json 未宣告 engines）。
- 唯一候選：Assertion Library `node:assert/strict`（無第三方斷言套件）。
- 掃描後仍〔待確認〕的必填欄位：Binding Layer（團隊決策）。Driver Directory 掃不到候選目錄 → 同組加問一題。

### 問答
- Q-M1【執行者問】Binding Layer：(A) `driver`（選此項則 Driver Directory 依 Q-M2）(B) `direct`（Step 直接呼叫 `src/`，無 Driver 層）(C) 其他
  → 【需求方答】表上無此題（技術環境問題），照專案實際狀況回答：`direct`（純函式、無 UI、極小專案）。
- Q-M2【執行者問】Driver Directory（僅 Q-M1 選 driver 適用）：(A) `tests/drivers/`（新目錄）(B) `tests/support/`（既有）(C) 其他
  → 【需求方答】不適用（Q-M1 已選 direct）。

### 程序瑕疵（誠實記錄）
- 需求方為查 Q-M1 對 answers.md 做 `grep` 時，為了只看表格標題用了 `^|.*|.*|$` 的 pattern，結果比對到整張表的每一列，執行者因此在 spec-01 之前就看到了 answers.md 第 1～21 行（H1～H14、T-a～T-c）。第 22～26 行未看到。後續 spec-01 仍嚴格依需求檔與 devil-probes 推導問題，不以該表為來源；但此事實會影響「執行者沒預讀答案表」的評測前提，於此如實記錄。

### 完成彙報原文
```text
[spec-manifest-sync] 執行完成！
模式：manifest 首次建立 ｜ CLAUDE.md 區塊 首次插入
核實：待核實 33 項 ｜ 已更新 10 項 ｜ 仍待確認 23 項 ｜ 必填缺口 1 項（已問／已填）
變更明細：
  - 第 1 節「Source Root Directory」：〔待確認〕 → `src/`（直接證據：README.md、tsconfig.json include）
  - 第 1 節「Test Root Directory」：〔待確認〕 → `tests/`（直接證據：tsconfig.json include、cucumber.cjs import）
  - 第 1 節「Step Definitions Directory」：〔待確認〕 → `tests/steps/`（直接證據：README.md、cucumber.cjs import）
  - 第 2 節「Primary Language & Runtime」：〔待確認〕 → TypeScript ^5.6.3／ESM（直接證據：package.json、tsconfig）＋ Node.js v24.18.0（本機實測，package.json 未宣告 engines）
  - 第 5 節「BDD Execution Framework」：〔待確認〕 → `@cucumber/cucumber` ^11.3.0（直接證據：package.json、cucumber.cjs）
  - 第 5 節「Assertion Library」：〔待確認〕 → `node:assert/strict`（唯一候選，待程式碼進駐後核實）
  - 第 5 節「Test Execution Command」：〔待確認〕 → `npm test`；型別檢查 `npm run typecheck`（直接證據：package.json scripts）
  - 第 5 節「Test Report Path」：〔待確認〕 → `reports/cucumber.json`（直接證據：cucumber.cjs format）
  - 第 5 節「Binding Layer」：〔待確認〕 → `direct`（使用者決定）
  - 第 5 節「Driver Directory」：〔待確認〕 → 不適用（Binding Layer 為 direct；使用者決定）
仍待確認：
  - 第 1 節「Architecture Pattern」：src/ 僅空 index.ts，屬團隊決策
  - 第 2 節「Database Engine / Data Access & ORM / Schema Migration / Seed Script / UI Framework / CSS」：無相關依賴，屬團隊決策
  - 第 3 節「DB 命名 / Backend 命名 / Frontend 命名 / Test 命名 / Test Identifier Language / Code File Names」：樣本不足或屬團隊決策
  - 第 4 節「API Interface Standard / Error Response Format」：屬團隊決策
  - 第 5 節「Property-Based Testing Library / Test Data Seeding / Test DB Isolation / Test Double / Schema Introspection」：未安裝或無 DB，屬團隊決策
  - 第 6 節「Authentication / Context Injection / Multi-Tenancy」：屬團隊決策
未修改上述兩個目標以外的任何檔案。
```

---

## 階段 (b)：spec-run

### Step 00 起點判定
- `spec-status.js --json` → exit 2「找不到 .specengine/sdd/matrix/，尚無任何模組冷啟動過。」→ 起點 spec-01。
- 無 TodoWrite 工具，略過 Step 0。
- 工具環境說明：spec-run 指示「用 Skill 工具執行」各階段，但本次依指示改為直接讀各 SKILL.md 執行（Skill 工具為舊版 1.2.0）。

### spec-01【執行者】
- MODULE_ID：MULTI_TENANT_COUPON（需求可唯一對應，未提問）。
- 產出：matrix（10 條 Rules）、erm.dbml（2 表）、terms.md（16 術語）、exclusions.md（1 條，純函式不碰 DB → 範圍外）、policy-defaults.md（空表）、MCQ 15 題（features/ 13、data/ 2）、overview/MULTI_TENANT_COUPON.md、overview.md。
- feature-lint：`[feature-lint] 通過：…已更新句型索引 .specengine/sdd/steps-index.json（0 個不重複句型）。` exit 0
- spec-status：`MULTI_TENANT_COUPON | CLARIFYING | 15（Medium 5 / High 10） | 0 | — | spec 02`
  - 注意：overview 我寫「High 9 ｜ Medium 6」，腳本算出 High 10 / Medium 5 → 我手算錯（Q13 是 Medium、Q15 是 High；High 實為 Q01-09、Q15 = 10）。以腳本為準。

完成彙報原文：
```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：MULTI_TENANT_COUPON

矩陣：10 條 Rules ｜ erm.dbml：2 個 Tables ｜ terms.md：16 個術語 ｜ exclusions：1 條 ｜ 套用慣例：0 項
待答：15 題（High 10 ｜ Medium 5 ｜ Low 0）
階段：CLARIFYING
```

### spec-02 問答紀錄（無 AskUserQuestion 工具 → 終端機文字分組提問）

第 1 組（失敗原因格式／租戶／期間，4 題）
- Q15（High）【執行者問】失敗原因 reason 的格式：[A] 固定全大寫英文代碼 [B] 固定繁中句子 [C]「代碼: 說明」混合 [Short]
  → 【需求方答】表上無此題 → 「你決定，照你的最佳判斷」。執行者決定 A（後續答案表給的 reason 均為英文代碼，相容）。
- Q01（High）【執行者問】有一張券屬於別的租戶：[A] 整筆拒絕＋固定原因 [B] 略過該券 [C] 略過並附警告
  → 【需求方答】整筆拒絕。reason 固定為 `TENANT_MISMATCH`
- Q02（High）【執行者問】券過期或尚未生效：[A] 整筆拒絕、共用一代碼 [B] 整筆拒絕、分兩代碼 [C] 略過該券
  → 【需求方答】整筆拒絕。reason 固定為 `COUPON_EXPIRED`（未生效也用同一代碼）
- Q03（High）【執行者問】等於 validFrom／validTo 的那一刻算不算有效：[A] 含頭含尾 [B] 含頭不含尾 [C] 都不含
  → 【需求方答】都算有效（含頭含尾）。以時間戳比較：validFrom ≤ now ≤ validTo

第 2 組（疊加與重複，4 題）
- Q04（High）兩張以上不可疊加券：[A] 整筆拒絕 [B] 只用第一張 [C] 只用折扣最大
  → 整筆拒絕。reason 固定為 `NOT_STACKABLE`
- Q05（High）一張不可疊加 + 可疊加混用：[A] 整筆拒絕（只能單獨用）[B] 可以混用 [C] 略過不可疊加那張
  → 整筆拒絕，不可疊加的券只能單獨用。reason `NOT_STACKABLE`
- Q06（High）多張可疊加券的計算方式：[A] 各自對原始金額算後加總 [B] 依序套用
  → 所有 PERCENT 各自以原始訂單金額計算折扣額後加總，再加上所有 FIXED 的金額；總折扣 = 兩者之和
- Q11（Medium）同一張券傳兩次：[A] 整筆拒絕 [B] 去重 [C] 重複套用
  → 整筆拒絕。reason 固定為 `DUPLICATE_COUPON`

第 3 組（金額計算與輸入，3 題）
- Q07（High）百分比小數：[A] 各自 floor [B] 各自 round [C] 各自 ceil [D] 加總後取整
  → 每張 PERCENT 的折扣額各自無條件捨去取整數
- Q08（High）折扣總額超過訂單金額：[A] 拒絕、等於可以 [B] 拒絕、等於也拒絕 [C] 截斷至 0
  → 整筆拒絕。reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。總折扣剛好等於訂單金額可以，finalAmount = 0
- Q12（Medium）orderAmount 為 0／負數／非整數：[A] 一律拒絕 [B] 0 合法 [C] 小數捨去
  → 拒絕，reason 固定為 `INVALID_INPUT`

- 第 1～3 組每組寫回後 feature-lint 皆 exit 0（「通過…0 個不重複句型」）。
- 慣例晉升：POLICY-001（Q15）、002（Q03）、003（Q11）、004（Q07）、005（Q08）、006（Q12）。

### 第二次中斷
- 外部 API 限額中斷，約 2026-10-20 08:00 前後（第 3 組寫回並 lint 通過之後、第 4 組提問之前）。
- 恢復時間：2026-10-20 15:14:58。檢查落盤狀態：第 1～3 組 11 題已歸檔、matrix 16 條 Rules、terms MSG-001～006、POLICY-001～006，與中斷前一致，從第 4 組繼續。

第 4 組（最低消費／空輸入／券值／錯誤順序，4 題）
- Q09（High）最低消費判定基準：[A] 折扣前、等於可、未達整筆拒絕 [B] 折扣前、等於可、未達略過 [C] 折扣後 [D] 折扣前、等於不可
  → 【需求方答】以折扣前訂單金額判定；等於可以。未達時整筆拒絕，reason 固定為 `MIN_ORDER_NOT_MET`
- Q10（Medium）沒傳任何券：[A] 成功、折扣 0 [B] 失敗
  → 【需求方答】成功。finalAmount = orderAmount，discount = 0，applied = []
- Q13（Medium）券值不合法：[A] PERCENT 1～100、FIXED > 0、整數，不合法整筆拒絕 [B] 0～100／≥0 [C] 不驗證 [D] 略過
  → 【需求方答】拒絕，reason 固定為 `INVALID_COUPON`（PERCENT 不在 1～100、FIXED ≤ 0、非整數）
- Q14（Medium）多個錯誤同時發生：[A] 固定順序回報第一個 [B] 依券順序 [C] 全回報
  → 【需求方答】`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的

- 第 4 組寫回後 feature-lint exit 0；spec-status：`MULTI_TENANT_COUPON | CLARIFIED | 0 | 0 | — | spec flow-align`，警告「overview.md 狀態欄為 CLARIFYING，與推導結果 CLARIFIED 不符」→ 已更新 overview.md 為 CLARIFIED。
- 19 條 Rules ≥ 4 → 不走 Step 5 精簡確認，下一步 spec flow-align。

spec-02 完成彙報原文：
```text
[Phase 02: Interactive Clarify] 執行完成！模組：MULTI_TENANT_COUPON

決策：已解決 15 項 ｜ 掛起 0 項 ｜ 晉升慣例 6 項
寫回：matrix（+9 新增／8 修改）｜ exclusions（+0）｜ erm.dbml（2 欄異動）｜ terms.md（+1 術語、+8 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

### spec-flow-align 第 1 次【執行者】
- Step 0：`spec-status.js --module MULTI_TENANT_COUPON --json` → pending 0、flowAligned false，可執行；索引檔不存在，無既有裁示可沿用。
- 分組 5 張圖：①輸入與券值檢查 ②券資格檢查 ③疊加規則 ④折扣計算與結果 ⑤多重錯誤的回報順序。

印出內容（執行者問）：
````text
====================================================================
🗺️ [模組：MULTI_TENANT_COUPON] 流程圖對齊確認（第 1 次）
====================================================================
圖 1：輸入與券值檢查（R-015、R-017、R-016）
圖 2：券資格檢查（R-002、R-012、R-003、R-010、R-007、R-008）
圖 3：疊加規則（R-004、R-011、R-009、R-005 沿用）
圖 4：折扣計算與結果（R-000、R-001、R-005、R-013、R-006、R-014）
圖 5：多重錯誤的回報順序（R-018）
（Mermaid 原文見通過後落盤的 flow-design/MULTI_TENANT_COUPON/*.md）

白話複述：
  1. 單張固定金額券 100 元、訂單 1000 → 成功，折 100、剩 900、套用 [C1]（R-000）
  2. 單張 10% 券、訂單 1000 → 以折扣前金額計算，折 100、剩 900（R-001）
  3. 有一張券屬別的租戶 → 整筆拒絕 TENANT_MISMATCH（R-002）
  4. 有一張券過期或未生效 → 整筆拒絕 COUPON_EXPIRED（R-003）
  5. 兩張以上不可疊加券 → 整筆拒絕 NOT_STACKABLE（R-004）
  6. 多張可疊加券 → PERCENT 各自以原價算（各自捨去）加總，再加所有 FIXED；applied 依傳入順序（R-005）
  7. 折扣總額超過訂單金額 → 整筆拒絕 DISCOUNT_EXCEEDS_AMOUNT，不截斷（R-006）
  8. 折扣前訂單金額未達最低消費 → 整筆拒絕 MIN_ORDER_NOT_MET（R-007）
  9. 達到或剛好等於最低消費 → 成功（R-008）
 10. 單張不可疊加券單獨使用 → 成功（R-009）
 11. 結帳時間剛好等於 validFrom 或 validTo → 有效（R-010）
 12. 不可疊加券與可疊加券混用 → 整筆拒絕 NOT_STACKABLE（R-011）
 13. 同一張券（同租戶＋同代碼）傳兩次 → 整筆拒絕 DUPLICATE_COUPON（R-012）
 14. 百分比算出小數 → 每張各自無條件捨去後加總（333 元 10%+5% → 49）（R-013）
 15. 折扣總額剛好等於訂單金額 → 成功，折扣後 0（R-014）
 16. 訂單金額為 0、負數或非整數 → 整筆拒絕 INVALID_INPUT（R-015）
 17. 沒傳任何券 → 成功，折 0、applied []（R-016）
 18. 券值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）→ 整筆拒絕 INVALID_COUPON（R-017）
 19. 多個錯誤同時發生 → 依固定順序回報第一個（R-018）

已知取捨：
  - applyCoupons 為純函式，不讀寫資料庫；券的建立／儲存與代碼唯一的持久層約束屬其他模組（X-MULTI_TENANT_COUPON-001）

執行者疑似缺口：
  (a) 券的 validFrom／validTo 不是合法的 ISO 8601 時間，或 validFrom 晚於 validTo；結帳時間 now 不是合法時間——矩陣沒有對應結果
  (b) 券的最低消費金額 minOrderAmount 設成負數、0 或非整數——Q13 的「券值不合法」只涵蓋 value，沒涵蓋 minOrderAmount
--------------------------------------------------------------------
請確認：
  (1) 有沒有遺漏的分支、使用者行為或畫面狀態？（含上列疑似缺口的裁示）
  (2) 圖上有沒有跟你原本設想不一致的地方？
沒問題請回覆「確認」；有缺口請直接描述。
====================================================================
````

【需求方答】流程圖確認與疑似缺口 (a)(b) 皆不在答案表上，屬業務問題 →「你決定，照你的最佳判斷」。

【執行者】依最佳判斷裁示：
- 圖 1～5 與白話複述：無不一致（存為「已確認無不一致的流程圖」）。
- 疑似缺口 (a)(b)：判定為**缺口**（不是範圍外：都是傳入 applyCoupons 的實際輸入，純函式必須給出確定結果，否則 spec-05 會在實作時被迫腦補）。依硬性約束 3 建 MCQ（來源 spec-flow-align），中止本輪。

- spec-status（退回後）：
```text
模組 | 階段 | 待答 | 掛起 | 流程對齊 | 下一步
--- | --- | --- | --- | --- | ---
MULTI_TENANT_COUPON | CLARIFYING | 2（Medium 2） | 0 | — | spec 02
```

flow-align 完成彙報原文：
```text
🔁 [Phase Flow-Align] 發現缺口，狀態已退回 CLARIFYING！模組：MULTI_TENANT_COUPON
缺口：券的時間欄位不合法／期間顛倒／結帳時間不合法；券的最低消費金額設定不合法
已新增 MCQ：2 項 ｜ 已保存裁示：非缺口 0 條、已確認圖 5 張（下次重畫沿用）
```

spec-run 中止彙報原文：
```text
[spec-run] 已於 spec-flow-align 中止，原因：流程對齊發現缺口
已完成：spec-01、spec-02；未執行：spec-03、spec-04、spec-05
```
依 spec-run Step 2b 指示：重新執行 spec 02 後再 spec run（不自動迴圈；以下為依任務指示手動重跑）。

### spec-02 第 2 輪【執行者】
- Step 0：spec-status → pending 2（Medium 2），鎖定 MULTI_TENANT_COUPON。
- 分組：兩題定位皆為券欄位（Coupon），一組 2 題。
- Q16（Medium）券的 validFrom／validTo 不合法或期間顛倒、結帳時間 now 不合法：[A] 券→INVALID_COUPON、now→INVALID_INPUT [B] 券→COUPON_EXPIRED、now→INVALID_INPUT [C] 不驗證 [Short]
  → 【需求方答】表上無此題 →「你決定，照你的最佳判斷」。執行者決定 A。
- Q17（Medium）minOrderAmount 為負數、0 或非整數：[A] 負數／非整數→INVALID_COUPON、0 合法 [B] 負數／0／非整數皆 INVALID_COUPON [C] 不驗證 [Short]
  → 【需求方答】表上無此題 →「你決定，照你的最佳判斷」。執行者決定 A。
- 寫回：R-015、R-017 pre_conditions；erm.dbml valid_to、min_order_amount note；terms.md MSG-006、MSG-008 用途。feature-lint exit 0。
- 小插曲：flow-align 第 1 次的索引時間我先寫成 15:20（估計值），實際 date 為 15:17～15:18，已改正為 15:17。

spec-02 第 2 輪完成彙報原文：
```text
[Phase 02: Interactive Clarify] 執行完成！模組：MULTI_TENANT_COUPON

決策：已解決 2 項 ｜ 掛起 0 項 ｜ 晉升慣例 0 項
寫回：matrix（+0 新增／2 修改）｜ exclusions（+0）｜ erm.dbml（2 欄異動）｜ terms.md（+0 術語、2 文案用途更新）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

### spec-run 第 2 次
- Step 00：spec-status --json → stage CLARIFIED、next「spec flow-align」、flowAligned false、warnings 無（overview.md 已同步為 CLARIFIED）→ 起點 spec-flow-align，spec-01／02 略過。

### spec-flow-align 第 2 次【執行者】
- 沿用第 1 次索引：已確認圖 5 張、非缺口 0 條。
- 重畫：圖 1「輸入與券值檢查」因 R-015／R-017 修改而更新（標「本次更新」），圖 2～5 標「上次已確認」。
- 白話複述同第 1 次，差異：第 16 條加「或結帳時間不合法」；第 18 條加「時間不合法或期間顛倒、最低消費為負數或非整數（0 合法）」。
- 執行者疑似缺口：無。
- 【執行者問】(1) 有沒有遺漏的分支？(2) 有沒有不一致？沒問題請回覆「確認」。
  → 【需求方答】表上無此題 →「你決定，照你的最佳判斷」。
- 【執行者】裁示：無缺口、無不一致 → 通過。落盤 5 份流程階段檔與「已通過」索引。
- spec-status：
```text
模組 | 階段 | 待答 | 掛起 | 流程對齊 | 下一步
--- | --- | --- | --- | --- | ---
MULTI_TENANT_COUPON | CLARIFIED | 0 | 0 | ✓ | spec 03
```

flow-align 第 2 次完成彙報原文：
```text
✅ [Phase Flow-Align] 執行完成！模組：MULTI_TENANT_COUPON
涵蓋 Rule：19 條 ｜ 流程階段：5 個 ｜ 已知取捨：1 條 ｜ 本輪新增範圍外裁示：0 條
產出：flow-design/MULTI_TENANT_COUPON.md（已通過）＋ flow-design/MULTI_TENANT_COUPON/*.md ×5
```

### spec-03【執行者】
- Step 0：spec-status → next「spec 03」、flowAligned true。steps-index.json 為 {}（無既有句型可沿用）；parked 無。
- 產出 .specengine/spec/features/多租戶優惠券.feature（Background：租戶 T1、結帳時間 2026-06-01T00:00:00Z；券預設有效期間 2026 全年、未設最低消費，寫在 Feature 描述）。
- Examples 逐列核對：22 列 Examples + 21 個一般 Scenario，修正 0 列。
  - 註：R-007 的第 2 列（訂單 1000、最低消費 1001）與 R-008 的第 2 列（最低消費 1000，等於）是「差 1／剛好等於」邊界，依 R-007／R-008 pre_conditions 唯一推得。
  - 註：Q17 決策「最低消費設 0 合法」只寫在 R-017 的 pre_conditions 括號，沒有任何 Rule 的 post_assertions 給出 0 的成功結果，依 contract 3.5「Examples 必須由該 Rule 唯一推出」未產生該列。（矩陣表達上的小瑕疵，記錄之。）
- feature-lint：`[feature-lint] 通過：…已更新句型索引 .specengine/sdd/steps-index.json（11 個不重複句型）。` exit 0（一次通過）
- overview.md 狀態欄 → FORMALIZED。spec-status：
```text
模組 | 階段 | 待答 | 掛起 | 流程對齊 | 下一步
--- | --- | --- | --- | --- | ---
MULTI_TENANT_COUPON | FORMALIZED | 0 | 0 | ✓ | spec 04
```

spec-03 完成彙報原文：
```text
[Phase 03: Formalize Gherkin] 執行完成！模組：MULTI_TENANT_COUPON
產出：.specengine/spec/features/多租戶優惠券.feature
指標：Rule 19 條 ｜ Scenario/Outline 29 個（展開 43）｜ 句型 11 個（沿用 0 個）｜ PARKED 註解 0 個
Examples 核對：43 列，修正 0 列 ｜ feature-lint → PASS
階段：FORMALIZED
```

### spec-04【執行者】
- Step 0：manifest → BDD Framework @cucumber/cucumber（已安裝 11.3.0）、Binding Layer direct、Step Definitions `tests/steps/`、Test Identifier Language〔待確認〕→ 預設 en（kebab-case 英文檔名）。
- Step 1：`cucumber --dry-run --format snippets` 去重後 11 個未定義句型。
- 產出 tests/steps/multi-tenant-coupon.steps.ts（Step 11 個，每個附 @rule／@schema／@binds；direct 模式 @binds 寫 applyCoupons.applyCoupons；函式體一律拋 Contract Not Implemented）。Binding Layer direct → 跳過 Driver／fixture（Step 4）。
- 紅燈驗證：`npm test` → 43 scenarios (43 failed)、300 steps (43 failed, 257 skipped)；`npm run typecheck` → 通過。
- 試跑 snapshot（spec-04 完成條件）：
```text
[spec-guard] 已建立基準快照：
  - .specengine/spec/：5 個檔案（全字節凍結）
  - tests/steps/：1 個檔案、11 個 Step 句型（僅凍結句型）
  - Binding Layer 為 direct，略過 Driver 介面凍結
```
- spec-status：
```text
模組 | 階段 | 待答 | 掛起 | 流程對齊 | 下一步
--- | --- | --- | --- | --- | ---
MULTI_TENANT_COUPON | STUBBED | 0 | 0 | ✓ | spec 05
```

spec-04 完成彙報原文：
```text
[Phase 04: Generate Test Stub] 執行完成！模組：MULTI_TENANT_COUPON

1. 框架：@cucumber/cucumber 11.3.0（已安裝）；Binding Layer：direct
2. 產出：
   - tests/steps/multi-tenant-coupon.steps.ts（Step 11 個）
   - Driver 介面／實作／fixture：不適用（Binding Layer 為 direct）
3. 對齊 DBML 欄位 9 個，100% Red Stage
4. 模組階段狀態：STUBBED（已寫回 .specengine/sdd/overview.md）
```

### spec-05【執行者】
- Step 1：spec-guard snapshot（spec-05 正式基準）：
```text
[spec-guard] 已建立基準快照：
  - .specengine/spec/：5 個檔案（全字節凍結）
  - tests/steps/：1 個檔案、11 個 Step 句型（僅凍結句型）
  - Binding Layer 為 direct，略過 Driver 介面凍結
```
  紅燈基準：`npm test` → 43 scenarios (43 failed)，43 處皆為 Contract Not Implemented。
- Step 2：direct 模式，在 step 函式體呼叫 `applyCoupons`；產品碼 `src/coupon.ts`（依需求固定介面，含決策回溯註解）。
  - 程序偏差（如實記錄）：沒有逐切片紅綠，而是一次寫完所有檢查後重跑——第一次重跑即 43/43 綠。
  - 唯一紅燈：`npm run typecheck` 報 TS5097（step 檔 import `../../src/coupon.ts`，tsconfig 未開 allowImportingTsExtensions）→ 分類 (a) 程式錯，改為 `../../src/coupon.js`（tsx 可解析），typecheck 通過。
  - 未宣告 Property-Based Testing Library → 略過 property test。
- Step 3：全套 `npm test` 43 passed／300 steps passed；typecheck exit 0。
- Step 4：Binding Layer direct → 不做第二 Driver。
- Step 5：
  - verify：`[spec-guard] 通過：規格全字節未變，Step 句型未被改名/刪除/新增，Driver 介面未變。…` exit 0
  - lock：`[spec-guard] 已建立 lock：.specengine/sdd/locks/MULTI_TENANT_COUPON.lock.json（feature 1 個、Step 檔 1 個、Driver 介面 0 個）。此檔應進 git。` exit 0
  - overview.md → IMPLEMENTED；spec-status：`MULTI_TENANT_COUPON | IMPLEMENTED | 0 | 0 | ✓ | （已完工）`
- 形式化錯誤自修 0 件；規格瑕疵 0 件；snapshot 重建 0 次（spec-04 試跑的那次在 spec-05 Step 1 正常重建，不算規格變更）。

spec-05 完成彙報原文：
```text
[Phase 05: Coder Implement] 執行完成！模組：MULTI_TENANT_COUPON
測試（in-process）：Scenario 43 ｜ PASS 43 ｜ FAIL 0 ｜ 測試（ui|api）：未執行（Binding Layer 為 direct，無第二 Driver）
形式化錯誤自修：0 件（見 resolved/fixes/）｜ snapshot 重建：0 次
產品代碼：src/coupon.ts ｜ Driver 實作：無（direct）；Step 實作：tests/steps/multi-tenant-coupon.steps.ts
verify → PASS ｜ lock → .specengine/sdd/locks/MULTI_TENANT_COUPON.lock.json
階段：IMPLEMENTED
```

spec-run 完成彙報原文（第 2 次 spec-run）：
```text
[spec-run] 執行完成！模組：MULTI_TENANT_COUPON

起點：spec-flow-align（spec-status 推導：CLARIFIED、flowAligned false），起點之前階段略過

1. spec-01  → 略過（第 1 次 spec-run 已完成）
2. spec-02  → 略過（第 1 次 spec-run 已解決 15、另手動重跑 spec-02 解決 2；掛起 0）
3. flow-align → 完成（第 2 次確認通過；第 1 次發現缺口 2 而中止）
4. spec-03  → 完成（lint PASS）
5. spec-04  → 完成
6. spec-05  → 完成（全綠，verify PASS，lock 已建）

階段：IMPLEMENTED
```

---

## 工具錯誤與 Skill 文件矛盾／瑕疵
1. 【環境】Skill 工具指向 1.2.0，依指示改讀 2.0.0 的 SKILL.md；spec-run「用 Skill 工具執行」的步驟因此以「讀檔照做」替代。
2. 【環境】無 AskUserQuestion、無 TodoWrite 工具 → 以文字分組提問；Step 0 進度追蹤略過。
3. 【執行】session 兩次中斷（約 07:47、約 08:00），恢復後依落盤檔案接續，無重做。
4. 【執行】TS5097：step 檔 import `.ts` 副檔名與 tsconfig 不相容（npm test 綠但 typecheck 紅），改 `.js` 解決。spec-04 的 TypeScript 範例未提示 NodeNext 下的 import 副檔名慣例。
5. 【文件】spec-04 硬性約束 9 與完成條件要求「產出後自己先跑一次 snapshot」，spec-05 Step 1 又要跑 snapshot；兩者都會寫同一個快照檔，文件沒說明 spec-04 那次是否算「重建」。本次視為不算。
6. 【文件】spec-04 Step 3 要求 direct 模式 `@binds` 寫 `<Service>.<方法>`，但純函式沒有 Service，只能寫成 `applyCoupons.applyCoupons`（spec-guard 在 direct 模式不檢查 @binds，所以不會被抓）。
7. 【文件】spec-manifest-sync Step 3 規定 Driver Directory 掃不到候選時「同組加問一題」，但使用者在同組選了 direct 時那題就成了無效題；文件沒說 direct 時可省略。
8. 【文件】spec-02 Step 4 說「狀態欄在中途維持不動，只在佇列清空時改為 CLARIFIED」，flow-align Step 3 又要求退回 CLARIFYING；spec-status 每次都會報「狀態欄與推導不符」警告，spec-run Step 00 允許忽略，無實害。
9. 【文件】contract-rules 3.5「Examples 必須由該 Rule 唯一推出」與 spec-02「補充決策直接編進 pre_conditions」合在一起時，只寫在 pre_conditions 括號裡的合法值（Q17：最低消費 0 合法）沒有對應的 post_assertions，spec-03 無法為它產生 Example → 「最低消費 0 合法」沒有測試覆蓋。
10. 【執行／評測前提】manifest-sync 階段用 grep 查 answers.md 時，pattern 不小心印出整張答案表（第 1～21 行），執行者在 spec-01 之前就看到了答案（詳見階段 (a)「程序瑕疵」）。
11. 【執行】spec-01 overview 手算優先級（High 9／Medium 6）與 spec-status（High 10／Medium 5）不符，以腳本為準。
