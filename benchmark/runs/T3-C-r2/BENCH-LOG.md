# BENCH-LOG：T3-C-r2（SpecEngine 2.0.0 全流程）

- 開始時間：2026-10-20 07:43:50
- 結束時間：2026-10-20 15:25:36
- 執行方式：直接 Read plugin 根目錄 `<plugin>` 下的 skills/*/SKILL.md 逐字執行；不使用 Skill 工具（舊版 1.2.0）。
- 角色標記：【執行者】＝依 Skill 執行；【需求方】＝依 answers.md 回答。

---

## 0. 前置：讀取需求與 Skill 文件（【執行者】）

已讀：requirement.md、spec-manifest-sync / spec-run / spec-status / spec-01（含 references/devil-probes.md、mcq-file-format.md）/ spec-02 / spec-flow-align / spec-03（含 gherkin-structure-example.md）/ spec-04（含 typescript-stub-example.md）/ spec-05 的 SKILL.md、docs/contract-rules.md、templates/*、scripts/feature-lint.js、spec-guard.js、spec-status.js。

專案現況掃描：
- package.json：`@cucumber/cucumber ^11.3.0`（node_modules 實裝 11.3.0）、`tsx ^4.19.2`（實裝 4.23.15）、`typescript ^5.6.3`（實裝 5.9.3）、`@types/node`；scripts：`test` = `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js`、`typecheck` = `tsc --noEmit`；`"type": "module"`；未宣告 engines。
- cucumber.cjs：paths `.specengine/spec/features/**/*.feature`、`tests/features/**/*.feature`；import `tests/steps/**/*.ts`、`tests/support/**/*.ts`；format `json:reports/cucumber.json`。
- tsconfig.json：include `src/**/*.ts`、`tests/**/*.ts`，strict，NodeNext。
- 目錄：`src/index.ts`（空殼）、`tests/steps/`（空）、`tests/support/`（空）、`reports/cucumber.json`。無 `.claude/`、`.specengine/`、`CLAUDE.md`。
- node 本機版本 v24.18.0。
- 依賴清單查無 DB／ORM／斷言／property-based 套件。

---

## 1. spec-manifest-sync（【執行者】）

- 恢復時間：2026-10-20 07:51:52（上一個 session 約於 07:47 意外中斷；中斷前已落地 `.claude/spec/architecture-manifest.md` 初稿與 `CLAUDE.md`，中斷後確認檔案完整，從 Step 3 必填欄位提問處續跑）
- Step 0a：manifest 不存在 → 從範本落地（首次建立）。
- Step 0b：CLAUDE.md 不存在 → 從範本新建，`{{PLUGIN_VERSION}}` → 2.0.0；`.claude/skills/` 不存在，`{{EXISTING_TOOLS_NOTE}}` 整行移除。
- Step 1～2 掃描結果：見下方「變更明細」。
- Step 3 必填欄位提問（文字一次列出，共 2 題）：

### Q&A（manifest-sync）

**【執行者】問 Q1**：Binding Layer（Step Definitions 如何接到被測系統）？[A] driver（選此項需填 Driver Directory，掃不到候選目錄，見 Q2）[B] direct（step 直接呼叫 src/ 的函式，無 Driver 層；本專案是純函式、無 UI）[C] 其他
**【需求方】答**：表上沒有此題，屬技術環境問題，照專案實際狀況回答：**B direct**（專案為純函式、無 UI、極小）。

**【執行者】問 Q2**：Driver Directory（僅 Q1 選 driver 時需要；tests/ 下只有 steps/ 與 support/，無候選）？[A] tests/drivers/ [B] tests/support/ [C] 其他
**【需求方】答**：Q1 已選 direct，**不需要**。

- 備註（工具／流程事件）：需求方翻表時為了解 answers.md 的格式先 grep 了標題與表格列，因該檔整份就是一張表格，整表內容一次被印出。執行者後續階段（spec-01 掃盲點、spec-02 提問）仍只依需求文件與探測清單自行判斷題目，不以該表為題庫；需求方只對「實際被問到」的題翻表回答。
- 腳本解析自檢：以 spec-guard／spec-status 相同的解析邏輯讀 manifest → Step Definitions Directory = `tests/steps/`、Source Root = `src/`、Binding Layer = direct。OK。

### 完成彙報原文

```text
[spec-manifest-sync] 執行完成！
模式：manifest 首次建立 ｜ CLAUDE.md 區塊 首次插入（v2.0.0）
核實：待核實 30 項 ｜ 已更新 10 項 ｜ 仍待確認 20 項 ｜ 必填缺口 1 項（已問／已填）
變更明細：
  - 第 1 節「Source Root Directory」：〔待確認〕 → `src/`（直接證據：README 明載、tsconfig include）
  - 第 1 節「Test Root Directory」：〔待確認〕 → `tests/`（直接證據：README、tsconfig include）
  - 第 1 節「Step Definitions Directory」：〔待確認〕 → `tests/steps/`（直接證據：cucumber.cjs import、README）
  - 第 2 節「Primary Language & Runtime」：〔待確認〕 → TypeScript ^5.6.3（直接證據）＋ Node.js v24.18.0（本機實測，package.json 未宣告 engines）＋ ESM／tsx（直接證據）
  - 第 2 節「Database Engine」「Data Access & ORM」「UI Component Framework」：〔待確認〕 → 〔待確認〕（補註：依賴清單查無對應套件）
  - 第 3 節「Backend Classes…」「Test Functions…」「Code File Names」：〔待確認〕 → 〔待確認〕（補註：src/ 僅空殼 index.ts、tests/ 為空，無樣本可抽）
  - 第 5 節「BDD Execution Framework」：〔待確認〕 → `@cucumber/cucumber` ^11.3.0（直接證據：package.json、cucumber.cjs；實裝 11.3.0）
  - 第 5 節「Assertion Library」：〔待確認〕 → 〔待確認〕（補註：Node 內建 `node:assert/strict` 為唯一候選，待測試碼進駐後核實）
  - 第 5 節「Test Execution Command」：〔待確認〕 → `npm test`（直接證據：package.json scripts.test）
  - 第 5 節「Test Report Path」：〔待確認〕 → `reports/cucumber.json`（直接證據：cucumber.cjs format）
  - 第 5 節「Property-Based Testing Library」：〔待確認〕 → 〔待確認〕（補註：查無套件，spec 05 略過）
  - 第 5 節「Binding Layer」：〔待確認〕 → `direct`（使用者決定，Q1）
  - 第 5 節「Driver Directory」：〔待確認〕 → 不適用（Binding Layer 為 direct）
