# Research: 訂單狀態機

Technical Context 無 NEEDS CLARIFICATION（技術棧由 constitution 與需求固定）。以下記錄設計層級決策。

## R1. 狀態轉移的表示法

- **Decision**: 以「每個操作一個函式 + 函式開頭的狀態守衛」實作（`if (order.status !== 'CREATED') return fail('INVALID_TRANSITION')`），不引入通用轉移表。
- **Rationale**: 只有 5 個狀態、5 個操作，守衛式最直觀、最容易逐條對應 spec 的 FR；通用轉移表會增加抽象卻無複用價值。
- **Alternatives considered**: 轉移表 `Record<OrderStatus, Set<Action>>`（可讀但多一層間接）；class 狀態模式（違反純函式慣例）。

## R2. 失敗代碼與判定順序

- **Decision**: 定義 `const REASONS = { INVALID_AMOUNT, AMOUNT_MISMATCH, INVALID_TRANSITION, REFUND_EXCEEDS_PAID }`，`reason` 型別仍為需求固定的 `string`。每個函式固定順序：狀態 → 金額合法性（正整數）→ 金額比對。
- **Rationale**: 與 Clarifications/FR-015 一致；順序固定可讓「已取消訂單付款 -1」等複合錯誤情境有唯一期望值。
- **Alternatives considered**: 以 enum/union 型別縮窄 `reason`（會改動固定介面 `OrderResult`，FR-014 禁止）。

## R3. 金額合法性判定

- **Decision**: `Number.isInteger(n) && n > 0` 視為合法；其餘（0、負數、小數、NaN、Infinity）回傳 `INVALID_AMOUNT`。
- **Rationale**: 需求規定「金額皆為整數元」；需求方對非整數交由執行者決定，採最嚴格且可測的定義。
- **Alternatives considered**: 只檢查 `> 0`（會讓 10.5 通過，違反整數元規定）。

## R4. 純函式與不變性驗證方式

- **Decision**: 成功時以 `{ ...order, status, paidAmount, refundedAmount }` 回傳新物件；測試在每次操作前以 `structuredClone` 快照傳入訂單，操作後 `deepStrictEqual` 比對。
- **Rationale**: 直接驗證 FR-012 / SC-003，不依賴 `Object.freeze`。
- **Alternatives considered**: 在產品碼 `Object.freeze` 回傳值（多餘，且未驗證「傳入物件不變」）。

## R5. 測試組織

- **Decision**: 單一 feature 檔 `tests/features/order-state-machine.feature`，以 `Rule:` 區塊對應需求 1–8，`Scenario Outline` 處理非法轉移矩陣；單一 steps 檔 + 自訂 World。
- **Rationale**: 專案 `cucumber.cjs` 已指定 glob；一個 feature 檔便於與 spec 逐條對照；`Rule` 是 Gherkin 6+ 原生語法，cucumber-js 11 支援。
- **Alternatives considered**: 每個 User Story 一個 feature 檔（可行，但對 30 個情境的規模屬過度拆分）。

## R6. 斷言函式庫

- **Decision**: `node:assert/strict`。
- **Rationale**: 零新依賴（constitution Technology Constraints）；`deepStrictEqual` 足以比對訂單物件。
- **Alternatives considered**: chai / expect（需新增 devDependency，無必要）。
