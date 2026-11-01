# BENCH-LOG T4-C-tm-h1

## 時間紀錄
- 開始時間：2026-11-01 02:44:16
- 第 1 次結束（送出 spec-02 題目、等待需求方回答）：2026-11-01 02:48 左右
- 第 1 次被喚醒（收到需求方答案）：2026-11-01 02:47:48（工作目錄環境資訊改為 specengine-plugin\benchmark，本次仍只操作專案目錄 inventory）
- 第 2 次結束（送出新缺口題目）：2026-11-01 02:48:39 左右
- 第 2 次被喚醒（需求方授權代決「付款失敗先到」）：2026-11-01 02:49 左右
- 第 3 次結束（spec-02 完成，送出 flow-align 圖請求確認）：2026-11-01 02:50 左右
- 第 3 次被喚醒（需求方確認流程圖，(a)(b) 授權代決）：2026-11-01 02:50 左右
- 結束時間：2026-11-01 02:52 左右

## 階段彙報
- (a) spec-manifest-sync：完成。新建 `.claude/spec/architecture-manifest.md`（由範本落地）與 `CLAUDE.md`（SPECENGINE 區塊，版本 2.1.0）。必填 5 項皆已填入：Source Root `src/`、Step Definitions `tests/steps/`、BDD `@cucumber/cucumber` ^11.3.0、Test Execution `npm test`、Binding Layer `direct`（依任務給定的環境答案）。Driver Directory 標示不適用。
- (b) spec-run Step 00：`spec-status.js --json` 回傳 exit 2（無矩陣），起點為 spec-01。
- spec-01 完成：模組 `INVENTORY`。矩陣初版 4 條 Rules，erm.dbml 2 個 Table（stock_item、reservation）＋ 1 條 Ref，terms.md 4 個術語，exclusions 5 條（X-INVENTORY-001～005），MCQ 7 題。feature-lint 通過（exit 0）。
- spec-02 完成：8 題全部解決（需求方直接回答 6 題；授權代決 2 題：數量為零或負數、付款失敗先於下單抵達；另 Q5 答案衍生的新題「付款失敗先到」由需求方授權代決）。佇列清空。矩陣 10 條 Rules。
- spec-flow-align 完成：第 1 次送出流程圖（2 張）、白話複述、已知取捨、疑似缺口 (a)(b)。需求方回覆「確認」：(a) 補貨不提供功能（X-INVENTORY-006）、(b) 事件 id 永久記住（X-INVENTORY-007），皆為授權代決；(2) 無不一致；(3) 兩題代決接受。寫入 `flow-design/INVENTORY.md`（已通過）與 `flow-design/INVENTORY/下單保留.md`、`付款失敗或取消時放回.md`。
- spec-03 完成：`.specengine/spec/features/庫存服務.feature`，10 條 Rule（每條 `@rule:` tag 與矩陣一一對應），Scenario Outline 3 個（展開 6 列），獨立 Scenario 10 個，共 16 個執行案例。Examples 逐列核對：6 列全部由矩陣推導（相等、不足、數量 0 與 -1），修正 0 列。feature-lint 通過（exit 0）。句型 11 個。
- spec-04 完成：Step 檔 `tests/steps/inventory.steps.ts`（11 個句型，`@rule`、`@schema`、`@binds` 註解）、World `tests/support/world.ts`。direct 綁定，無 Driver 層。spec-guard snapshot exit 0（@binds 檢查通過）。紅燈基準：`npm test` 16 Scenario 全數失敗（Contract Not Implemented）。
- spec-05 完成：`src/inventory.ts` 實作（依矩陣 10 條規則）。紅燈轉綠：`npm test` 16 scenarios passed，75 steps passed。`npm run typecheck` exit 0。形式化錯誤自修：0 件。snapshot 重建：0 次。spec-guard verify exit 0。spec-guard lock INVENTORY 完成（`.specengine/sdd/locks/INVENTORY.lock.json`，feature 1、Step 檔 1、Driver 介面 0）。spec-status 階段：IMPLEMENTED。
- 本模組不需要的：`tests/fixtures`、Driver 層（direct 綁定）。

## 問答紀錄
### 第 1 輪（需求方原回覆，2026-11-01 02:47:48 左右）
原文：「組A：1A 2『你決定，照你的最佳判斷』 3A 4A；組B：5短 6A 7A」
- Q1（A）：同一事件（同 id）重複送達，第二次起直接忽略，不改任何狀態、不發任何事件。→ 寫回 R-INVENTORY-005。
  - 注意：原選項 A 是「同一訂單」，需求方答案改為「同一事件 id」，依答案記錄。
- Q2（授權代決，結果 A）：需求方回「你決定，照你的最佳判斷」。規格代決為「視為庫存不足，發出 StockRejected」。這是代決，不是需求方直接選擇。→ 寫回 R-INVENTORY-004。
- Q3（A）：未知 SKU 視為庫存 0，發 StockRejected；庫存不夠整筆拒絕，不部分保留。→ 寫回 R-INVENTORY-001。
- Q4（A）：相等算足夠。→ 寫回 R-INVENTORY-000。
- Q5（短，自訂）：庫存服務記住這張訂單已取消；之後到的 OrderPlaced 不保留庫存、不發任何事件。→ 寫回 R-INVENTORY-006、R-INVENTORY-007。此答案只涵蓋「取消先到」。
- Q6（A）：取消後放回庫存，發出 StockReleased。→ 寫回 R-INVENTORY-003。
- Q7（A，補充）：只放回實際保留的數量，同一張訂單最多放回一次；沒保留過就不加庫存、不發 StockReleased。→ 寫回 R-INVENTORY-002、003、008。