仍待確認：
  - 第 1 節「Architecture Pattern」：無證據，屬團隊決策
  - 第 2 節「Database Engine」「Data Access & ORM」「Schema Migration Command」「Seed Script Command」「UI Component Framework」「CSS / Styling Solution」：依賴清單查無對應套件
  - 第 3 節 命名慣例各項與「Test Identifier Language」：無程式碼樣本；識別字語言屬團隊決策（spec 04 預設 en）
  - 第 4 節「API Interface Standard」「Error Response Format」：無證據
  - 第 5 節「Assertion Library」「Property-Based Testing Library」「Test Data Seeding Strategy」「Test Database Isolation」「Test Double Strategy」「Schema Introspection Command」：無證據或屬團隊決策
  - 第 6 節 三項：無證據
未修改上述兩個目標以外的任何檔案。
```

---

## 2. spec-run（【執行者】）

- Step 00 起點判定：`node spec-status.js --json` → stderr「找不到 .specengine/sdd/matrix/，尚無任何模組冷啟動過。」exit=2 → 起點 spec-01。
- Step 0：無 TodoWrite 工具，略過。

### 2.1 spec-01 Discovery Bootstrap

- 純掃描，未提問。MODULE_ID 鎖定 `MULTI_TENANT_COUPON`（多租戶優惠券）。
- 產出：matrix/MULTI_TENANT_COUPON.json（8 Rules：R-000 主流程、R-001 租戶不符、R-002 有效期間、R-003 不可疊加限一張、R-004 可疊加多張、R-005 百分比以折扣前金額計算、R-006 固定金額不得低於 0、R-007 最低消費）、spec/erm.dbml（tenants／coupons／orders，3 Tables）、spec/terms.md（16 術語）、spec/exclusions.md（X-001 純函式不碰 DB）、spec/policy-defaults.md（空表頭）、sdd/features/ 13 題、sdd/data/ 3 題、overview/MULTI_TENANT_COUPON.md、overview.md。
- 探測清單：冪等性／副作用／資料生命週期因純函式不適用，於模組總覽註明。
- `feature-lint.js` → 「通過：…已更新句型索引 .specengine/sdd/steps-index.json（0 個不重複句型）」exit=0。
- `spec-status.js` → `MULTI_TENANT_COUPON | CLARIFYING | 16（Medium 4 / Low 1 / High 11） | 0 | — | spec 02`，無 warnings。

完成彙報原文：

```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：MULTI_TENANT_COUPON

