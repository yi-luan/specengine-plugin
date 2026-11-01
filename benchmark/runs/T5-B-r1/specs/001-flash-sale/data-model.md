# Data Model: 限量搶購

**Feature**: 001-flash-sale | **Date**: 2026-11-02

所有狀態都在 `Store`。鍵一律以 `fs:` 開頭。值為字串；結構化資料以 JSON 字串存放，讀取時以型別守衛驗證。

## 實體

### Sale（搶購）

- 鍵：`fs:sale:{saleId}` → JSON `{ saleId, quantity, perCustomerLimit, startsAt, endsAt }`
- 寫入：`set nx`（只寫一次；重複 → `DUPLICATE_SALE`）
- 驗證（開檔時，`INVALID_INPUT`）：`saleId` 非空字串；`quantity`、`perCustomerLimit` 為正整數
  （`Number.isInteger(x) && x > 0`）；`startsAt`、`endsAt` 可被 `Date.parse` 且 `startsAt < endsAt`
- 關聯：`fs:sales`（集合，所有 saleId，供排程列舉；開檔時先 `sAdd` 再寫 Sale）

### Hold（保留）

- 紀錄鍵：`fs:hold:{holdId}` → JSON `{ holdId, saleId, customerId, qty, expiresAt }`（不可變，`set nx`）
- 確認鍵：`fs:hold:{holdId}:ok` → `"1"`（名額足額宣告完成後寫入；沒有此鍵的保留對外不存在）
- 終態鍵：`fs:hold:{holdId}:final` → `"PAID"` 或 `"EXPIRED"`（`set nx`，只能寫一次）
- holdId 格式：`{saleId}~{requestId}~{attempt}`，attempt 來自 `incrBy fs:req:{saleId}:{requestId}:n 1`
- 對外狀態（`HoldStatus`）推導：
  - 紀錄或確認鍵不存在 → `getHold` 回 `null`
  - 終態 `PAID` → `PAID`；終態 `EXPIRED` → `EXPIRED`；無終態 → `HELD`（即使 `now ≥ expiresAt` 但尚未被排程處理）
- 關聯：`fs:sale:{saleId}:holds`（集合，該檔所有 holdId）、`fs:sale:{saleId}:customers`（集合，該檔出現過的 customerId）

### Request Mapping（請求去重）

- 鍵：`fs:req:{saleId}:{requestId}` → holdId（`set nx`）
- 語意：同一請求目前對應的嘗試。成功確認後永久保留（重送回同一保留）；名額不足時由擁有者刪除
  （先 `get` 確認值等於自己的 holdId 再 `del`）；未確認且到期的嘗試由排程清掉映射

### Slot（名額槽位）

兩個槽位空間，結構相同：

- 搶購槽位：`fs:sale:{saleId}:slot:{n}`，n ∈ [0, quantity)
- 顧客槽位：`fs:cust:{saleId}:{customerId}:slot:{j}`，j ∈ [0, perCustomerLimit)

每個槽位有世代 g（從 0 起）：

- 宣告鍵：`{slot}:c{g}` → holdId（`set nx`；永不覆寫、永不刪除）
- 釋放鍵：`{slot}:r{g}` → `"1"`（`set nx`；冪等）
- 目前狀態 = 找到第一個 `r{g}` 不存在的 g：`c{g}` 存在 → 被該 holdId 佔用；不存在 → 空閒（可在 g 宣告）
- 釋放條件（排程）：擁有者終態為 `EXPIRED`，或擁有者紀錄不存在（失敗回滾後殘留）

## 狀態機（Hold）

```text
            set nx 紀錄            足額宣告 + set ok
 (無) ───────────────► PENDING ───────────────────► HELD
                          │                           │  set nx final=PAID（now < expiresAt）
                          │ 名額不足 → 回滾（釋放槽位、刪映射、刪紀錄）    ├──────────────────────────► PAID（終態）
                          ▼                           │  排程：now ≥ expiresAt → set nx final=EXPIRED
                        (無)                          └──────────────────────────► EXPIRED（終態，釋放槽位）
 PENDING 且 now ≥ expiresAt：排程 set nx final=EXPIRED、釋放槽位、清映射（對外仍不存在）
```

- `PAID` 與 `EXPIRED` 互斥：同一終態鍵只能 `set nx` 成功一次。
- 終態不可逆：沒有任何路徑會寫入 `del final` 或覆寫。

## 不變量

1. **不超賣**：任一時刻，同一搶購槽位同一世代最多一個宣告；世代 g 的宣告只在 `r{g}` 寫入後才視為釋放；
   因此「目前被佔用的搶購槽位數 ≤ quantity」恆成立，且 Σ(HELD+PAID 保留的 qty) ≤ 被佔用槽位數（每張確認保留至少佔 qty 槽）。
2. **不超限購**：同理於顧客槽位，Σ(該顧客 HELD+PAID 的 qty) ≤ perCustomerLimit。
3. **守恆**：`getRemaining = quantity − 目前被佔用的搶購槽位數`；排程跑過之後，被佔用槽位的擁有者皆為 HELD（未到期）或 PAID。
4. **去重**：同一 (saleId, requestId) 最多有一張確認保留被映射；重送回傳該保留。
5. **終態互斥**：每張保留的 `final` 至多寫入一次。

## 衍生查詢

- `getRemaining(saleId)`：Sale 不存在 → 0；否則掃描 quantity 個搶購槽位，計算目前被佔用數 c，回 `quantity − c`。
- `getHold(holdId)`：見 Hold 對外狀態推導。
