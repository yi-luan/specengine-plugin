# Implementation Plan: 限量搶購（Flash Sale）

**Branch**: `001-flash-sale` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-flash-sale/spec.md`

## Summary

在只共用一個類 Redis `Store`（單一操作原子、無交易、無 CAS、無 Lua）的多伺服器環境下，
實作 `src/flash.ts` 的 `createFlashSale(store, now)`：開檔、搶購（保留 10 分鐘）、付款成交、
排程釋放、剩餘件數與保留查詢。核心技術手法是**「名額槽位 + 世代」**：把每檔搶購的限量件數
與每位顧客的限購件數各拆成固定數量的槽位（slot），每個槽位以 `set nx` 由保留編號宣告所有權
（原子、自帶擁有者，當機不漏件），釋放以「該槽位該世代的釋放標記」`set nx` 表示（冪等、無
ABA），保留的終態（PAID／EXPIRED）以單一 `set nx` 終態鍵決定（付款與排程只能一方勝出）。
所有行為以 cucumber-js 的 Gherkin 場景驗收，`npm test` 全綠。

## Technical Context

**Language/Version**: TypeScript 5.6（strict、ES2022、NodeNext ESM），Node.js 24，以 `tsx` 載入

**Primary Dependencies**: 無 runtime 依賴；devDependencies 僅既有 `@cucumber/cucumber` 11、`tsx`、`typescript`、`@types/node`

**Storage**: 呼叫端注入的 `Store` 介面（get／set(nx,px)／del／incrBy／sAdd／sRem／sMembers）；測試用自製記憶體版 `Store`（tests/support/memory-store.ts）

**Testing**: `npm test` → cucumber-js（`cucumber.cjs`：features 在 `tests/features/**`，steps 在 `tests/steps/**`，support 在 `tests/support/**`）；`npm run typecheck` → `tsc --noEmit`

**Target Platform**: Node.js 伺服器程式庫（多實例，無共用記憶體）

**Project Type**: single project（library）

**Performance Goals**: 單次搶購在限量 S、限購 L 下 O(L + 掃描到足夠空槽的距離) 次 Store 操作；售罄時最差 O(S)；排程每檔 O(保留數 + S + 顧客數×L)。測試規模（S ≤ 數百、請求數 ≤ 數千）下 `npm test` 在數秒內完成

**Constraints**: 不可用模組層級變數共用狀態；時間只來自 `now()`；件數整數；介面名稱與型別不可更名；任何兩次 Store 操作之間都可能被其他伺服器插入、本機當機或卡住

**Scale/Scope**: 單一模組 `src/flash.ts`（約 300–400 行）、1 個記憶體 Store、5 個 feature 檔、1 組 step definitions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 結果 |
|------|------|------|
| I. TypeScript Strict | 所有程式碼在既有 tsconfig（strict）下通過 `tsc --noEmit`；不使用 `any` | PASS（設計中無需 `any`；JSON 解析以型別守衛收斂） |
| II. cucumber-js BDD 紅→綠 | 每條 FR 對應至少一個 Gherkin 場景；先寫 feature + steps 看紅燈，再實作 | PASS（tasks 會把測試任務排在實作之前） |
| III. src/tests 佈局 | 產品碼只在 `src/flash.ts`（+ 既有 `src/index.ts`）；測試在 `tests/features`、`tests/steps`、`tests/support`；介面名稱照需求 | PASS |
| IV. Shared-Store 正確性 | 不超賣、不超限購、重送冪等、兩台交錯、當機、卡住恢復都有場景；狀態全在 Store | PASS（研究結論見 research.md：槽位 + 世代 + 終態鍵） |
| V. 簡單與決定性 | 無隨機數；保留編號由 saleId／requestId／嘗試序號組成；時間只從 `now()` | PASS |
| 技術約束 | 不新增 runtime 依賴、不碰真實 DB／網路 | PASS |

**Gate 結果（Phase 0 前）**: 全部通過，無需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/001-flash-sale/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── flash-sale-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # 既有，保持不動
└── flash.ts             # 本功能全部產品碼：型別、鍵名、createFlashSale

tests/
├── features/
│   ├── open-sale.feature        # US4 商家開檔
│   ├── grab.feature             # US1 搶購、重送、連點、交錯、邊界
│   ├── pay.feature              # US2 付款、重複通知、到期拒付
│   ├── sweep.feature            # US3 排程釋放、雙伺服器、終態保護
│   ├── remaining.feature        # US5 剩餘件數與保留查詢
│   └── resilience.feature       # 當機、卡住恢復、守恆（FR-020／021）
├── steps/
│   └── flash.steps.ts           # 全部 step definitions
└── support/
    ├── memory-store.ts          # 記憶體版 Store（支援 px 以 now() 計、可注入當機／卡住）
    └── world.ts                 # cucumber World：時鐘、多台伺服器、結果暫存
```

**Structure Decision**: 單一專案。產品碼集中在 `src/flash.ts`（需求固定模組路徑），測試依
cucumber.cjs 既有設定分為 features／steps／support 三層；不另建 unit／integration 子目錄
（constitution III 已把 feature／steps／support 的路徑定死）。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

無違規，不適用。

## Phase 0: Research（摘要，全文見 research.md）

- R1 名額控制：計數器 `incrBy` 回滾法在「加完就當機」時會永久漏件 → 改用槽位 `set nx` 宣告（擁有者內建）。
- R2 釋放的 ABA：盲目 `del` 槽位會刪到別人新宣告的槽 → 釋放改成「(槽位, 世代) 釋放標記 `set nx`」，宣告永不覆寫。
- R3 付款 vs 排程競態：以 `hold:{id}:final` 單一 `set nx` 決定終態，卡住後恢復的付款寫入會輸給已發生的釋放。
- R4 重送冪等：`req:{saleId}:{requestId}` 映射先 `set nx` 再做名額；失敗者輪詢後接手完成（crash 復原）。
- R5 排程列舉：`sales` 集合、`sale:{id}:holds` 集合、`sale:{id}:customers` 集合用 `sAdd` 維護。
- R6 時間格式：以 `Date.parse` 比較，輸出 `toISOString()`。

## Phase 1: Design（產出）

- data-model.md：鍵空間、實體欄位、狀態機、不變量。
- contracts/flash-sale-api.md：對外介面（需求固定）、失敗原因代碼、檢查順序。
- quickstart.md：如何跑測試、如何手動驗證主要場景。

## Constitution Check（Phase 1 後再評估）

設計未引入新依賴、新目錄或模組層級狀態；槽位掃描的額外 Store 操作屬正確性必要成本，
在測試規模內可接受；所有時間比較皆以注入的 `now()` 為準。**Gate 結果：PASS**。
