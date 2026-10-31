# Research: 訂單狀態機

本功能的技術選項已由專案既有設定與需求固定，沒有未決的 NEEDS CLARIFICATION，因此 Phase 0 只記錄決策。

## 決策 1：以純函式 + 判別聯合回傳結果

- **Decision**: 每個操作回傳 `OrderResult`（`{ ok: true, order } | { ok: false, reason }`），不拋出例外。
- **Rationale**: 需求第 8 條要求失敗時回傳原因；需求明訂全部為純函式。判別聯合讓呼叫端必須處理失敗分支。
- **Alternatives considered**: 拋出例外（不符合需求第 8 條的回傳形式）；回傳 `null`（無法帶原因）。

## 決策 2：整數金額以整數檢查

- **Decision**: 金額檢查使用 `Number.isInteger(x) && x > 0`。
- **Rationale**: 需求明訂金額為整數元；`Number.isInteger` 同時排除小數與 NaN。
- **Alternatives considered**: 只檢查 `> 0`（會放過小數）。

## 決策 3：已付款取消的退款記帳（來自 Clarifications Q1）

- **Decision**: 取消已付款訂單時，`refundedAmount = paidAmount`，狀態為 `CANCELLED`。
- **Rationale**: 需求方於 2026-10-31 確認（Q1: A）。
- **Alternatives considered**: 不計入退款（已被需求方否決）。

## 決策 4：測試框架

- **Decision**: 以既有的 cucumber-js + tsx 執行 feature 檔與 TypeScript 步驟定義。
- **Rationale**: 專案 `package.json` 與 `cucumber.cjs` 已設定，`npm test` 為唯一驗收入口（憲章）。
- **Alternatives considered**: 另加 node:test（會增加第二套測試入口，違反單一驗收入口原則）。