矩陣：8 條 Rules ｜ erm.dbml：3 個 Tables ｜ terms.md：16 個術語 ｜ exclusions：1 條 ｜ 套用慣例：0 項
待答：16 題（High 11 ｜ Medium 4 ｜ Low 1）
階段：CLARIFYING
```

### 2.2 spec-02 Interactive Clarify

- Step 0：`spec-status --json` → pending 16，僅一個模組 → 自動鎖定 MULTI_TENANT_COUPON。
- Step 1：依定位分 6 組（見 overview/MULTI_TENANT_COUPON.md 建議提問順序）。無 AskUserQuestion 工具，文字一次印一組。

#### 第 1 組（R-001／R-002 租戶與有效期間）

**【執行者】問 Q1（High）**：傳入的券裡有一張屬於別的租戶時，整筆結帳怎麼回？[A] 整筆拒絕（請附失敗原因文案）[B] 略過那張，其餘照套 [C] 整筆拒絕並附上是哪張 [Short]
**【需求方】答**：1A，reason 固定為 `TENANT_MISMATCH`。

**【執行者】問 Q2（High）**：有一張券過期或還沒生效時，整筆結帳怎麼回？[A] 整筆拒絕，過期與未生效共用一個原因（請附文案）[B] 整筆拒絕，兩個不同原因 [C] 略過那張 [Short]
**【需求方】答**：2A，reason 固定為 `COUPON_EXPIRED`（未生效也用同一代碼）。

**【執行者】問 Q3（High）**：結帳時間剛好等於有效期間的起或迄那一刻，算有效嗎？[A] 含頭含尾都有效 [B] 含頭不含尾 [C] 頭尾都不算 [Short]
**【需求方】答**：3A，都算有效（含頭含尾），validFrom ≤ now ≤ validTo。

寫回（07:59）：R-001 post → 整筆拒絕 TENANT_MISMATCH；R-002 pre 含頭含尾、post 整筆拒絕 COUPON_EXPIRED；terms MSG-001、MSG-002；POLICY-001（有效期間含頭含尾）；3 題歸檔 resolved/features/。lint → PASS（見下）。

#### 第 2 組（R-003 疊加規則）

**【執行者】問 Q4（High）**：一筆訂單同時傳入兩張以上「不可疊加」的券，系統怎麼反應？[A] 整筆拒絕（請附文案）[B] 只套傳入順序的第一張 [C] 只套折扣最大的那張 [Short]
**【需求方】答**：4A，reason 固定為 `NOT_STACKABLE`。

**【執行者】問 Q5（High）**：一張不可疊加券 + 一張以上可疊加券一起傳，能不能一起用？[A] 不能，整筆拒絕（請附文案）[B] 可以，不可疊加只限制同類不超過一張 [C] 只套那張不可疊加券 [Short]
**【需求方】答**：5A，整筆拒絕，不可疊加的券只能單獨用，reason `NOT_STACKABLE`。

寫回：R-003 post → 整筆拒絕 NOT_STACKABLE；新增 R-008（混用 → NOT_STACKABLE）；terms MSG-003；2 題歸檔。

- **恢復時間：2026-10-20 15:15:01**（外部 API 限額中斷，約在 08:00 前後中斷；恢復後確認第 2 組寫回與歸檔已落盤：佇列剩 features 8 題、data 3 題，矩陣 9 條 Rule）。
- lint（第 2 組寫回後，恢復時補跑）→ 「通過…（0 個不重複句型）」exit=0。

#### 第 3 組（R-005／R-006 金額計算）

**【執行者】問 Q6（High）**：百分比折扣算出小數（例如 333 元打 10% = 33.3 元）怎麼取整？[A] 每張各自無條件捨去再加總 [B] 每張各自四捨五入再加總 [C] 全部加總後才一次捨去 [Short]
**【需求方】答**：6A，每張 PERCENT 的折扣額各自無條件捨去取整數。

**【執行者】問 Q7（High）**：折扣總額超過訂單金額時，系統怎麼反應？[A] 整筆拒絕（請附文案）[B] 截斷讓折扣後金額為 0 [C] 略過造成超額的那張 [Short]
**【需求方】答**：7A，整筆拒絕，reason 固定為 `DISCOUNT_EXCEEDS_AMOUNT`。

**【執行者】問 Q8（High）**：折扣總額剛好等於訂單金額（折扣後 0 元）算成功嗎？[A] 成功，finalAmount = 0 [B] 跟超過一樣擋 [C] 另一個失敗原因 [Short]
**【需求方】答**：8A，總折扣剛好等於訂單金額可以，finalAmount = 0。

#### 第 4 組（R-007 最低消費）

**【執行者】問 Q9（High）**：最低消費用折扣前還是折扣後的金額判定？剛好等於算達標嗎？[A] 折扣前、等於算達標 [B] 折扣前、等於不算 [C] 扣掉其他券後、等於算達標 [Short]
**【需求方】答**：9A，以折扣前訂單金額判定；等於可以。

**【執行者】問 Q10（High）**：有一張券未達最低消費時，整筆結帳怎麼回？[A] 整筆拒絕（請附文案）[B] 略過那張，其餘照套 [C] 整筆拒絕並附上是哪張 [Short]
**【需求方】答**：10A，未達時整筆拒絕，reason 固定為 `MIN_ORDER_NOT_MET`。

#### 第 5 組（R-000 輸入組合）

**【執行者】問 Q11（High）**：同一張券（同租戶 + 同代碼）在清單裡出現兩次怎麼處理？[A] 整筆拒絕（請附文案）[B] 去重只算一次 [C] 各算一次 [Short]
**【需求方】答**：11A，整筆拒絕，reason 固定為 `DUPLICATE_COUPON`。

**【執行者】問 Q12（Medium）**：沒傳任何券（空清單）時回成功還是失敗？[A] 成功：finalAmount = 訂單金額、discount = 0、applied = [] [B] 失敗（請附文案）[Short]
**【需求方】答**：12A，成功。finalAmount = orderAmount，discount = 0，applied = []。

**【執行者】問 Q13（Medium）**：同一筆結帳同時有多種問題時，回報哪個失敗原因？[A] 依固定檢查順序回報第一個命中的（請附順序）[B] 全部一起回報 [C] 依傳入券的順序回報第一張有問題的 [Short]
**【需求方】答**：13A，順序為 `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。

