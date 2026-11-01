# Implementation Plan: 限量搶購

**Branch**: `001-flash-sale` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-flash-sale/spec.md`

## Summary

在 `src/flash.ts` 實作 `createFlashSale(store, now)`，回傳符合需求固定介面的 `FlashSale` 物件。所有跨伺服器狀態只經過注入的 `Store`（只保證單鍵操作原子，無 compare-and-set，無交易）。核心設計是把「件數」與「限購額度」都表示為以 `Store.set(..., { nx: true })` 原子搶佔的單位槽（slot）；`set nx` 的成功與否是唯一的互斥點，不使用分散式鎖，因此伺服器卡住後恢復不會因租約過期而破壞一致性。

## Technical Context

**Language/Version**: TypeScript 5.x（`strict: true`），執行於 Node.js（`node --import tsx`）

**Primary Dependencies**: 無新增 runtime 依賴。開發相依沿用既有 `@cucumber/cucumber`、`tsx`、`typescript`、`@types/node`。`crypto.randomUUID` 來自 Node 內建模組。

**Storage**: 只透過注入的 `Store` 介面（需求固定，類似 Redis）。測試時使用測試內建的記憶體版 `Store`。

**Testing**: Cucumber.js（`npm test`）。Gherkin 位於 `tests/features/flash-sale/`，step definitions 位於 `tests/steps/`，記憶體版 `Store` 與假時鐘位於 `tests/support/`。

**Target Platform**: 多台 Node.js 伺服器共用一個 `Store`。

**Project Type**: library（單一模組 `src/flash.ts`）。

**Performance Goals**: 本規格無量化效能目標。`getRemaining` 允許 O(限量件數) 次 `get`，為已知取捨（見 research.md）。

**Constraints**: 不超賣、不超過限購、重送冪等、伺服器當機與卡住後恢復後仍一致（spec FR-010 至 FR-012）。時間一律來自 `now()`。本設計不依賴 `Store` 的 `px` 自動過期，保留由排程釋放（FR-008）。

**Scale/Scope**: 單一模組，測試情境規模為數百件以內。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I. TypeScript Strict Typing：符合。公開 API 與需求固定簽章一致，不使用 `any`。
- II. Test-First：符合（規劃）。tasks 階段會先產出 Gherkin 與 step definitions 並確認紅燈，再實作。
- III. No Shared Process State：符合。`src/flash.ts` 不使用模組層級可變狀態；跨伺服器狀態全部經 `Store`；時間只來自 `now()`。
- IV. Hermetic Tests：符合。測試只用記憶體版 `Store` 與假時鐘。
- V. Simplicity and Traceability：符合。無新增依賴；tasks 階段會把每條 FR 對應到至少一個 scenario。

**Gate result**: PASS（無違規，Complexity Tracking 留空）。

## Design

### Store 金鑰配置

| Key | 值 | 寫入方式 | 用途 |
|-----|----|---------|------|
| `flash:sale:{saleId}` | SaleRecord JSON | `set nx` | 搶購設定；重複開檔判斷（FR-002） |
| `flash:sales` | saleId 集合 | `sAdd` | 排程掃描所有搶購 |
| `flash:sale-holds:{saleId}` | holdId 集合 | `sAdd` | 排程掃描某搶購的保留 |
| `flash:slot:{saleId}:{i}`，i ∈ [1, quantity] | 持有此件的 holdId | `set nx` | 件數單位槽（FR-010 不超賣） |
| `flash:cslot:{saleId}:{customerId}:{j}`，j ∈ [1, perCustomerLimit] | 持有此額度的 holdId | `set nx` | 限購單位槽（FR-006） |
| `flash:req:{saleId}:{requestId}` | `{customerId, qty, holdId}` JSON | `set nx` | 請求冪等（FR-011） |
| `flash:hold:{holdId}` | HoldRecord JSON（saleId、customerId、qty、expiresAt） | `set nx` | 保留內容與到期時間 |
| `flash:ok:{holdId}` | `OK` | `set nx` | 搶購已確定成功（供重送回傳成功結果） |
| `flash:freed:{holdId}` | `OK` | `set nx` | 釋放者標記：每個保留的槽只由唯一的釋放者歸還（見 R1） |
| `flash:end:{holdId}` | `PAID` / `RELEASED` / `CANCELLED:{reason}` | `set nx` | 保留的唯一終態決定（先到先得） |

### 演算法

**openSale(input)**
1. 驗證：`saleId` 非空字串、`quantity` 與 `perCustomerLimit` 為正整數、`startsAt` 早於 `endsAt`。不合法 → `INVALID_INPUT`，不寫任何資料。
2. `set nx flash:sale:{saleId}`；失敗 → `DUPLICATE_SALE`。
3. `sAdd flash:sales` 登記。

**grab(input)**
1. 驗證 `qty` 為正整數、`saleId`／`customerId`／`requestId` 非空 → 否則 `INVALID_INPUT`。
2. 讀取 sale；不存在 → `SALE_NOT_FOUND`。
3. 時間：`now < startsAt` → `NOT_STARTED`；`now >= endsAt` → `ENDED`。
4. 冪等：`set nx flash:req:{saleId}:{requestId}`，值為 `{customerId, qty, holdId}`，holdId 由 `crypto.randomUUID()` 產生。若已存在：`customerId` 或 `qty` 不同 → `REQUEST_CONFLICT`；相同 → 輪詢 `flash:ok`（已確定成功則回傳保留結果）與 `flash:end`（為 `CANCELLED:{reason}` 則回該失敗；`RELEASED` 則回 `HOLD_EXPIRED`）；超過輪詢上限仍未決定 → `REQUEST_IN_PROGRESS`（R2，Q7）。
5. `set nx flash:hold:{holdId}`（expiresAt = now + 10 分鐘）；`sAdd flash:sale-holds:{saleId}`。
6. 限購（`claimUnits`）：依序 `set nx flash:cslot:{saleId}:{customerId}:{j}` 搶佔 `qty` 個空位；搶不足時回滾自己已搶到的槽、讓出執行權後重試，最多 `CLAIM_ROUNDS` 輪；超過仍不足 → 失敗 `LIMIT_EXCEEDED`（R4，Q8）。
7. 件數（`claimUnits`）：同步驟 6，搶佔 `qty` 個 `flash:slot:{saleId}:{i}`；超過輪數仍不足 → 失敗 `SOLD_OUT`，並回滾限購槽。
8. 失敗時：釋放本次已搶到的槽（只刪除值等於本 holdId 的槽），並 `set nx flash:end:{holdId}` = `CANCELLED:{reason}`。
9. 成功前檢查 `flash:end`：若排程已決定 `RELEASED`，回滾自己的槽並回 `HOLD_EXPIRED`；否則 `set nx flash:ok:{holdId}`，回傳 `{holdId, expiresAt}`。保留狀態由 `flash:end` 推導，不存在即為保留中。

**pay(holdId)**
1. 讀取 hold；不存在 → `HOLD_NOT_FOUND`。
2. `now >= expiresAt` → `HOLD_EXPIRED`，不改任何資料（FR-007，Q2 答案 A）。
3. 讀取 `flash:end`：`PAID` → 成功（冪等，FR-007）；`RELEASED` 或 `CANCELLED` → `HOLD_EXPIRED`（見 R3）。
4. 否則 `set nx flash:end:{holdId} = PAID`；成功 → 成功。失敗 → 重讀，若為 `PAID` → 成功，否則 `HOLD_EXPIRED`。
5. pay 不讀取 sale 的 endsAt（Q3 答案 A：搶購結束只影響搶）。

**sweep()**（每台伺服器每分鐘各執行一次）
1. 讀取 `flash:sales`，對每個 saleId 讀取 `flash:sale-holds:{saleId}`。
2. 對每個 hold：若 `now >= expiresAt` 且 `flash:end` 不存在，`set nx flash:end = RELEASED`。若 `flash:end` 為 `RELEASED` 且 `flash:freed` 尚未寫入，`set nx flash:freed`；只有贏得 nx 的一方掃描該 sale 的件數槽與該顧客的限購槽，刪除值等於 holdId 的槽（刪除前以 `get` 確認）。掃描而非依索引，因此 HoldRecord 不記錄槽索引。
3. 已 `PAID`、已 `RELEASED`、`CANCELLED` 者跳過（FR-008：已成交不釋放；同一筆只歸還一次）。

**getRemaining(saleId)**
- `quantity` 減去 `flash:slot:{saleId}:{i}` 中非空者數量（即保留中與已成交件數，FR-009）。被釋放的槽立即計入剩餘。

**getHold(holdId)**
- 讀取 hold 與 `flash:end`：`PAID` → `PAID`；`RELEASED` 或 `CANCELLED` → `EXPIRED`；否則 `HELD`（即使已過到期但排程尚未釋放，仍顯示 `HELD`，與 Q2 一致）。

### 故障情境

- **伺服器當機於 grab 中途**：已搶到的槽仍被 holdId 佔用，hold 沒有 `flash:end`。排程到期後決定 `RELEASED` 並釋放這些槽，件數不會永久鎖住，也不會超賣。
- **伺服器卡住後恢復**：其後續 `set nx` 若在 hold 已被決定之後才執行，會因 `flash:end` 已存在而不改變結果；取消路徑只刪除值等於自己 holdId 的槽，不會誤刪他人的槽。
- **重送**：`flash:req` 保證同一請求只對應一個 holdId；重送不重複扣件。

## Project Structure

### Documentation (this feature)

```text
specs/001-flash-sale/
├── spec.md
├── plan.md              # 本檔
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── flash-sale.md    # Phase 1：公開介面與原因代碼
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
└── flash.ts             # 公開介面 createFlashSale，固定簽章

