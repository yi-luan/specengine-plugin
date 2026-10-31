# BENCH-LOG（T3-B-h1）

## 時間紀錄
- 開始：2026-10-31 23:24:15
- 喚醒 1（specify 完成、Q1/Q2 待答）：2026-10-31 23:25:27 → 本輪結束待答
- 喚醒 2（Q1/Q2 答覆）：2026-10-31 23:26:41
- 喚醒 3（clarify 3 題待答，Q3–Q5 答覆）：2026-10-31 23:27:46

## 問答紀錄

### speckit-specify
- Q1（FR-004 / 多券規則）：不可疊加的優惠券能否與可疊加的優惠券同時用於同一訂單？
  - 選項：A 不可以，不可疊加券只能單獨使用；B 可以，可與可疊加券併用，但同一訂單最多一張不可疊加券；C 自訂
  - 答覆（協調者轉達）：A。整筆拒絕，不可疊加券只能單獨用。reason `NOT_STACKABLE`。兩張以上不可疊加券一起用也整筆拒絕，reason `NOT_STACKABLE`。
- Q2（Edge Case / 多券部分失敗）：提交的多張券中有任一張失敗時，整筆失敗，還是略過失敗的券？
  - 選項：A 整筆失敗並回傳失敗原因；B 略過失敗券，套用其餘有效券；C 自訂
  - 答覆（同上）：A。整筆拒絕。跨租戶 `TENANT_MISMATCH`；過期或尚未生效 `COUPON_EXPIRED`（未生效也用同一代碼）；未達最低消費 `MIN_ORDER_NOT_MET`。代碼不存在由我決定（見假設）。

### speckit-clarify（一次列出 3 題，需求方允許；clarify 原規定一次一題，此差異已記錄）
- Q3（PERCENT 值域 / 券值合法性）：PERCENT 不在合理範圍、FIXED 不為正、非整數時如何處理？
  - 選項：A 視為無效券，整筆拒絕；B 允許超過 100，折扣上限為訂單金額；C 自訂
  - 答覆（協調者轉達）：A。券值不合法（PERCENT 不在 1–100、FIXED ≤ 0、非整數）拒絕，reason `INVALID_COUPON`。
- Q4（同一代碼重複提交）：同一張券在一次請求中被重複提交時如何處理？
  - 選項：A 整筆拒絕；B 視為同一張券只套用一次；C 自訂
  - 答覆（同上）：A。同一張券（同 tenantId + code）傳兩次整筆拒絕，reason `DUPLICATE_COUPON`。
- Q5（期間邊界）：validFrom 與 validTo 時刻是否包含在內？
  - 選項：A 起迄皆包含；B 起包含、迄不包含；C 自訂
  - 答覆（同上）：A。都算有效（含頭含尾）。以 `validFrom ≤ now ≤ validTo` 比較。

### speckit-clarify 完成摘要
- 已問 5 題（specify 2 題 + clarify 3 題），達上限。全部整合進 spec：Edge Cases、FR-004、FR-009、FR-013、Assumptions、Clarifications 區段。
- 檢核表第二輪（specify 後）全部通過；clarify 回填後未改變任何勾選狀態。

## 自行決定的假設

- Constitution 初次批准與最後修訂日皆取 2026-10-31，版本 1.0.0。
- Spec 目錄採 sequential 編號：`specs/001-multi-tenant-coupon`（init-options 的 feature_numbering = sequential）。
- 最低消費以折扣前訂單金額比較；未達才拒絕（等於可用）。
- 不屬於該租戶視為 `TENANT_MISMATCH`。
- 代碼不存在：自行命名 `COUPON_NOT_FOUND`，整筆拒絕。
- 同一租戶代碼唯一性視為資料層約束，不在套用函式內處理。
- 需求檔的固定介面名稱列為 Assumptions 中的固定約束。
- 多券失敗時回傳第一張失敗券（依傳入順序）的原因代碼。
- 沒有提交任何券：無折扣（折扣後金額等於訂單金額、折扣總額 0、`applied` 為空陣列）。

## 各 skill 完成摘要

- speckit-constitution：完成。產出 5 條原則（TypeScript strict、Gherkin/cucumber-js、Test-First、純函式領域邏輯、整數金額與明確失敗結果）、技術棧、開發流程、治理條文，版本 1.0.0，含 Sync Impact Report。
- speckit-specify：完成。`specs/001-multi-tenant-coupon/spec.md`（3 個使用者故事、FR-001 至 FR-013、Key Entities、SC-001 至 SC-003、Assumptions、Clarifications）與 `checklists/requirements.md`（第二輪全部通過）。`.specify/feature.json` 已寫入。
- speckit-clarify：完成（見上）。

