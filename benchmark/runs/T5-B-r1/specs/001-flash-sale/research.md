# Research: 限量搶購在「只有原子單步操作的共用儲存」上的正確性

**Feature**: 001-flash-sale | **Date**: 2026-11-02

Technical Context 中沒有 NEEDS CLARIFICATION；本研究聚焦於如何用 `Store` 的七個原子操作
（get／set(nx,px)／del／incrBy／sAdd／sRem／sMembers）達成 FR-006／007／009／014／016／017／020／021。

## R1. 名額控制：計數器 vs 槽位宣告

**Decision**: 以「槽位宣告」控制名額。每檔搶購有 `quantity` 個槽位、每位顧客在該檔有
`perCustomerLimit` 個槽位；搶 N 件 = 成功宣告 N 個顧客槽位 + N 個搶購槽位。宣告 =
`set nx slot-key = holdId`，一個原子操作同時完成「佔用」與「記錄擁有者」。

**Rationale**: 任何「`incrBy` 加完再寫保留」或「寫保留再 `incrBy`」的兩步法，在兩步之間當機
都會留下無法歸屬的件數（FR-020 要求不得永久消失）或讓排程誤判（過度歸還 → 超賣）。
槽位宣告讓每一件被佔用的件數都自帶擁有者，排程可依擁有者的狀態決定是否釋放，守恆可證。

**Alternatives considered**:
- `incrBy(taken, qty)` → 超過上限則 `incrBy(-qty)` 回滾：最簡單，但「加完當機」永久漏件、
  「回滾前當機」亦漏件；且排程無法知道哪些件數是孤兒。拒絕。
- 以 `sMembers` 掃描所有保留加總後再決定：兩台同時讀到相同總和會雙雙放行 → 超賣。拒絕。
- 單調序號 + 已釋放總數：失敗時需補償 `incrBy`，仍有兩步窗口。拒絕。

## R2. 釋放與 ABA

**Decision**: 槽位有「世代」g。第 g 代宣告鍵 `…:slot:{n}:c{g}`（`set nx`，永不覆寫、永不刪）；
釋放第 g 代 = `set nx …:slot:{n}:r{g} = 1`。槽位目前狀態 = 從 g=0 往上找到第一個沒有釋放標記
的世代：有宣告 → 被誰佔用；無宣告 → 空閒，可在該世代宣告。

**Rationale**: 若用 `del` 釋放槽位，排程 A 讀到「槽 n 屬於已到期的 H1」後卡住，排程 B 已釋放、
新保留 H2 又宣告了槽 n，A 恢復後 `del` 會刪掉 H2 的槽 → H2 以為有件、實際沒有 → 超賣。
釋放標記綁定 (槽位, 世代)，而第 g 代宣告只可能屬於 H1，故釋放 (n, g) 永遠正確且冪等，
多台排程重複釋放無害。

**Alternatives considered**: `del` + 釋放前再 `get` 確認（縮小窗口但不消除）；槽位世代計數器
`incrBy`（兩台重複加會跳過一代，使別人的宣告失效）。皆拒絕。

## R3. 付款與排程的互斥終態

**Decision**: 每張保留一個終態鍵 `hold:{id}:final`，值 `PAID` 或 `EXPIRED`，只能用 `set nx`
寫一次。付款先檢查 `now() < expiresAt`，再 `set nx final=PAID`；失敗則讀回終態：`PAID` →
成功（重複通知冪等），`EXPIRED` → `HOLD_EXPIRED`。排程對到期保留 `set nx final=EXPIRED`，
勝出者才釋放其槽位。

**Rationale**: 滿足 FR-012／014／016／017／021：卡住的付款恢復後若排程已釋放，`set nx` 必輸，
不會把 EXPIRED 改回 PAID；已 PAID 的保留排程 `set nx` 必輸，不會釋放。

## R4. 重送冪等（requestId）

**Decision**: 搶購流程：
1. 讀 `req:{saleId}:{requestId}` 映射；若指向已確認（`hold:{id}:ok` 存在）的保留 → 直接回傳同一
   holdId／expiresAt（在時間檢查之前，所以搶購結束後的重送仍回原保留）。
2. 無映射：`incrBy req:{saleId}:{requestId}:n` 取得嘗試序號 → holdId =
   `{saleId}~{requestId}~{n}`；寫保留紀錄（`set nx`）、加入 `sale:{id}:holds` 與 customers 集合，
   再 `set nx` 映射。映射失敗代表另一台同時處理同一請求 → 回滾自己的紀錄，改走步驟 3。