#### 第 6 組（資料類：輸入值合法性）

**【執行者】問 Q14（Medium）**：訂單金額為 0、負數或非整數時怎麼處理？[A] 一律拒絕（請附文案）[B] 0 合法、負數與非整數拒絕 [C] 不檢查 [Short]
**【需求方】答**：14A，拒絕，reason 固定為 `INVALID_INPUT`。

**【執行者】問 Q15（Medium）**：券的折扣值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）時怎麼處理？[A] 整筆拒絕（請附文案）[B] 略過那張 [C] 不檢查 [Short]
**【需求方】答**：15A，拒絕，reason 固定為 `INVALID_COUPON`。

**【執行者】問 Q16（Low）**：now、validFrom、validTo 不是合法 ISO 8601（解析不了）時怎麼處理？[A] 整筆拒絕（請附文案）[B] 當作不在有效期間 [C] 不檢查 [Short]
**【需求方】答**：（表上沒有，業務問題）你決定，照你的最佳判斷。
**【執行者】裁量**：選 A，並沿用已定的代碼不新增文案：now 解析失敗 → `INVALID_INPUT`（屬結帳輸入）；券的 validFrom／validTo 解析失敗 → `INVALID_COUPON`（屬券本身不合法）。決策檔註明「使用者授權執行者裁量」。

寫回（第 3～6 組依序逐組寫回，同一輪完成）：見下方「spec-02 寫回摘要」。

#### spec-02 寫回摘要（2026-10-20 15:16）

- 矩陣：修改 R-000（公式：PERCENT 各自 floor 加總 + FIXED 加總）、R-005（floor）、R-006（拒絕 DISCOUNT_EXCEEDS_AMOUNT；剛好等於 OK）、R-007（折扣前、≥ 達標；拒絕 MIN_ORDER_NOT_MET）；新增 R-009（空券成功）、R-010（DUPLICATE_COUPON）、R-011（INVALID_INPUT）、R-012（INVALID_COUPON）、R-013（檢查順序）。共 14 條。
- terms.md 固定文案 MSG-004～MSG-008；policy-defaults.md POLICY-002～006；erm.dbml 3 欄 note（coupons.value、valid_from／valid_to、orders.amount）。
- 11 題歸檔（resolved/features 8、resolved/data 3）。
- `feature-lint.js` → 通過 exit=0；`spec-status.js` → `MULTI_TENANT_COUPON | CLARIFIED | 0 | 0 | — | spec flow-align`。
- Step 5：14 條 Rule ≥ 4 → 不走精簡確認，需 spec flow-align。

