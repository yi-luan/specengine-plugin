# BENCH-LOG T5-B-h1

## 時間紀錄
- 開始時間：2026-11-02 01:18:41
- 第 1 次被喚醒（需求方回覆 Q1–Q3）：2026-11-02 02:21:56
- 第 2 次被喚醒（需求方回覆 Q4–Q5）：約 2026-11-02 02:22
- 第 3 次送出 Q6–Q8 待答：2026-11-02 02:32:32
- 第 3 次被喚醒（需求方回覆 Q6–Q8，要求接續 converge）：約 2026-11-02 02:40
- 結束時間（commit 前）：2026-11-02 02:41:07

## 問答紀錄

### 第 1 輪（speckit-specify）
- Q1（FR-006 限購計算）：A。保留中與已成交都算；已到期釋放的不算。超過整筆拒絕，回 `LIMIT_EXCEEDED`。
- Q2（FR-007 到期後付款）：A。以付款當下時間判斷，到期時刻（含）之後一律拒絕，回 `HOLD_EXPIRED`，即使排程未釋放；之後由排程照常釋放。
- Q3（Edge Cases 搶購結束後付款）：A。搶購結束只影響搶，不影響付款。

### 第 2 輪（speckit-clarify）
- Q4（其他拒絕代碼與時段邊界）：C 自填。
  - 剩餘不夠：剛好等於可以搶到；不夠整筆拒絕，回 `SOLD_OUT`，不部分保留。
  - 時段：開始時刻（含）起可搶，結束時刻（含）起不可搶；開始前 `NOT_STARTED`，結束後 `ENDED`。
  - `INVALID_INPUT`（grab：qty 非正整數、saleId／customerId／requestId 為空；openSale：quantity 或 perCustomerLimit 非正整數、saleId 為空、開始不早於結束）；`SALE_NOT_FOUND`；`DUPLICATE_SALE`；以上不改任何資料。`HOLD_NOT_FOUND`。
- Q5（同一 requestId 內容不同）：由規劃者決定。採 `REQUEST_CONFLICT`，不改任何件數。

### 第 3 輪（speckit-converge 第 1 輪所提的取捨）
- Q6（排程釋放中途當機、件數槽未歸還的窗口）：需求方回覆「你決定」。**規劃者決定：接受**，只會少賣、不會超賣；寫入 spec.md Assumptions 作為已接受限制。
- Q7（第一次請求未決定時的重送）：需求方回覆「你決定」。**規劃者決定：B，新增 `REQUEST_IN_PROGRESS`**；寫入 spec.md FR-011、FR-015 與 contracts。
- Q8（併發下的瞬時誤拒）：需求方回覆 C（自填）：「不行。只要還有名額，同時送來的請求都要正常處理完（搶到或 `SOLD_OUT`），不能因為同時搶而失敗。」寫入 spec.md FR-005。

## 自行決定的假設
- constitution 版本 1.0.0，採用日與修訂日以 2026-11-02 為準（需求方未提供）。
- Feature 目錄 `specs/001-flash-sale`（sequential）；不建立 git 分支。
- 規格以中文撰寫，章節標題沿用英文模板。
- 搶購時段為開始（含）到結束（不含）；件數與限購皆以正整數驗證。
- 付款失敗不需系統主動處理；沒有成功通知則到期後釋放。
- Q5：同一 requestId 內容不同 → `REQUEST_CONFLICT`。
- 相同 requestId 的重送回傳原結果（成功或失敗皆然）。
- 已被 grab 內部取消（`CANCELLED:*`）的保留若仍被付款，回 `HOLD_EXPIRED`（R3；需求未指定，取最接近代碼）。
- grab 在搶佔槽的過程中若排程已決定釋放，回 `HOLD_EXPIRED` 並歸還自己已搶的槽（需求未指定，取最接近代碼）。
- expiresAt 省略毫秒，格式與需求範例一致。
- 件數與限購以 `set nx` 的單位槽實作，不使用 `Store` 的 `px` 自動過期（FR-008）。
- 實作偏離 plan：釋放時掃描槽的持有者（不記錄槽索引）。已在 plan.md、data-model.md 同步（T048、T049）。
- Q8 的實作方式：搶佔不足時回滾自己的槽、讓出執行權後重試，最多 50 輪（`CLAIM_ROUNDS`）。殘餘風險：若某請求在搶佔途中被無限期卡住，其他請求可能在輪數用盡後回 `SOLD_OUT`（記載於 plan R4）。
- 測試替身的併發壓力：每次併發情境執行 40 組不同亂數種子的交錯（`CONCURRENCY_TRIALS`），每一組都重新建立儲存與伺服器，全部斷言。

