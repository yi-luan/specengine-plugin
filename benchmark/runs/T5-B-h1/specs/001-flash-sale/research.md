# Research: 限量搶購

## 1. 併發下的件數保證：單位槽（set nx）而非計數器回滾

- **Decision**: 每個件數與每個限購額度各自是一個以 `set nx` 搶佔的單位槽。
- **Rationale**: `incrBy` 加上回滾的做法，在回滾前其他請求會看到被灌水的計數而誤拒，且在伺服器中途失敗時無法得知已加多少。`set nx` 每次只能有一方成功，失敗方不會留下狀態，天然滿足不超賣。
- **Alternatives considered**:
  - 分散式鎖（`set nx px` 租約）：伺服器卡住超過租約後，舊伺服器恢復仍會寫入，違反 FR-012。拒絕。
  - `incrBy` 計數加回滾：見上，可能誤拒且失敗路徑不可靠。拒絕。
  - 單一 JSON 狀態 + 讀後寫：沒有 CAS，無法防止併發覆寫。拒絕。

## 2. 保留終態：`flash:end` 的 nx 先到先得

- **Decision**: 保留只有一個終態（PAID / RELEASED / CANCELLED），由 `set nx` 決定。
- **Rationale**: 付款與排程釋放可能同時發生，nx 保證只有一方勝出，另一方重讀後得到一致結果。
- **Alternatives considered**: 以時間判斷單獨決定（不寫終態）：無法防止「付款與釋放同時成功」的情況。拒絕。

## 3. 冪等請求：`flash:req` 佔位

- **Decision**: 以 `set nx` 佔住 `{saleId, requestId}`，值含 customerId、qty 與 holdId。
- **Rationale**: 第一次請求決定 holdId；重送直接對應同一 hold；內容不同 → `REQUEST_CONFLICT`（Q5 由規劃者決定）。
- **Alternatives considered**: 以 holdId = hash(requestId) 推導：不同 customer 相同 requestId 會碰撞，但仍需比對內容。以 requestId 作 holdId 也可行但會暴露請求識別字；採用隨機 UUID。

## 4. 排程釋放與取消的責任歸屬

- **Decision**: 只有贏得 `flash:end` nx 的一方釋放槽。
- **Rationale**: 避免兩個排程同時刪除同一批槽，減少誤刪他人新搶佔槽的風險（仍有 R1 殘餘風險）。
- **Alternatives considered**: 每台伺服器都釋放（加 `get` 確認）：仍有 get 與 del 之間的競態。拒絕作為主要機制，僅作為恢復步驟的保守版本。

## 5. 剩餘件數的計算成本

- **Decision**: `getRemaining` 讀取全部件數槽。
- **Rationale**: Store 沒有計數 + 原子 CAS，只能直接計數；精確優先於效能（SC-005）。
- **Alternatives considered**: 額外維護計數器：會引入與槽不一致的風險。拒絕。限量件數大時再考慮快取（超出本次範圍）。

## 6. 時間與過期

- **Decision**: 保留到期時間 = 建立時 now() + 10 分鐘，寫入 hold 記錄；不使用 `Store` 的 `px` 自動過期。
- **Rationale**: FR-008 規定釋放由排程負責；若 `px` 自動清除槽，件數會在排程執行前提前釋放，違反規格且使測試不可預測。
- **Alternatives considered**: 使用 `px` 作為保險：會與排程釋放衝突。拒絕。

## Open items carried into tasks

- R2（進行中的重複請求的等待策略）、R3（已取消保留的付款代碼）、R1（恢復步驟的具體形式）必須在 tasks 階段以測試釘住行為。