完成彙報原文：

```text
[Phase 02: Interactive Clarify] 執行完成！模組：MULTI_TENANT_COUPON

決策：已解決 16 項 ｜ 掛起 0 項 ｜ 晉升慣例 6 項
寫回：matrix（+6 新增／8 修改）｜ exclusions（+0）｜ erm.dbml（4 欄異動）｜ terms.md（+0 術語、+8 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

（註：matrix「+6 新增」= R-008～R-013；「8 修改」= R-000～R-007。）

### 2.3 spec-flow-align（第 1 次）

- Step 0：`spec-status --module MULTI_TENANT_COUPON --json` → pending 0、flowAligned false；索引檔不存在，無前次裁示可沿用。
- Step 1～2：分 4 個流程階段，印出流程圖與白話複述（全文見 `.specengine/sdd/flow-design/MULTI_TENANT_COUPON.md` 與各階段檔），並列出執行者疑似缺口：
  - (a) 券的最低消費金額 minOrderAmount 本身不合法（負數、非整數）時怎麼處理，矩陣未定義。
  - (b) 券的有效期間顛倒（validFrom 晚於 validTo）時怎麼處理，矩陣未定義（依現有 R-002 會落入 COUPON_EXPIRED，但這是否為使用者本意未確認）。

**【執行者】問 FA-1**：(1) 有沒有遺漏的分支、使用者行為或畫面狀態？（含疑似缺口 (a)(b) 的裁示）(2) 圖上有沒有跟你原本設想不一致的地方？沒問題請回覆「確認」；有缺口請直接描述。
**【需求方】答**：（表上沒有流程圖確認題，屬業務問題）你決定，照你的最佳判斷。
**【執行者】裁量**：使用者授權執行者判斷。(2) 圖未被指出不一致 → 4 張圖視為「已確認無不一致」並保存。(1) 執行者判斷 (a)(b) 都是真實缺口（會影響回傳結果，且矩陣只看得出 (b) 的偶然結果、看不出 (a)），依硬性約束 3 不腦補，建 MCQ 退回 spec-02。

- 落盤：flow-design/MULTI_TENANT_COUPON.md（「狀態：未通過（缺口 2）」＋已確認 4 張圖）、data/ 新增 2 題（來源 spec-flow-align）、overview 退回 CLARIFYING。

完成彙報原文：

```text
🔁 [Phase Flow-Align] 發現缺口，狀態已退回 CLARIFYING！模組：MULTI_TENANT_COUPON
缺口：優惠券最低消費金額本身不合法（負數、非整數）未定義；優惠券有效期間起迄顛倒未定義
已新增 MCQ：2 項 ｜ 已保存裁示：非缺口 0 條、已確認圖 4 張（下次重畫沿用）
```

spec-run 中止彙報原文：

```text
[spec-run] 已於 spec-flow-align 中止，原因：流程對齊發現缺口
已完成：spec-01、spec-02、spec-flow-align（未通過）；未執行：spec-03、spec-04、spec-05
```

依 flow-align 指示：重跑 spec-02 → 再 spec-run。

### 2.4 spec-02（第 2 輪，處理 flow-align 缺口）

- Step 0：`spec-status --json` → pending 2，自動鎖定 MULTI_TENANT_COUPON。
- 1 組（定位：券本身合法性 R-012）。

**【執行者】問 Q17（Medium）**：券的「最低消費金額」本身填錯（負數、非整數，例如 -100、99.5）時怎麼處理？0 算合法嗎？[A] 負數或非整數視為券不合法，整筆拒絕 INVALID_COUPON；0 合法（等於無門檻）[B] 負數、0、非整數都視為不合法 INVALID_COUPON [C] 不檢查，照最低消費規則比 [Short]
**【需求方】答**：（表上沒有，業務問題）你決定，照你的最佳判斷。
**【執行者】裁量**：A。理由：與 R-012「券本身不合法 → INVALID_COUPON」一致；0 元門檻語意上等同無門檻，不必擋。

**【執行者】問 Q18（Low）**：券的有效期間起迄顛倒（起 晚於 迄）時怎麼處理？[A] 視為券不合法，整筆拒絕 INVALID_COUPON [B] 維持現狀，自然落入 COUPON_EXPIRED [Short]
**【需求方】答**：（表上沒有，業務問題）你決定，照你的最佳判斷。
**【執行者】裁量**：A。理由：這是券資料錯誤而非時間問題，且 INVALID_COUPON 在檢查順序中排在 COUPON_EXPIRED 之前，結果可預期。

- 寫回（15:19）：R-012 pre_conditions 增列「起迄顛倒」「minOrderAmount 負數或非整數（0 合法）」；erm.dbml coupons.valid_from、stackable、min_order_amount note；2 題歸檔 resolved/data/；overview → CLARIFIED。
- `feature-lint.js` → 通過 exit=0；`spec-status.js` → `MULTI_TENANT_COUPON | CLARIFIED | 0 | 0 | — | spec flow-align`。

完成彙報原文：

```text
[Phase 02: Interactive Clarify] 執行完成！模組：MULTI_TENANT_COUPON

