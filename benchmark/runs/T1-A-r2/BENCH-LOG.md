# BENCH-LOG (A-r2)

- 開始時間：2026-10-20 02:01:38
- 結束時間：2026-10-20 02:03:14

## 假設

- 折抵點數為 0 怎麼辦？→ 視為失敗（原因「折抵點數必須大於 0」）；負數亦同。沒有折抵就不該呼叫折抵。
- 「不得超過 30%」的邊界含不含 30%？→ 剛好 30% 允許（1000 元可用 300 點），301 點才失敗。
- 30% 算出非整數（如 101 元 → 30.3）怎麼取？→ 無條件捨去，最高可折 30 點；比較用整數運算（points*100 > amount*30）避免浮點誤差。
- 折抵點數超過餘額怎麼辦？→ 失敗（原因「點數餘額不足」），不自動改成全額折抵。
- 餘額不足又同時超過 30% 時回哪個原因？→ 檢查順序固定：輸入合法性 → 點數為正整數 → 餘額不足 → 30% 上限；回第一個命中的原因。
- 訂單金額為 0、負數或非整數？→ 失敗（原因「訂單金額必須是大於 0 的整數」）。
- 點數餘額為負數或非整數？→ 失敗（原因「點數餘額必須是大於等於 0 的整數」）。
- 折抵點數非整數（含 NaN / Infinity）？→ 失敗（原因「折抵點數必須是整數」）。
- 「失敗原因」的格式？→ 繁體中文固定字串，集中在 `REASONS` 常數匯出以利測試比對。
- 「扣掉點數餘額」在純函式裡怎麼體現？→ 只回傳 remainingPoints = pointsBalance - pointsToUse，不修改輸入物件；失敗時結果不含 finalAmount / remainingPoints。
- 環境：原 cucumber.cjs 的 `loader: ['tsx']` 在 Node 24 會因 --loader 已棄用而啟動失敗 → 改成 `node --import tsx` 啟動 cucumber（package.json test script），並移除已棄用的 publishQuiet；測試內容不受影響。

## 產出檔案

- src/points.ts
- tests/features/points-discount.feature
- tests/steps/points-discount.steps.ts
- BENCH-LOG.md
- 修改：package.json（test script）、cucumber.cjs（移除 loader / publishQuiet）

## npm test

19 scenarios (19 passed), 110 steps (110 passed)；`npx tsc --noEmit` 通過。
