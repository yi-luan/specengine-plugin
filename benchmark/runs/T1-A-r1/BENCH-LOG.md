# BENCH-LOG（A-r1：會員點數折抵）

- 開始時間：2026-10-20 02:01:38
- 結束時間：2026-10-20 02:03:10

## 假設

- 折抵 0 點算不算「折抵」？→ 決定：pointsToUse 必須 ≥ 1，0 或負數視為失敗（原因「折抵點數必須大於 0」），不當成無折抵的成功路徑。
- 折抵點數非整數（如 10.5）怎麼辦？→ 決定：直接失敗（原因「折抵點數必須是整數」），不自動四捨五入或無條件捨去。
- 「不得超過 30%」的邊界是否含等於？→ 決定：等於 30% 允許（例如 1000 元可用 300 點）；超過才失敗。
- 30% 上限非整數時（如 999 元 → 299.7）怎麼算？→ 決定：上限為無條件捨去後的整數（299 點），以整數運算 pointsToUse * 100 <= orderAmount * 30 判斷，避免浮點誤差。
- 超過 30% 上限時要自動縮減到上限還是失敗？→ 決定：失敗並回傳原因，不自動縮減（呼叫端可用匯出的 maxPointsFor() 自行計算上限）。
- 點數餘額不足時要失敗還是只扣到 0？→ 決定：失敗（原因「點數餘額不足」），不部分折抵。
- 多個條件同時不符時回傳哪個原因？→ 決定：固定檢查順序：訂單金額合法性 → 點數餘額合法性 → 折抵點數為整數 → 折抵點數 > 0 → 餘額足夠 → 30% 上限；回傳第一個不符者。
- 訂單金額為 0、負數或非整數怎麼辦？→ 決定：失敗（原因「訂單金額必須是正整數」）。
- 點數餘額為負數或非整數怎麼辦？→ 決定：失敗（原因「點數餘額必須是非負整數」）。
- NaN / Infinity 等非法數值？→ 決定：由 Number.isInteger 擋下，視同上述非整數失敗。
- 失敗原因的文字與語言？→ 決定：繁體中文固定字串，集中於 src/points.ts 的 REASONS 常數匯出，方便測試與呼叫端比對。
- 「折抵成功後餘額要扣掉」在純函式下如何體現？→ 決定：以回傳值 remainingPoints = pointsBalance - pointsToUse 表達；函式不修改輸入物件，失敗時餘額不變。
- 測試放哪裡？→ 決定：tests/features/points-discount.feature（zh-TW Gherkin）+ tests/steps/points.steps.ts，走原本 cucumber.cjs 已設定的路徑。

## 工具問題與處置

- 原本 cucumber.cjs 的 `loader: ['tsx']` 在本機 Node v24.18.0 會報「tsx must be loaded with --import instead of --loader」，測試完全跑不起來。處置：移除 `loader` 設定，並把 package.json 的 test script 改為 `node --import tsx node_modules/@cucumber/cucumber/bin/cucumber.js`。

## 最終結果

- `npm test`：20 scenarios (20 passed)、105 steps (105 passed)
- `npm run typecheck`：通過