決策：已解決 2 項 ｜ 掛起 0 項 ｜ 晉升慣例 0 項
寫回：matrix（+0 新增／1 修改）｜ exclusions（+0）｜ erm.dbml（3 欄異動）｜ terms.md（+0 術語、+0 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

### 2.5 spec-run（第 2 次）

- Step 00：`spec-status --json` → stage CLARIFIED、next `spec flow-align`、warnings []。起點 spec-flow-align，spec-01、spec-02 略過。

### 2.6 spec-flow-align（第 2 次）

- Step 0：pending 0、flowAligned false；索引存在且「未通過」→ 沿用「已確認無不一致的流程圖」4 張。因 R-012 於第 2 輪修改，「輸入合法性檢查」圖重畫並重新請確認；其餘 3 張標註「上次已確認」。
- 已知取捨：X-MULTI_TENANT_COUPON-001（純函式不碰 DB）。
- 執行者疑似缺口：無（第 1 次的 2 個已解決）。

**【執行者】問 FA-2**：(1) 有沒有遺漏的分支、使用者行為或畫面狀態？(2) 圖上（特別是重畫的「輸入合法性檢查」）有沒有跟你原本設想不一致的地方？沒問題請回覆「確認」；有缺口請直接描述。
**【需求方】答**：（表上沒有流程圖確認題，屬業務問題）你決定，照你的最佳判斷。
**【執行者】裁量**：無疑似缺口、圖與矩陣逐一核對一致 → 判定通過，進入 Step 4 落盤。

- 落盤：flow-design/MULTI_TENANT_COUPON.md（「狀態：已通過 ｜ 確認時間：2026-10-20 15:19 ｜ Rule 總數：14」）＋ flow-design/MULTI_TENANT_COUPON/{輸入合法性檢查,優惠券資格驗證,疊加規則,折扣計算與成交}.md。

完成彙報原文：

```text
✅ [Phase Flow-Align] 執行完成！模組：MULTI_TENANT_COUPON
涵蓋 Rule：14 條 ｜ 流程階段：4 個 ｜ 已知取捨：1 條 ｜ 本輪新增範圍外裁示：0 條
產出：flow-design/MULTI_TENANT_COUPON.md（已通過）＋ flow-design/MULTI_TENANT_COUPON/*.md ×4
```

### 2.7 spec-03 Formalize Gherkin

- Step 0：`spec-status` → next `spec 03`、flowAligned true。steps-index.json 為 `{}`（無既有句型可沿用）；parked/ 空。
- Step 3b Examples 逐列核對：40 列 Examples＋17 個單一 Scenario 的期望值逐一代入矩陣 pre/post 核算（例：R-005 333×15% = 49.95 → 49，兩張 98，final 235；R-006 PERCENT 60+41 → 600+410 = 1010 > 1000 拒絕；R-013 每個 Scenario 只同時命中相鄰兩個錯誤，確認回報順序前者）。修正 0 列。
- `feature-lint.js` → 「通過：…已更新句型索引 .specengine/sdd/steps-index.json（10 個不重複句型）」exit=0。
- overview.md → FORMALIZED；`spec-status` → `FORMALIZED | 0 | 0 | ✓ | spec 04`。

完成彙報原文：

```text
[Phase 03: Formalize Gherkin] 執行完成！模組：MULTI_TENANT_COUPON
產出：.specengine/spec/features/多租戶優惠券.feature
指標：Rule 14 條 ｜ Scenario/Outline 29 個（展開 57）｜ 句型 10 個（沿用 0 個）｜ PARKED 註解 0 個
Examples 核對：57 列，修正 0 列 ｜ feature-lint → PASS
階段：FORMALIZED
```

