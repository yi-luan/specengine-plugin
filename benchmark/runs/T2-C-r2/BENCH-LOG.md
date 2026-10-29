# BENCH-LOG：T2-C-r2（SpecEngine 2.0.0 全流程）

- 開始時間：2026-10-20 02:45:15
- 結束時間：2026-10-20 07:43:01
- 角色切換紀錄：以「【執行者】」「【需求方】」標示。

## 0. 環境
- 專案：bench-points（TypeScript + cucumber-js 11，Node 24 + tsx）
- 需求：訂單狀態機（bench/t2/requirement.md）
- Plugin：SpecEngine 2.0.0（唯讀，`${CLAUDE_PLUGIN_ROOT}` = <plugin>）

## 1. spec-manifest-sync（首次導入）

【執行者】讀取 skills/spec-manifest-sync/SKILL.md、templates/*、plugin.json（2.0.0）。
Step 0a：`.claude/spec/architecture-manifest.md` 不存在 → 從範本落地。
Step 0b：`CLAUDE.md` 不存在 → 範本替換 `{{PLUGIN_VERSION}}`=2.0.0，無既有 `.claude/skills/` 工具 → `{{EXISTING_TOOLS_NOTE}}` 整行移除，新建 CLAUDE.md。
Step 1~2 掃描：package.json / cucumber.cjs / tsconfig.json / README.md / node --version / node_modules 實際版本。

### 問答
- **Q1（manifest-sync 必填欄位，一組問完）**
  - 執行者問：Binding Layer 要 `driver`（選此項則 Driver Directory 填下一題答案）還是 `direct`？Driver Directory（掃不到候選目錄）要 `tests/drivers/` 還是其他？
  - 需求方答（技術環境題，照專案實況）：Binding Layer = `direct`（純函式模組、無 UI、極小專案）；Driver Directory 不適用。

### 完成彙報原文
```text
[spec-manifest-sync] 執行完成！
模式：manifest 首次建立 ｜ CLAUDE.md 區塊 首次插入
核實：待核實 31 項 ｜ 已更新 16 項 ｜ 仍待確認 15 項 ｜ 必填缺口 1 項（已問／已填）
變更明細：
  - 第 1 節「Architecture Pattern」：〔待確認〕 → 單一套件、純函式模組（唯一候選，待程式碼進駐後核實）
  - 第 1 節「Source Root Directory」：〔待確認〕 → `src/`（直接證據：README、tsconfig include）
  - 第 1 節「Test Root Directory」：〔待確認〕 → `tests/`（直接證據：tsconfig include、cucumber.cjs import）
  - 第 1 節「Step Definitions Directory」：〔待確認〕 → `tests/steps/`（直接證據：cucumber.cjs import、README；目錄尚未建立）
  - 第 2 節「Primary Language & Runtime」：〔待確認〕 → TypeScript 5.9.3（package.json ^5.6.3）／Node.js v24.18.0（本機實測，package.json 未宣告 engines）／tsx 4.23.15
  - 第 2 節「Database Engine」：〔待確認〕 → 無（唯一候選：package.json 無任何 DB 驅動）
  - 第 2 節「Data Access & ORM」：〔待確認〕 → 無（唯一候選）
  - 第 2 節「UI Component Framework」：〔待確認〕 → 無（唯一候選）
  - 第 2 節「CSS / Styling Solution」：〔待確認〕 → 無（唯一候選）
  - 第 5 節「BDD Execution Framework」：〔待確認〕 → `@cucumber/cucumber` 11.3.0（直接證據：package.json、cucumber.cjs）
  - 第 5 節「Assertion Library」：〔待確認〕 → `node:assert/strict`（唯一候選：package.json 未列斷言套件）
  - 第 5 節「Test Execution Command」：〔待確認〕 → `npm test`（直接證據：package.json scripts.test）
  - 第 5 節「Test Report Path」：〔待確認〕 → `reports/cucumber.json`（直接證據：cucumber.cjs format）
  - 第 5 節「Binding Layer」：〔待確認〕 → `direct`（使用者決策 Q1）
  - 第 5 節「Driver Directory」：〔待確認〕 → 不適用（Binding Layer 為 direct）
  - CLAUDE.md：不存在 → 新建，插入 <!-- SPECENGINE:BEGIN v2.0.0 --> ... <!-- SPECENGINE:END --> 區塊（無既有工具註記）
仍待確認：
  - 第 2 節「Schema Migration Command」「Seed Script Command」：無資料庫，無對應指令
  - 第 3 節「Database Tables & Columns」「Backend Classes」「Frontend」「Test Functions」「Code File Names」：src/ 與 tests/ 尚無程式碼樣本，無法抽樣
  - 第 3 節「Test Identifier Language」：團隊決策，未填（spec 04 預設 en）
  - 第 4 節「API Interface Standard」「Error Response Format」：團隊決策
  - 第 5 節「Property-Based Testing Library」「Test Data Seeding Strategy」「Test Database Isolation」「Test Double Strategy」「Schema Introspection Command」：團隊決策／無資料庫
  - 第 6 節全部：團隊決策
未修改上述兩個目標以外的任何檔案。
```

## 中斷／恢復紀錄
- 中斷：約 2026-10-20 02:47（外部 API 限額，非工具錯誤；manifest-sync 已完成、spec-run 尚未開始）
- 恢復時間：2026-10-20 07:24:46（從 spec-run Step 00 接續，不重頭開始）

## 2. spec-run：Step 00 起點判定
【執行者】`node spec-status.js --json` → stderr「找不到 .specengine/sdd/matrix/，尚無任何模組冷啟動過。」exit 2 → 起點 spec-01。無 TodoWrite 工具，Step 0 略過。
（附帶修正：manifest 第 1 節三個路徑宣告行改為「路徑，證據說明」格式，讓 spec-guard／spec-status 的「：之後、第一個，之前取反引號」解析只抓到真正路徑。屬 manifest-sync 範圍內的格式修正，未改值。）

## 3. spec-01 Discovery Bootstrap
【執行者】MODULE_ID 由需求標題唯一判定為 ORDER_STATE_MACHINE（未向使用者提問）。
產出：matrix/ORDER_STATE_MACHINE.json（10 Rules：R-000 main_flow + R-001~009 edge_case）、spec/erm.dbml（1 Table orders，snake_case fallback 註解）、spec/terms.md（18 術語、固定文案空表）、spec/policy-defaults.md（空表）、spec/exclusions.md（空表，需求無明寫「不做」）、sdd/features/ 13 題 MCQ、overview/ORDER_STATE_MACHINE.md、overview.md。
lint 輸出：`[feature-lint] 通過：…已更新句型索引 .specengine/sdd/steps-index.json（0 個不重複句型）。` exit 0
status 輸出：`ORDER_STATE_MACHINE | CLARIFYING | 13（Medium 6 / High 6 / Low 1） | 0 | — | spec 02`

### 完成彙報原文
```text
[Phase 01: Discovery Bootstrap] 執行完成！模組：ORDER_STATE_MACHINE

矩陣：10 條 Rules ｜ erm.dbml：1 個 Tables ｜ terms.md：18 個術語 ｜ exclusions：0 條 ｜ 套用慣例：0 項
待答：13 題（High 6 ｜ Medium 6 ｜ Low 1）
階段：CLARIFYING
```

## 4. spec-02 Interactive Clarify（模組 ORDER_STATE_MACHINE，佇列 13 題，分 5 組）
### 第 1 組（定位：OrderResult.reason）
- **Q2（spec-02 第 1/13 題，High）訂單狀態機_失敗原因格式與多重錯誤優先序**
  - 執行者問：失敗原因 reason 要固定英文代碼還是白話句子？每種失敗各用什麼文案？多重錯誤先報哪個？[A] 固定代碼、先狀態再金額 [B] 中文句子 [C] 固定代碼、先金額再狀態
  - 需求方答（表 H10）：A。固定英文代碼 INVALID_AMOUNT、AMOUNT_MISMATCH、INVALID_TRANSITION、REFUND_EXCEEDS_PAID；檢查順序先狀態（INVALID_TRANSITION）→ 再金額合法性（INVALID_AMOUNT）→ 再金額比對（AMOUNT_MISMATCH / REFUND_EXCEEDS_PAID）。建立訂單金額不合法 → INVALID_AMOUNT（表 T-a）。
  - 寫回：terms.md 固定文案 MSG-001~004；矩陣 R-001/003/008 補 reason、新增 R-010（多重錯誤優先序）；POLICY-001 晉升；歸檔 resolved/features/。（2026-10-20 07:30）
### 第 2 組（定位：終態 CANCELLED／REFUNDED 後操作）
- **Q3（spec-02 第 2/13 題，High）訂單狀態機_已取消訂單的後續操作**
  - 執行者問：已取消後再付款／出貨／退款／再取消？[A] 全部拒絕 [B] 再取消冪等成功其餘拒絕 [C] 全部拒絕但允許重新付款復活
  - 需求方答（表 H2）：A，全部不能，reason 固定 INVALID_TRANSITION。
  - 寫回：矩陣新增 R-011。（2026-10-20 07:30）
- **Q4（spec-02 第 3/13 題，High）訂單狀態機_已退款訂單的後續操作**
  - 執行者問：已退款後再退款／出貨／取消／付款？[A] 全部拒絕 [B] 再退款冪等成功其餘拒絕 [C] 全部拒絕但允許取消
  - 需求方答（表 H9）：A，全部不能，reason 固定 INVALID_TRANSITION。
  - 寫回：矩陣新增 R-012。（2026-10-20 07:30）
### 第 3 組（定位：申請退款 refund）
- **Q5（spec-02 第 4/13 題，High）訂單狀態機_已付款未出貨訂單能否直接退款**
  - 執行者問：已付款未出貨直接退款？[A] 拒絕走取消 [B] 允許同已出貨規則 [C] 允許一次全額退完變已取消
  - 需求方答（表 H4）：A，不行要走取消，reason 固定 INVALID_TRANSITION。→ 矩陣新增 R-013
- **Q6（spec-02 第 5/13 題，High）訂單狀態機_單次退款超過剩餘可退金額的反應**
  - 執行者問：單次退款超過剩餘可退？[A] 整筆拒絕不截斷 [B] 自動截斷 [C] 拒絕並提示剩餘
  - 需求方答（表 H7）：A，整筆拒絕不截斷，reason 固定 REFUND_EXCEEDS_PAID。→ R-008 確認（掛 resolved_by）；POLICY-002
- **Q7（spec-02 第 6/13 題，Medium）訂單狀態機_部分退款後的訂單狀態**
  - 執行者問：部分退款後狀態？[A] 維持已出貨累加 [B] 改已退款 [C] 維持已出貨只記最後一次
  - 需求方答（表 H5）：A，維持 SHIPPED，refundedAmount 累加。→ R-007 post_assertions 補「狀態維持 SHIPPED」
- **Q8（spec-02 第 7/13 題，Medium）訂單狀態機_退款金額為零或負數**
  - 執行者問：退款 0 或負數？[A] 拒絕 [B] 0 冪等成功負數拒絕 [C] 都成功不改欄位
  - 需求方答（表 H6）：A，拒絕，reason 固定 INVALID_AMOUNT。→ 矩陣新增 R-014；POLICY-003
- （2026-10-20 07:31）
### 第 4 組（定位：取消 cancel）
- **Q9（spec-02 第 8/13 題，High）訂單狀態機_已出貨訂單能否取消**
  - 執行者問：已出貨取消？[A] 拒絕 [B] 允許視同全額退款 [C] 允許變已取消並退還
  - 需求方答（表 H1）：A，不能，reason 固定 INVALID_TRANSITION。→ 矩陣新增 R-015
- **Q10（spec-02 第 9/13 題，Medium）訂單狀態機_已付款訂單取消退還後的狀態與累計退款金額**
  - 執行者問：已付款取消退還後狀態？refundedAmount？paidAmount？[A] CANCELLED、refundedAmount=paidAmount、paidAmount 不變 [B] REFUNDED [C] CANCELLED、refundedAmount 0、paidAmount 歸 0
  - 需求方答（表 H3）：A，狀態 CANCELLED；refundedAmount = paidAmount。→ R-006 post_assertions 補齊
- **Q11（spec-02 第 10/13 題，Medium）訂單狀態機_已建立訂單取消後的金額欄位**
  - 執行者問：已建立取消後 paidAmount／refundedAmount？[A] 皆 0 [B] refundedAmount 記訂單金額 [C] 沿用
  - 需求方答（表 H11）：A，refundedAmount = 0、paidAmount = 0。→ R-005 post_assertions 補齊
### 第 5 組（定位：付款 pay／出貨 ship）
- **Q12（spec-02 第 11/13 題，Medium）訂單狀態機_付款金額不符的處理**
  - 執行者問：少付／多付一律拒絕？允許分次付款？失敗原因？[A] 一律拒絕、不允許部分付款、AMOUNT_MISMATCH [B] 多付接受 [C] 允許分次
  - 需求方答（表 H8）：A，拒絕，reason 固定 AMOUNT_MISMATCH；不允許部分付款。→ R-003 確認（補「少付或多付皆拒絕」）
- **Q13（spec-02 第 12/13 題，Medium）訂單狀態機_已建立訂單能否出貨**
  - 執行者問：已建立未付款直接出貨？[A] 拒絕 [B] 允許先出貨後收款 [C] 允許標記貨到付款
  - 需求方答（表 H11）：A，已建立不能出貨，INVALID_TRANSITION。→ 矩陣新增 R-016
- **Q14（spec-02 第 13/13 題，Low）訂單狀態機_重複操作的處理**
  - 執行者問：已付款再付款、已出貨再出貨？[A] 拒絕不視為冪等 [B] 冪等成功 [C] 再付款拒絕、再出貨冪等
  - 需求方答（表上無此題）：「你決定，照你的最佳判斷」。
  - 執行者裁量：選 A（與其他狀態不允許的操作一致，統一 INVALID_TRANSITION，不引入冪等例外）。歸檔註明使用者授權。→ 矩陣新增 R-017
- （2026-10-20 07:32）
### spec-02 收尾
【執行者】佇列清空（13 答／0 掛起）。矩陣 18 條 Rule > 4，不走 Step 5 小模組精簡確認，交 spec flow-align。overview.md 狀態改 CLARIFIED（0/0/13）。
lint：PASS（exit 0，0 句型）。status --json：stage CLARIFIED、next「spec flow-align」、flowAligned false、pending 0（更新前警告「overview.md 狀態欄為 CLARIFYING 與推導 CLARIFIED 不符」為快取過期，已更新）。
#### 完成彙報原文
```text
[Phase 02: Interactive Clarify] 執行完成！模組：ORDER_STATE_MACHINE

決策：已解決 13 項 ｜ 掛起 0 項 ｜ 晉升慣例 3 項
寫回：matrix（+8 新增／+5 修改）｜ exclusions（+0）｜ erm.dbml（0 欄異動）｜ terms.md（+0 術語、+4 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

## 5. spec-flow-align（第 1 次）
【執行者】Step 0：status --module ORDER_STATE_MACHINE → pending 0、flowAligned false，可執行。flow-design 索引不存在，無先前裁示可沿用。
- **Q15（flow-align 第 1 次確認）**
  - 執行者問：四張流程圖（建立與付款／出貨與取消／退款／終態與優先序）＋ 18 條白話複述，(1) 有無遺漏？含疑似缺口 (a) 矩陣未列的 CREATED 退款、SHIPPED 再付款是否一律 INVALID_TRANSITION；(b) pay 金額 ≤ 0 回 INVALID_AMOUNT 還是 AMOUNT_MISMATCH？(2) 圖上有無不一致？
  - 需求方答：(1)(2) 四張圖無不一致，確認。(a)(b) 表上無 → 「你決定，照你的最佳判斷」。
  - 執行者處理：未獲「非缺口」裁示，依零腦補走缺口路徑：新增 MCQ 2 題（來源 spec-flow-align）、flow-design/ORDER_STATE_MACHINE.md 寫「未通過（缺口 2）」並保存 4 張已確認圖、overview 退回 CLARIFYING（待答 2）。（2026-10-20 07:34）
#### 完成彙報原文
```text
🔁 [Phase Flow-Align] 發現缺口，狀態已退回 CLARIFYING！模組：ORDER_STATE_MACHINE
缺口：矩陣未列的狀態×操作組合（CREATED 退款、SHIPPED 再付款）；付款金額 ≤ 0 的失敗代碼歸屬
已新增 MCQ：2 項 ｜ 已保存裁示：非缺口 0 條、已確認圖 4 張（下次重畫沿用）
```
#### spec-run 中止彙報原文
```text
[spec-run] 已於 flow-align 中止，原因：流程對齊發現缺口
已完成：spec-01、spec-02；未執行：spec-03、spec-04、spec-05
```

## 6. spec-02 重跑（flow-align 缺口 2 題）
- **Q16（spec-02 重跑第 1/2 題，High）訂單狀態機_矩陣未列的狀態與操作組合**
  - 執行者問：CREATED 退款、SHIPPED 再付款怎麼處理？是否訂通則「未明列即拒絕」？[A] 一律拒絕並訂通則 [B] 退款拒絕、再付款冪等 [C] 兩者都允許
  - 需求方答：表上無 → 「你決定，照你的最佳判斷」。
  - 執行者裁量：A。→ 矩陣新增 R-018；POLICY-004
- **Q17（spec-02 重跑第 2/2 題，Medium）訂單狀態機_付款金額為零或負數的失敗代碼**
  - 執行者問：pay 金額 ≤ 0 回 INVALID_AMOUNT 還是 AMOUNT_MISMATCH？[A] ≤0 → INVALID_AMOUNT、>0 不等 → AMOUNT_MISMATCH [B] 一律 MISMATCH [C] 0 MISMATCH、負 INVALID
  - 需求方答：表上無 → 「你決定，照你的最佳判斷」。
  - 執行者裁量：A。→ R-003 pre_conditions 改「> 0 且不等」；新增 R-019
- （2026-10-20 07:34）
#### 完成彙報原文
```text
[Phase 02: Interactive Clarify] 執行完成！模組：ORDER_STATE_MACHINE

決策：已解決 2 項 ｜ 掛起 0 項 ｜ 晉升慣例 1 項
寫回：matrix（+2 新增／1 修改）｜ exclusions（+0）｜ erm.dbml（0 欄異動）｜ terms.md（+0 術語、+0 文案）
階段：CLARIFIED ｜ 下一步：spec flow-align
```

## 7. spec-run 第 2 次：Step 00 → status next「spec flow-align」→ 起點 flow-align（spec-01/02 略過）
## 8. spec-flow-align（第 2 次）
- **Q18（flow-align 第 2 次確認）**
  - 執行者問：沿用 4 張已確認圖，新增 R-018（未明列組合通則）、R-019（付款 ≤ 0 → INVALID_AMOUNT）節點；有無遺漏／不一致？執行者疑似缺口：無。
  - 需求方答：確認。
  - 落盤：flow-design/ORDER_STATE_MACHINE/{建立與付款,出貨與取消,退款,終態與多重錯誤優先序}.md、索引「狀態：已通過 ｜ Rule 總數：20」。（2026-10-20 07:36）
#### 完成彙報原文
```text
✅ [Phase Flow-Align] 執行完成！模組：ORDER_STATE_MACHINE
涵蓋 Rule：20 條 ｜ 流程階段：4 個 ｜ 已知取捨：0 條 ｜ 本輪新增範圍外裁示：0 條
產出：flow-design/ORDER_STATE_MACHINE.md（已通過）＋ flow-design/ORDER_STATE_MACHINE/*.md ×4
```

## 9. spec-03 Formalize Gherkin
【執行者】Step 0：status flowAligned ✓、next spec 03。steps-index.json 0 句型，無可沿用。產出 .specengine/spec/features/訂單狀態機.feature（20 Rule、Scenario 9 + Outline 12，展開 41）。
Step 3b 逐列核對 Examples 32 列（R-001 2、003 3、007 2、008 3、009 2、010 4、011 4、012 4、014 2、017 2、018 2、019 2），每列代入 pre_conditions 與優先序（R-010 四列皆狀態先於金額）後與 post_assertions 一致，修正 0 列。固定文案 4 個代碼逐字沿用 terms.md。
lint 輸出：`[feature-lint] 通過：…已更新句型索引 .specengine/sdd/steps-index.json（15 個不重複句型）。` exit 0
overview.md：CLARIFIED → FORMALIZED。
#### 完成彙報原文
```text
[Phase 03: Formalize Gherkin] 執行完成！模組：ORDER_STATE_MACHINE
產出：.specengine/spec/features/訂單狀態機.feature
指標：Rule 20 條 ｜ Scenario/Outline 21 個（展開 41）｜ 句型 15 個（沿用 0 個）｜ PARKED 註解 0 個
Examples 核對：32 列，修正 0 列 ｜ feature-lint → PASS
階段：FORMALIZED
```
【執行者】Step 1：spec-guard snapshot → `.specengine/spec/：5 個檔案（全字節凍結）／tests/steps/：1 個檔案、15 個 Step 句型／direct 略過 Driver` exit 0。基準紅燈：`41 scenarios (41 failed) / 189 steps (41 failed, 148 skipped)`，41 個皆 Contract Not Implemented。
Step 2：一個切片完成（5 個純函式共用同一組狀態／金額檢查）：src/order.ts（createOrder／pay／ship／cancel／refund，固定代碼常數，回溯註解指向 resolved/），src/index.ts 改為 re-export；tests/steps/order-state-machine.steps.ts 僅改函式體與 import（15 句型字串逐字未動），tests/support/world.ts 未動。
npm test：`41 scenarios (41 passed) / 189 steps (189 passed)`；npm run typecheck：tsc --noEmit exit 0。
紅燈分類：無任何 Scenario 需分類（一次全綠），形式化錯誤自修 0 件，snapshot 重建 0 次，無規格瑕疵。Property test：manifest 未宣告 Property-Based Testing Library，略過。
Step 3：全綠下無需重構。Step 4：Binding Layer 為 direct，無第二 Driver（僅 in-process 綠燈）。
Step 5：verify → PASS；lock → .specengine/sdd/locks/ORDER_STATE_MACHINE.lock.json；overview.md STUBBED → IMPLEMENTED。
#### 完成彙報原文
```text
[Phase 05: Coder Implement] 執行完成！模組：ORDER_STATE_MACHINE
測試（in-process）：Scenario 41 ｜ PASS 41 ｜ FAIL 0 ｜ 測試（ui|api）：未執行（Binding Layer 為 direct，無第二 Driver）
形式化錯誤自修：0 件（見 resolved/fixes/，無）｜ snapshot 重建：0 次
產品代碼：src/order.ts、src/index.ts ｜ Driver 實作：無（direct；Step 函式體直接呼叫 src/order.ts）
verify → PASS ｜ lock → .specengine/sdd/locks/ORDER_STATE_MACHINE.lock.json
階段：IMPLEMENTED
```

## 12. spec-run 總覽（第 2 次執行，起點 flow-align）
```text
[spec-run] 執行完成！模組：ORDER_STATE_MACHINE

起點：spec flow-align（spec-status 推導：CLARIFIED、pending 0、flowAligned false），起點之前階段略過

1. spec-01  → 略過（第 1 次 spec-run 已完成）
2. spec-02  → 略過（第 1 次 spec-run 已解決 13；flow-align 缺口重跑已解決 2、掛起 0）
3. flow-align → 完成（第 2 次確認通過，沿用 4 張已確認圖）
4. spec-03  → 完成（lint PASS）
5. spec-04  → 完成
6. spec-05  → 完成（全綠，verify PASS，lock 已建）

階段：IMPLEMENTED
```

## 13. 工具錯誤與 Skill 文件備註
- 工具錯誤 1：環境無 python（Microsoft Store 別名），manifest 行替換改用 node -e 完成，無副作用。
- 工具錯誤 2：spec-05 實作批次兩度因 Bash 工具對含 TypeScript heredoc／內嵌 node -e 的長指令回報「unexpected EOF while looking for matching quote」（exit 2），整批未執行、檔案未變；改用 Write 工具落檔 + 短 Bash 指令後正常。
- 中斷 1 次：02:47 外部 API 限額，07:24 恢復，從 spec-run Step 00 接續。
- Skill 文件觀察（非阻斷）：
  (a) spec-status.js／spec-guard.js 解析 manifest 路徑欄位時取「：之後、第一個，之前」的所有反引號，spec-manifest-sync SKILL 未提醒證據說明不可放在同一子句含反引號；本次自行把證據說明移到「，」之後。
  (b) spec-flow-align 對「使用者回答『你決定』」沒有明確歸類（非缺口／缺口），本次依零腦補原則視為缺口走 MCQ，使 spec-run 中止一次並重跑 spec-02；spec-02 亦未定義「使用者授權執行者裁量」的記錄方式，本次在歸檔「決策選項」欄明寫授權與執行者所選。
  (c) spec-04 的 `@binds` 在 direct 模式寫 `<Service>.<方法>`，spec-guard 不驗證；對純型別組裝的 Given 無對應方法，本次寫 `order.Order` 並加說明。
  (d) spec-run 的 Step 1～5 要求「用 Skill 工具執行」，本次依任務指示改為直接讀 SKILL.md 逐字執行。
