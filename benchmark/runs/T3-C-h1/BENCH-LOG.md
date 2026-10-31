# BENCH-LOG T3-C-h1

- 開始時間：2026-10-31 23:24:14

## 紀錄

### (a) spec-manifest-sync（首次導入）— 23:24 ~ 23:25

- 模式：manifest 首次建立；CLAUDE.md 不存在，首次插入 SpecEngine 區塊（plugin v2.1.0）。
- 專案實況：單一套件 TypeScript（tsconfig strict、NodeNext、package.json type=module）、Node v24.18.0（本機）、`@cucumber/cucumber` ^11.3.0、`npm test` = cucumber-js（cucumber.cjs: paths `.specengine/spec/features/**`、`tests/features/**`；import `tests/steps/**`、`tests/support/**`；json 報告 `reports/cucumber.json`）。`src/index.ts` 僅註解；`tests/steps/`、`tests/support/` 為 .gitkeep。無資料庫、無 UI、無 CLAUDE.md、無 `.claude/`。
- 必填欄位處理（依任務指示，不另問）：Binding Layer = `direct`（需求方指示）；Driver Directory = 不適用。Source Root = `src/`、Step Definitions = `tests/steps/`、BDD Framework = `@cucumber/cucumber`、Test Execution Command = `npm test`，皆有直接證據，未追問。
- 團隊決策類維持〔待確認〕：Test Identifier Language、Assertion Library、Property-Based Testing、API／Error 格式、Multi-Tenancy 環境層策略、Code/Test 命名慣例等。
- 落盤：`.claude/spec/architecture-manifest.md`、`CLAUDE.md`（新建，內含 SPECENGINE 區塊 v2.1.0；{{EXISTING_TOOLS_NOTE}} 依規定移除）。
- 未修改程式碼或設定檔。
- 完成彙報：[spec-manifest-sync] 執行完成（首次建立 manifest＋首次插入 CLAUDE.md 區塊 v2.1.0；必填 5 項皆已填，Binding Layer=direct；Driver Directory 不適用）。

### spec-run Step 00：起點判定

- `spec-status.js --json`：找不到 `.specengine/sdd/matrix/`，exit 2 → 起點 spec-01。

### (1) spec-01-discovery-bootstrap — 23:25 ~ 23:27

- 模組：`COUPON`（需求單一對應，未另問）。
- 產出：`.specengine/sdd/matrix/COUPON.json`（7 條 Rule：R-COUPON-000 main_flow；001～006 edge_case）、`.specengine/spec/erm.dbml`（coupons 表＋(tenant_id, code) 唯一索引）、`.specengine/spec/terms.md`（12 術語，無固定文案）、`.specengine/spec/policy-defaults.md`（空）、`.specengine/spec/exclusions.md`（空，需求無「不做」條目）、`.specengine/sdd/overview.md`、`.specengine/sdd/overview/COUPON.md`。
- MCQ 佇列：14 題（data/ 2、features/ 12）；High 10、Medium 3、Low 1。
- 歷史去重：resolved/、parked/ 不存在，無需去重。
- `feature-lint.js`：通過（exit 0；句型索引 0 個不重複句型）。
- `spec-status.js`：COUPON → CLARIFYING，next = spec 02，pending 14。
- 工具說明：spec-01 文件要求的「不確定事項進 MCQ」以 14 題實作，未向使用者提問。

### (2) spec-02-interactive-clarify — 待答（第一輪）

- 本輪無 AskUserQuestion 工具，依任務指示以【待答】文字一次列出全部分組題目（共 9 組、14 題）。
- 【問答原文】（題目節錄，完整內容見 `.specengine/sdd/resolved/`）
  - Q1 百分比取整（捨去／四捨五入／進位）→ 需求方：每張 PERCENT 各自無條件捨去。
  - Q2 租戶不一致（整次失敗／略過並回報／略過不回報）→ 整筆拒絕，reason `TENANT_MISMATCH`。
  - Q3 空清單或無券可套用 → 成功，finalAmount = orderAmount，discount 0，applied []。
  - Q4 期間邊界 → 含頭含尾，`validFrom ≤ now ≤ validTo`。
  - Q5 多券其一不符 → 整筆拒絕；過期或未生效 `COUPON_EXPIRED`，未達低消 `MIN_ORDER_NOT_MET`。
  - Q6 失敗 reason 文案 → 固定英文代碼；多錯誤依 INVALID_INPUT → INVALID_COUPON → TENANT_MISMATCH → DUPLICATE_COUPON → COUPON_EXPIRED → MIN_ORDER_NOT_MET → NOT_STACKABLE → DISCOUNT_EXCEEDS_AMOUNT 回報第一個命中。
  - Q7 固定券面額超過訂單金額 → 整筆拒絕 `DISCOUNT_EXCEEDS_AMOUNT`，等於可以。
  - Q8 合計折扣超過訂單金額 → 同 Q7。
  - Q9 不可疊加與可疊加併用 → 整筆拒絕 `NOT_STACKABLE`。
  - Q10 多張不可疊加同時出現 → 整筆拒絕 `NOT_STACKABLE`。
  - Q11 PERCENT 數值範圍與小數 → 券值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）整筆拒絕 `INVALID_COUPON`。
  - Q12 訂單金額 0／負數／非整數 → 整筆拒絕 `INVALID_INPUT`。
  - Q13 有效期間設定錯誤 → 需求方：你決定。spec 判斷：整筆拒絕 `INVALID_COUPON`。
  - Q14 重複 code → 整筆拒絕 `DUPLICATE_COUPON`。