### 2.8 spec-04 Generate Test Stub

- Step 0：manifest → Step Definitions `tests/steps/`、Binding Layer `direct`（跳過 Driver 層 Step 4）、BDD `@cucumber/cucumber` 11.3.0 已安裝、Assertion Library〔待確認〕（用 Node 內建 `node:assert/strict`，不引入新套件）、Test Identifier Language〔待確認〕→ 預設 `en`。
- Step 1：`node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --dry-run --format snippets` 去重得 10 個句型（與 steps-index 一致）。
- Step 3：`tests/steps/multi-tenant-coupon.steps.ts`（10 個 Step，各附 @rule／@schema／@binds；direct 模式函式體全部拋 `Contract Not Implemented`）。狀態隔離：`tests/support/coupon-world.ts`（Cucumber World，cucumber.cjs 的 import 已涵蓋 `tests/support/**/*.ts`）。
- Step 4：Binding Layer = direct → 跳過 Driver 層。
- `npm run typecheck` → exit 0。`npm test` → `57 scenarios (57 failed)`、`405 steps (57 failed, 348 skipped)`，57 個失敗全為 Contract Not Implemented。
- `spec-guard.js snapshot`（spec-04 自檢）→ 「已建立基準快照：.specengine/spec/ 5 個檔案（全字節凍結）；tests/steps/ 1 個檔案、10 個 Step 句型；Binding Layer 為 direct，略過 Driver 介面凍結」exit 0。
- overview.md → STUBBED；`spec-status` → `STUBBED | 0 | 0 | ✓ | spec 05`。

完成彙報原文：

```text
[Phase 04: Generate Test Stub] 執行完成！模組：MULTI_TENANT_COUPON

1. 框架：@cucumber/cucumber 11.3.0（已安裝）；Binding Layer：direct
2. 產出：
   - tests/steps/multi-tenant-coupon.steps.ts（Step 10 個）
   - Driver 層：不適用（direct）
   - tests/support/coupon-world.ts（World，新建；cucumber.cjs import 已涵蓋）
3. 對齊 DBML 欄位 10 個，100% Red Stage（57/57 Contract Not Implemented）
4. 模組階段狀態：STUBBED（已寫回 .specengine/sdd/overview.md）
```

### 2.9 spec-05 Coder Implement

- Step 1：`spec-guard.js snapshot` → 「.specengine/spec/：5 個檔案（全字節凍結）；tests/steps/：1 個檔案、10 個 Step 句型；Binding Layer 為 direct，略過 Driver 介面凍結」exit 0。`npm test` → 57 scenarios (57 failed)，100% Red。
- Step 2 切片 1（R-000／004／005／006／009 折扣計算）：新增 `src/coupon.ts`（型別照需求原樣、applyCoupons 計算部分），填 step 函式體（direct 直接呼叫 applyCoupons，斷言用 `node:assert/strict`）。→ typecheck exit 0；`57 scenarios (33 failed, 24 passed)`。33 個紅燈全是驗證類 Rule 尚未實作，屬 (a) 程式未完成，非形式化錯誤、非規格瑕疵。
- Step 2 切片 2（R-001／002／003／007／008／010／011／012／013 驗證鏈，依 R-013 順序）：→ typecheck exit 0；`57 scenarios (57 passed)`、`405 steps (405 passed)`。
- Property test：manifest 未宣告 Property-Based Testing Library → 略過。
- Step 3：全綠，無需重構。Step 4：Binding Layer direct → 無第二 Driver，僅 in-process（direct）綠燈。
- Step 5：`spec-guard.js verify` → 「通過：規格全字節未變，Step 句型未被改名/刪除/新增，Driver 介面未變。…」exit 0；`spec-guard.js lock MULTI_TENANT_COUPON` → 「已建立 lock：.specengine/sdd/locks/MULTI_TENANT_COUPON.lock.json（feature 1 個、Step 檔 1 個、Driver 介面 0 個）」exit 0。overview.md → IMPLEMENTED。
- 收尾：`spec-status` → `MULTI_TENANT_COUPON | IMPLEMENTED | 0 | 0 | ✓ | （已完工）`；`feature-lint` → 通過 exit 0。
- 形式化錯誤自修 0 件；snapshot 重建 0 次（spec-04 自檢建一次、spec-05 Step 1 正式建一次，屬開工基準，非重建）。

完成彙報原文：