3. 映射存在但未確認：輪詢（讓出事件迴圈）最多 N 次等待對方完成；若對方始終未完成（當機），
   接手以同一 holdId 繼續宣告槽位直到足額並寫 `ok`（宣告以 holdId 為擁有者，冪等）。
4. 名額不足：釋放自己已宣告的槽位、刪映射（確認值是自己才刪）、刪紀錄；回傳 `LIMIT_EXCEEDED`
   或 `SOLD_OUT`。失敗不留映射 → 同 requestId 重送視為新請求（C3）。

**Rationale**: 「先映射再佔名額」確保同一請求最多一張確認保留；接手機制讓「處理到一半當機」
的請求在重送時仍能成功；輪詢讓「兩台同時收到同一請求」在對方活著時直接拿到同一結果。
接手若與遲到的原處理者重疊，最壞是多佔槽位到到期後由排程釋放（不超賣）。

## R5. 排程可列舉性

**Decision**: `sales` 集合（開檔時先 `sAdd` 再 `set nx` 搶購，順序確保集合不漏）、
`sale:{id}:holds` 集合、`sale:{id}:customers` 集合。排程對每檔：到期未終態的保留 `set nx
final=EXPIRED`；掃描搶購槽位與各顧客槽位，擁有者終態為 EXPIRED 或紀錄不存在者釋放；
未確認且已到期的保留順便清掉指向它的映射，讓重送能重新開始。

## R6. 時間與格式

**Decision**: 以 `Date.parse()` 轉毫秒比較；輸出 `new Date(ms).toISOString()`。到期時刻 =
搶購當下 + 600000 ms。搶購期間 `startsAt ≤ now < endsAt`；到期 `now ≥ expiresAt`。

## R7. 掃描起點與成本

**Decision**: 宣告搶購槽位時由 holdId 的簡單雜湊決定起始索引並環繞掃描，降低多台同時擠在槽 0
的碰撞。售罄時最差掃完全部槽位（每槽約 2 次 get），測試規模可接受。顧客槽位數少，直接由 0 掃。

## R9. 名額競爭的活性：wait-die 與殘留宣告釋放（實作期間補記）

**Decision**: 一輪貪婪宣告湊不足時，依遇到的「尚未確認」擁有者決定：沒有 → 真的不足（SOLD_OUT／
LIMIT_EXCEEDED）；有 holdId 字串序比自己小的 → 自己釋放部分宣告、讓出一輪後重試；否則若「自己已有＋
較大編號者持有」仍湊不到需求 → 判定不足（避免空等），湊得到 → 保留部分宣告等對方退讓。最多重試
`MAX_CLAIM_ROUNDS`（200）輪。另外，宣告者遇到擁有者紀錄已不存在（回滾殘留）的宣告時直接釋放該世代並在
下一代宣告，不必等排程。

**Rationale**: 純貪婪宣告在高競爭下會出現「各拿一半、誰都湊不足」的部分宣告互卡（同一顧客兩筆請求各佔一個
顧客槽位、搶購槽位尾端多人各佔一格），導致有貨卻回 SOLD_OUT。以 holdId 定優先權是決定性的對稱破壞
（wait-die），不需要額外的鎖或計數器，也不影響 R1／R2 的不變量：所有宣告與釋放仍是 `set nx`。
「不可能湊足即失敗」避免小編號者抱著部分宣告等待永遠不會釋放的名額。

**Alternatives considered**: 以 `incrBy` 計數器決定名額（決定性但當機漏件，見 R1）；隨機退避重試
（非決定性、可能有貨卻失敗）；每檔搶購一把帶 TTL 的互斥鎖（TTL 依 `now()` 計算，測試時鐘不前進時當機者
會永久持鎖）。皆拒絕。

## R8. 測試用記憶體 Store

**Decision**: `tests/support/memory-store.ts` 實作 `Store`，以 `Map<string, {value, expiresAtMs?}>`
與 `Map<string, Set<string>>`，`px` 以注入的 `now()` 判定過期（讀取時 lazy 驅逐）。另提供
包裝器：**交錯**（每次操作前 `await` 讓出）、**當機**（第 k 次操作丟出例外並使該伺服器後續操作
全部失敗）、**卡住**（第 k 次操作等待一個可由測試放行的閘門）。
