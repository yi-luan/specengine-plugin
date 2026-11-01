# Research: 訂單服務

Technical Context 無 NEEDS CLARIFICATION；以下為技術選擇與整合模式的決策紀錄。

## R1. 重複事件辨識

- **Decision**: 以 `Set<string>` 記錄已處理的事件 id；`handle` 一開始先檢查，已處理即回 `[]`。之後再套狀態守衛。
- **Rationale**: 需求第 8 點明文至少一次送達；id 去重是最直接的冪等手段，狀態守衛則涵蓋「不同 id、同類型」的亂序情況。
- **Alternatives considered**: 只靠狀態守衛（可行，但對未來新增的非狀態副作用沒有保護）；以 (type, orderId) 去重（會誤殺合法的不同事件）。

## R2. 逾時判定方式

- **Decision**: `tick(now)` 線性掃描所有訂單，對 `PENDING` 且 `parse(now) - parse(at) >= 15 min` 者取消並發 `OrderCancelled`。不保存上次 tick 時間。
- **Rationale**: 需求方裁示「以當下狀態判定、≥ 15 分鐘」；不保存 tick 時間就自然滿足「時間倒退不產生效果」（US3-7），也避免多一個狀態。
- **Alternatives considered**: 優先佇列按到期時間排序（規模不需要）；在 `placeOrder`／`cancelOrder` 也檢查逾時（需求方 C3 裁示只由 tick 產生 TIMEOUT）。

## R3. 事件 id 產生

- **Decision**: `order-${n}`，n 為服務實例內遞增整數。
- **Rationale**: 技術介面要求全系統唯一；帶服務前綴即可與 `inventory-*`、`payment-*` 等不碰撞，且可讀、可預測，方便測試斷言。
- **Alternatives considered**: `crypto.randomUUID()`（唯一但測試斷言不便、依賴 Node 版本）；時間戳（可能重複）。

## R4. 時間比較

- **Decision**: `Date.parse()` 轉毫秒後相減；不驗證格式。
- **Rationale**: 技術介面保證 ISO 8601 字串；`Date.parse` 對 `YYYY-MM-DDTHH:mm:ssZ` 的解析是標準行為。
- **Alternatives considered**: 字串比較（對不同時區／毫秒位數不穩）；引入日期函式庫（違反原則 V）。

## R5. 測試結構（cucumber-js）

- **Decision**: 一個 feature 檔 `tests/features/order-service.feature`，以 Rule/Scenario 分 4 個 user story；一個步驟檔 `tests/steps/order.steps.ts`；自訂 World（`tests/support/world.ts`）持有服務實例、最近一次 `CommandResult`、最近一次 `handle`/`tick` 回傳的事件、以及測試用的事件 id 計數。
- **Rationale**: cucumber.cjs 已指定路徑；Given/When/Then 直接對應 spec 的驗收情境，可追溯。
- **Alternatives considered**: 每個 story 一個 feature 檔（可行，但情境共用步驟多，單檔較易維護）。

## R6. 其他服務事件的構造

- **Decision**: 步驟定義內提供 `makeEvent(type, orderId, extra?)`，id 為 `test-${n}`（測試專用前綴）；重複送達情境重用同一個事件物件。
- **Rationale**: 需求規定開發期間其他服務是空殼，測試要自備事件；用不同前綴避免與被測服務的 id 混淆。
- **Alternatives considered**: 呼叫同事的 stub（會 throw「尚未實作」）。