### 第 2 輪
- 新題「庫存_付款失敗先於下單抵達」（High）：需求方回覆「這題你決定，照你的最佳判斷」。授權代決，結果 A（記住已付款失敗，之後到的 OrderPlaced 不保留、不發事件）。理由：B 會讓庫存被永久佔用，與需求第 5 點精神衝突。→ 寫回 R-INVENTORY-009（新增）、R-INVENTORY-007（pre 擴充為「已取消或付款失敗」）。

### flow-align 確認（第 3 輪，2026-11-01 02:50 左右）
- 需求方回覆：「(1) (a)、(b) 你決定，照你的最佳判斷；沒有其他遺漏。(2) 沒有不一致。(3) 代決照你的決定。確認。」
- (a) 補貨、調整庫存總量：代決為不提供功能（X-INVENTORY-006）。
- (b) 已見過的事件 id 保留期限：代決為永久記住，系統無動作（X-INVENTORY-007）。

## 矩陣（最終 10 條）
- R-INVENTORY-000 主幹：OrderPlaced，數量為正整數、可供保留 >= 數量（相等算足夠）、未被記為已取消或付款失敗 → 保留、發 StockReserved。
- R-INVENTORY-001 不足或未知 SKU（視為 0）→ 整筆拒絕、發 StockRejected。
- R-INVENTORY-002 PaymentFailed 且有保留 → 放回實際保留數量、標示已釋放、發 StockReleased。
- R-INVENTORY-003 OrderCancelled 且有保留 → 放回實際保留數量、標示已釋放、發 StockReleased。
- R-INVENTORY-004 數量非正整數 → 不保留、發 StockRejected（代決）。
- R-INVENTORY-005 同一事件 id 重複送達 → 忽略，不改狀態、不發事件。
- R-INVENTORY-006 OrderCancelled 先於 OrderPlaced → 記住已取消，不改庫存、不發事件。
- R-INVENTORY-007 已記為已取消或付款失敗的訂單收到 OrderPlaced → 不保留、不發事件。
- R-INVENTORY-008 PaymentFailed 或 OrderCancelled 時無保留中的庫存 → 不加庫存、不發 StockReleased。
- R-INVENTORY-009 PaymentFailed 先於 OrderPlaced → 記住已付款失敗，不改庫存、不發事件（代決）。

## 實作與測試
- 產品代碼：`src/inventory.ts`（只改這個檔；events.ts、shop.ts、order.ts、payment.ts 未動）。
- 測試：`tests/steps/inventory.steps.ts`、`tests/support/world.ts`。
- 矩陣未涵蓋、程式採用的 no-op：同一訂單已有保留中的紀錄，又收到另一個 id 的 OrderPlaced，目前不重複保留、不發事件。此行為矩陣未規定，建議後續補規則。
- 事件 id 採 `INV-<UUID>`，以避免與其他服務衝突。

## lint / guard 輸出摘要
- feature-lint.js（spec-01 後）：通過，exit 0。
- feature-lint.js（spec-02 寫回後）：通過，exit 0。
- feature-lint.js（spec-03 後）：通過，exit 0，句型 11 個。
- spec-guard snapshot（spec-04 後）：exit 0，`.specengine/spec/` 4 個檔案全字節凍結，Step 句型 11 個。
- spec-guard verify（spec-05 後）：exit 0。
- spec-guard lock INVENTORY：exit 0。
- spec-status.js --module INVENTORY（最終）：`INVENTORY | IMPLEMENTED | 0 | 0 | ✓ | （已完工）`。
- 紅燈基準 `npm test`：16 scenarios failed（Contract Not Implemented）。
- 綠燈 `npm test`：16 scenarios passed，75 steps passed。
- `npm run typecheck`：exit 0。

## 工具錯誤與 Skill 文件矛盾
- spec-manifest-sync SKILL.md Step 3 指定使用 AskUserQuestion 工具；本環境無此工具，改為文字分組題目與【待答】。
- spec-run SKILL.md 以 Skill 工具串接各階段；任務禁止呼叫 specengine:* 技能，改為直接 Read 各 SKILL.md 照做。
- spec-02 SKILL.md 優先用 AskUserQuestion；本環境無此工具，改為文字分組題目並以【待答】結束該輪。
- spec-02 與 spec-flow-align 的「真實等待使用者輸入」與需求方的「你決定」授權：屬於規格代決，已在 resolved 檔與 flow-design 索引中標註，未當作需求方直接回答。
- spec-status 多次報 overview.md 狀態欄與推導不符（屬快取過期），已逐次更新 overview.md 狀態欄。
- 題數記錄修正：spec-01 初版 overview 誤寫 8 題，經 spec-status 比對後更正為 7 題（實際檔案 7 個）。
- 工作目錄環境資訊於會話中途改為 `specengine-plugin\benchmark`；本次仍只讀寫 inventory 專案目錄與任務指定檔案，未讀寫其他位置。`npm test` 與 `npm run typecheck` 會透過專案的 node_modules 符號連結使用依賴，屬於執行測試所需。