### speckit-plan（2026-10-31 23:28 起）
- 產出：`specs/001-multi-tenant-coupon/plan.md`、`research.md`、`data-model.md`、`contracts/apply-coupons.md`、`quickstart.md`。Constitution Check 通過。
- 新增假設（需求方未明定，由我決定，記入 research.md）：
  - 百分比折扣採 `Math.floor(orderAmount * value / 100)`（向下取整，不多給折扣）。
  - 判定順序：整批（`DUPLICATE_COUPON` → `NOT_STACKABLE`），再依傳入順序逐張（`INVALID_COUPON` → `TENANT_MISMATCH` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET`），回傳第一個失敗。
  - `COUPON_NOT_FOUND` 無法由 `applyCoupons` 觸發：介面接收的是已取得的 `Coupon` 物件，函式無查表能力。此代碼保留給呼叫端。**需求方需確認此項**。
  - 折扣總額 = min(加總, 訂單金額)；沒有券時為成功、折扣 0。
  - `orderAmount` 非整數或為負、時間字串無法解析：拋出例外（程式錯誤），不使用業務失敗代碼。

### speckit-tasks（2026-10-31 23:29 起）
- 產出 `specs/001-multi-tenant-coupon/tasks.md`：Setup 2、Foundational 1、US1 4、US2 4、US3 4、Polish 3，共 18 項。每個故事先寫情境與 step definitions，再實作（constitution III）。

### speckit-implement（2026-10-31 23:29 至 23:31）
- checklist 閘門：`checklists/requirements.md` 全部勾選，PASS，直接進入實作。
- 順序：T001 骨架 → T002 typecheck/baseline → T003 builders → 撰寫完整 `coupon.feature`（25 情境，三個故事全部寫完）與 `coupon.steps.ts` → `npm test` 紅燈（25 failed，骨架拋 not implemented）→ 實作 `src/coupon.ts` → 綠燈。
- 偏離：tasks 要求依故事逐一紅綠，實際是一次寫完三故事的情境再一次實作。紅燈確認仍發生在實作之前。
- 結果：`npm run typecheck` 通過；`npm test` 25 scenarios / 175 steps 全綠。
- tasks.md 18 項已全部標 [X]。
- Quickstart 第 3 節抽查：10% 券 → 100/900；10%+100 → 200/800；800+500 → 1000/0，結果與預期相同。

### speckit-converge 第 1 輪（2026-10-31 23:32）
- 比對 spec / plan / tasks / constitution 與現況。
- 結論：除一項外均已滿足。
- **F1（contradicts, HIGH，阻斷）**：spec FR-009 與 Edge Cases 規定「代碼不存在 → `COUPON_NOT_FOUND`」，但 `applyCoupons` 的固定介面接收的是已取得的 `Coupon[]`，函式無法得知代碼不存在，因此程式不會回傳此代碼。這是 spec 與固定介面之間的衝突，不是 implement 可以完成的工作。依 research.md 第 3 節的決定，此代碼保留給呼叫端。
- 未附加任何收斂任務（implement 無法消除此項，附加只會循環）。因此本輪判定為**未收斂**，需要需求方確認。
- 其他檢核：SC-002（金額守恆、非負）與 SC-003（失敗必有原因）成立；FR-011（代碼唯一）以批次重複檢查涵蓋請求範圍內，店內全域唯一屬資料層，依 Assumptions 不在範圍內；無非需求內容（unrequested）。

### speckit-converge 第 2 輪（2026-10-31 23:32:40 再次喚醒後）
- 協調者 Q6 答覆：「你決定，照你的最佳判斷，固定介面不可更改」。
- 決定：`applyCoupons` 不回傳 `COUPON_NOT_FOUND`，改由呼叫端查券流程回傳；已在 spec（Edge Cases 與 Clarifications Q6）及 research.md 第 3 節補註。
- F1 因此不再是衝突：規格描述與實作一致。
- 重跑：`npm run typecheck` 通過；`npm test` 25 scenarios / 175 steps 全綠。tasks.md 未修改（無 Convergence 區段）。
- 結論：**Converged**。

## converge 輪數

- 第 1 輪：未收斂（F1：COUPON_NOT_FOUND 與固定介面衝突，待需求方裁示）。
- 第 2 輪：收斂（Converged）。
- 總輪數：2。

## 工具錯誤

- Edit 工具曾因未先 Read 而失敗（spec、BENCH-LOG、plan），均已改為先 Read 後完成，無實質影響。
- 無其他工具錯誤。
