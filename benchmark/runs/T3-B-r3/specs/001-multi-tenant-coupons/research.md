# Research: 多租戶優惠券

Technical Context 無 NEEDS CLARIFICATION；以下記錄設計決策。

## R1 驗證流程：依類別逐層檢查整個請求

- Decision: 依 FR-016 的順序，每一層對「整個請求」檢查（所有券），命中即回傳該 reason；全部通過才計算。
- Rationale: 需求方指定「回報第一個命中的」且以類別排序（FR-021），逐層檢查保證結果與券的順序無關（除了 DUPLICATE）。
- Alternatives: 逐張券跑完所有檢查（reason 會依券順序而變，與需求方指定順序不符）。

## R2 時間比較

- Decision: `Date.parse()` 轉成毫秒時間戳；`NaN` 視為無法解析。`now` 無法解析 → `INVALID_INPUT`；券的 validFrom/validTo 無法解析或 validFrom > validTo → `INVALID_COUPON`。有效條件 `from ≤ now ≤ to`。
- Rationale: 需求方指定「以時間戳比較」；字串比較會受時區格式影響。
- Alternatives: 字串字典序比較（不同時區表示法會出錯）。

## R3 整數與金額

- Decision: 以 `Number.isInteger` 判斷整數。PERCENT 折扣 = `Math.floor(orderAmount * value / 100)`（兩者皆整數，乘法在安全整數範圍內精確）；FIXED 折扣 = value。
- Rationale: FR-012、FR-015。
- Alternatives: `Math.round`／進位（需求方選無條件捨去）。

## R4 DISCOUNT_EXCEEDS_AMOUNT

- Decision: 各券折扣加總 > orderAmount → 拒絕；等於 → 成功，finalAmount = 0。
- Rationale: 需求方 C2-a 答 A。

## R5 疊加規則

- Decision: 券數 > 1 且任一張 `stackable === false` → `NOT_STACKABLE`。
- Rationale: 需求方 Q2 答 B（不可疊加券只能單獨使用）。

## R6 防禦性檢查

- Decision: 型別在編譯期固定，但執行期仍以 `unknown` 檢查（呼叫端可能來自 JS／JSON）。未由需求方指定的欄位依團隊判斷納入 FR-019／FR-020。
- Rationale: 需求方授權「照你的最佳判斷」。

## R7 測試技術

- Decision: cucumber-js + Gherkin（繁中描述、英文關鍵字），以 Data Table 定義券，`assert` 模組（node:assert/strict）斷言。
- Rationale: 憲章 II、III；不新增依賴。