```text
[Phase 05: Coder Implement] 執行完成！模組：MULTI_TENANT_COUPON
測試（in-process）：Scenario 57 ｜ PASS 57 ｜ FAIL 0 ｜ 測試（ui|api）：未執行（Binding Layer 為 direct，manifest UI／API 欄位皆〔待確認〕）
形式化錯誤自修：0 件（見 resolved/fixes/）｜ snapshot 重建：0 次
產品代碼：src/coupon.ts ｜ Driver 實作：不適用（direct；step 函式體 tests/steps/multi-tenant-coupon.steps.ts）
verify → PASS ｜ lock → .specengine/sdd/locks/MULTI_TENANT_COUPON.lock.json
階段：IMPLEMENTED
```

### 2.10 spec-run 總彙報（第 2 次）

```text
[spec-run] 執行完成！模組：MULTI_TENANT_COUPON

起點：spec-flow-align（spec-status 推導：CLARIFIED、flowAligned false），起點之前階段略過

1. spec-01  → 略過（第 1 次 spec-run 已完成）
2. spec-02  → 略過（第 1 次 spec-run 已解決 16、掛起 0；flow-align 缺口後獨立重跑第 2 輪已解決 2、掛起 0）
3. flow-align → 完成（第 2 次，已通過）
4. spec-03  → 完成（lint PASS）
5. spec-04  → 完成
6. spec-05  → 完成（全綠，verify PASS，lock 已建）

階段：IMPLEMENTED
```

---

## 3. 結束

- 結束時間：2026-10-20 15:25:36
- 中斷紀錄：07:47 前後 session 意外結束（恢復 07:51:52）；08:00 前後外部 API 限額中斷（恢復 15:15:01）。兩次皆從中斷處續跑，未重頭開始。

## 4. 工具錯誤與 Skill 文件矛盾／模糊處

工具錯誤：
- 無指令失敗。所有 lint／guard／status／typecheck／test 指令皆 exit 0（spec-status 首次 exit 2 為預期的「尚無矩陣」）。
- 流程事件：需求方首次翻 answers.md 查 Binding Layer 時用 grep 印標題與表格列，因整份檔就是一張表，所有題目與答案被一次印出（見第 1 節備註）。之後的提問仍以需求文件與探測清單為依據；但執行者「沒看過答案」的前提已被破壞，評測時應把這點納入考量。

Skill 文件矛盾／模糊：
1. spec-run Step 1～5 寫「用 Skill 工具執行」各階段，與本次「直接讀 SKILL.md、不用 Skill 工具」的執行方式不同（照評測指示處理）。
2. 需求方回答「你決定」時，spec-02 硬性約束「必須等使用者實際輸入、禁止代答」、spec-flow-align「真實等待確認」、spec-run「不得代答」都沒定義「使用者授權執行者裁量」怎麼處理。本次做法：視為使用者已實際回答並授權，執行者裁量並在決策檔與 flow-design 索引註明「使用者授權執行者裁量」。
3. spec-04 direct 模式：`@binds` 規定寫 `<Service>.<方法>`，但只組裝輸入的 Given 步驟並不呼叫 Service，格式不明（本次寫 `coupon.applyCoupons（組裝 ApplyInput.xxx）`）。
4. spec-04 direct 模式跳過整個 Step 4（含 fixture 接線），但硬性約束 6 要求跨步驟狀態放 World／fixture，沒說 direct 模式下 World 放哪（本次放 `tests/support/coupon-world.ts`，cucumber.cjs 已 import）。
5. spec-04 完成條件要求「spec-guard.js snapshot 可成功建立」（自檢），spec-05 Step 1 又要 snapshot，沒說 spec-04 的自檢快照算不算基準；spec-05 彙報的「snapshot 重建次數」因此有歧義（本次記 0，兩次都是開工前）。
6. spec-02 完成彙報的「已解決 X 項」沒說是本輪還是累計；flow-align 退回後第 2 輪 spec-02 的彙報本次寫本輪數字（2）。
7. spec-02 Step 4 要「每組答案被接受後立即寫回」，但同一回合多組回答時，「立即」的粒度沒定義。本次第 1～2 組逐組寫回並跑 lint；第 3～6 組在中斷恢復後依序一次寫回，然後跑一次 lint。
8. spec-run Step 2b 寫「由使用者重新執行 spec 02 後再 spec run，不自動迴圈」；評測指示要求執行者自己重跑。本次照評測指示重跑，並把兩次 spec-run 分開記錄。