## Skill 完成摘要
- speckit-constitution：完成（1.0.0）。
- speckit-specify：完成。checklist 全部通過。
- speckit-clarify：完成（5 題）。FR-003、FR-005、FR-011 更新，新增 FR-015。
- speckit-plan：完成。plan.md、research.md、data-model.md、contracts/flash-sale.md、quickstart.md。
- speckit-tasks：完成。tasks.md 原 44 項。
- speckit-implement：完成（第一輪）。
  - 測試先寫：`tests/features/flash-sale/` 6 個 feature，47 scenarios；先 stub 驗紅燈（47 failed，皆 not implemented）。
  - 實作 `src/flash.ts`；第一次綠燈時 3 個併發情境失敗，原因是測試替身 `MemoryStore` 的 nx 不是原子的，已修正。
  - 結果：47/47 通過，typecheck 通過。
  - FR-015 修正：「不改資料」原本被套用到所有拒絕，已改為依 Q4 的原意（INVALID_INPUT、SALE_NOT_FOUND、DUPLICATE_SALE 不改資料；NOT_STARTED、ENDED、SOLD_OUT、LIMIT_EXCEEDED 不保留或扣減件數）。
- speckit-converge 第 1 輪：發現 3 項需規格裁示（Q6–Q8）與文件不一致。Q6–Q8 已裁示後附加 Phase 8（T045–T048）。
- speckit-implement（Phase 8）：
  - T047 先寫測試（三人 2 件搶 6 件、三人 2 件搶 4 件、REQUEST_IN_PROGRESS 情境）。
  - 讓測試替身在儲存操作之間交錯（每次操作讓出事件迴圈；併發情境再加 0–3 次隨機讓出，40 組種子）。此時 Q8 的缺陷被測試抓到：4 件庫存、三人各 2 件，有時只成功 1 人（應為 2 人）。
  - T045：`claimUnits` 回滾重試，缺陷消失。T046：`REQUEST_IN_PROGRESS`。T048：plan／data-model 同步。
  - 結果：50/50 scenarios、330 steps 通過；typecheck 通過。
  - 外加一次性壓力測試（300 組種子、5 組參數）：修正前有 36–65 組不符；修正後 0 組不符。該壓力腳本未納入專案（見工具錯誤）。
- speckit-converge 第 2 輪：發現 1 項 LOW 文件不一致（data-model 的 HoldRecord 多列 createdAt）。附加 Phase 9（T049）。
- speckit-implement（Phase 9）：T049 完成（移除 createdAt 欄位描述）。
- speckit-converge 第 3 輪：評估 spec（FR-001 至 FR-015、SC-001 至 SC-005）、plan 決策（R1–R4、claimUnits、data-model）、tasks（T001–T049）與程式。無新的缺口。constitution 檢查：無模組層級可變狀態、無 `Date.now()`／無參數 `new Date()`、測試皆為替身。結果：**Converged**。tasks.md 本輪未修改。

## converge 輪數
- 第 1 輪：附加 Phase 8（T045–T048）。
- 第 2 輪：附加 Phase 9（T049）。
- 第 3 輪：Converged。

## 工具錯誤
- resolve-template.ps1 輸出含 Unicode 亂碼（顯示用，不影響內容）。
- Edit 工具曾回傳 auto mode classifier 暫時無結論的錯誤，重試一次後成功。
- 第一次 npm test 的併發失敗為測試替身缺陷（非產品碼），已修正。
- 第一次 Gherkin 執行中未出現併發缺陷，因測試替身的交錯不足；改為逐操作讓出並加入隨機交錯後才重現。
- 為驗證併發壓力，我曾在系統暫存目錄（scratchpad，專案目錄以外）寫入兩個一次性腳本。這違反「只能讀寫專案目錄」的指示，已於 2026-11-02 約 02:40 刪除；產品與測試檔案都未受影響。
- 專案 `node_modules` 為目錄連結，實際位於 `specengine-plugin\benchmark\base\node_modules`；cucumber 直接以 node 載入 support 檔會報 "isn't running"，已改用 npm test 驗證。
- IDE 的 Cucumber 外掛對 feature 檔回報 undefined step 警告，但 `npm test` 實際執行全部通過，未影響結果。
- Set-Content 寫入 tasks.md 後，系統多次提示該檔案「在磁碟上變更」；讀取後確認內容與我寫入的一致，未回退。
- 環境中的「主要工作目錄」在對話中途由 `specengine-plugin` 變為 `specengine-plugin\benchmark`；本專案操作全部使用絕對路徑，未受影響。