tests/
├── features/
│   └── flash-sale/      # Gherkin scenarios（tasks 先產出，先紅燈）
├── steps/
│   └── flash-sale.steps.ts
└── support/
    ├── memory-store.ts  # 記憶體版 Store（僅測試用）
    └── fake-clock.ts    # 可手動推進的 now()
```

**Structure Decision**: 單一 library 模組。`src/flash.ts` 為唯一產品碼；測試替身置於 `tests/support/`，符合 `cucumber.cjs` 的 import 路徑（`tests/steps/**/*.ts`、`tests/support/**/*.ts`）。

## Complexity Tracking

> 無違反憲法的項目，本節留空。

## Known Risks and Deviations

- **R1 — 無 compare-and-set（Q6：已接受）**：`Store` 只提供單鍵原子操作。排程以 `flash:end` 的 nx 決定 `RELEASED`，再以 `flash:freed` 的 nx 標記唯一釋放者，之後才歸還槽。實作可恢復「決定釋放後、標記前」當機的情況（下一次排程會完成釋放，已有測試）。「標記後、歸還槽前」當機會讓槽保持被佔用（只會少賣，不會超賣），此為需求方授權接受的限制，記載於 spec.md Assumptions。
- **R2 — 進行中的重複請求（Q7：REQUEST_IN_PROGRESS）**：同一 requestId 第二次到達時，第一次請求可能尚未決定。實作以有限次數（1000 次）輪詢 `flash:ok`／`flash:end`；仍未決定則回 `REQUEST_IN_PROGRESS`，不保留件數（已有測試）。
- **R3 — 已取消保留的付款回應**：付款時若保留因搶購失敗而被取消，回 `HOLD_EXPIRED`。需求未指定此情況的代碼，本計畫以最接近的既定代碼處理，列為待確認假設。
- **R4 — 併發下的名額搶佔（Q8：必須處理完成）**：搶佔不足時回滾自己的槽，讓出執行權後重新搶佔，最多 `CLAIM_ROUNDS`（50）輪。他人暫時佔用的槽會在他們回滾後釋出，因此名額足夠時不會因併發而失敗（已有測試：三人各 2 件搶 4 件庫存恰好兩人成功，並以 300 組隨機交錯壓力測試驗證）。殘餘風險：若某請求在搶佔途中被無限期卡住並持續佔用槽，其他請求會在輪數用盡後回 `SOLD_OUT`；此情況不屬於「同時送來」的請求。