- spec-02 寫回：矩陣 R-COUPON-000～017；erm.dbml `coupons.value` 改 int；terms.md MSG-001～008；policy-defaults POLICY-001～007；14 題歸檔於 resolved/。
- spec-status：COUPON → CLARIFIED，next = spec flow-align，pending 0。feature-lint 通過。
- overview.md 狀態欄原為 CLARIFYING，spec-status 報 warning，已依推導更新為 CLARIFIED（快取）。
- spec-02 完成彙報：決策已解決 14 項、掛起 0 項、晉升慣例 7 項（POLICY-001～007）；寫回 matrix（+11 新增、2 修改）、exclusions（0）、erm.dbml（value 異動）、terms.md（+0 術語、+8 文案）。階段 CLARIFIED，下一步 spec flow-align。

### (3) spec-flow-align — 第 1 次確認（待答）— 23:31

- Step 0 前置檢查通過（pending 0、flowAligned false）。尚無既有裁示可沿用。
- 已依矩陣分為 4 組流程圖（輸入檢查、期間與最低消費、折扣計算、疊加規則），列出 5 條執行者疑似缺口，請使用者裁示。等待確認中。
- 【使用者回覆】23:32：(2) 四張圖與白話複述確認無不一致；(1)(a) 等於可以；(b) 依檢查順序回報第一個命中；(c) 你決定；(d) 沒傳券時成功（finalAmount = orderAmount，discount 0，applied []）；(e) 依檢查順序回報第一個命中。
- 處理：缺口 a、b/d、c 屬行為補充，非單純確認，依 flow-align Step 3 視為缺口：建 MCQ（`resolved/features/` 三檔，來源 spec-flow-align，已附決策）；矩陣新增 R-COUPON-018（等於可以）、R-COUPON-019（0 元百分比列入 applied，spec 判斷）；R-COUPON-008、013 前提補強。(e) 記為非缺口（已由 R-COUPON-017 涵蓋）。
- lint 通過。flow-design/COUPON.md 寫為「未通過（缺口 3）」，保存本輪裁示。
- 第 1 次流程對齊結果：未通過。

### (4) spec-flow-align — 第 2 次確認（待答）— 23:33

- 依 Step 0 沿用上次裁示；圖 1～3 因矩陣異動需重畫，圖 4 上次已確認沿用。等待使用者確認。
- 【使用者回覆】：「確認。第 10 點你決定，照你的最佳判斷。」→ R-019 維持列入 applied。
- 結果：流程對齊通過。flow-design/COUPON.md 寫為「已通過」（Rule 總數 20），四個階段檔已落盤。

### (5) spec-03-formalize-gherkin — 23:34 ~ 23:35

- 產出：`.specengine/spec/features/多租戶優惠券.feature`（20 條 Rule，29 個 Scenario／Outline 展開；句型 16 個）。
- Examples 核對：R-013、014、015 的 Outline 逐列對照矩陣；未修正（核對 N 列，修正 0 列）。
- feature-lint：PASS（exit 0；句型索引 16 個不重複句型）。
- 狀態推導：FORMALIZED，next = spec 04。

### (6) spec-04-generate-test-stub — 23:35 ~ 23:36

- 框架：`@cucumber/cucumber` 已安裝；Binding Layer = direct，故不產 Driver 介面與 fixture。
- 產出：`tests/steps/coupon.steps.ts`（16 個 Step，全部確定性紅燈）。
- spec-guard snapshot：通過（.specengine/spec 5 檔；16 句型；@binds 指向 direct 模式 Service，不檢查）。
- 紅燈基準：`npm test` 29 scenarios 全部失敗於 Contract Not Implemented。

### (7) spec-05-coder-implement — 23:36

- 切片：整模組一次實作。產出 `src/coupon.ts`（純函式 applyCoupons，依 R-COUPON-017 固定順序回報第一個命中）；step 函式體改為呼叫 applyCoupons，句型字串未變。
- 測試：`npm test` 29 scenarios 全綠（406 steps passed）。`npm run typecheck`（tsc --noEmit）無錯誤。
- 形式化錯誤自修：0 件；snapshot 重建：0 次。
- 決策實作註記：ISO 8601 嚴格格式檢查（R-COUPON-015 的 "2026/01/01" 判為 INVALID_COUPON）；`now` 格式不合法時歸為 INVALID_INPUT（規格未定義，未有測試覆蓋，此為實作者選擇）。
- spec-guard verify：PASS；lock：`.specengine/sdd/locks/COUPON.lock.json`（feature 1、Step 檔 1、Driver 介面 0）。
- 狀態：IMPLEMENTED。

### 收尾
- 結束時間：2026-10-31 23:37（以下 date 指令記錄）
- 收工 commit 進行中。
