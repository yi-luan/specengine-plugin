# Data Model: 限量搶購

所有資料都存放在注入的 `Store` 中，鍵名前綴為 `flash:`。數值以 JSON 字串儲存。

## SaleRecord

| 欄位 | 型別 | 說明 |
|------|------|------|
| saleId | string | 搶購編號，非空 |
| quantity | integer > 0 | 限量件數；決定件數槽數量 |
| perCustomerLimit | integer > 0 | 每位顧客限購件數；決定限購槽數量 |
| startsAt | ISO 8601 string | 開始時刻（含） |
| endsAt | ISO 8601 string | 結束時刻（含），此時刻起不可搶 |

Key: `flash:sale:{saleId}`（set nx）

## HoldRecord

| 欄位 | 型別 | 說明 |
|------|------|------|
| holdId | string | 隨機 UUID |
| saleId | string | 所屬搶購 |
| customerId | string | 顧客編號 |
| qty | integer > 0 | 保留件數 |
| expiresAt | ISO 8601 string | createdAt + 10 分鐘 |

（實作不記錄槽索引：失敗回滾使用搶佔過程中的本地索引，排程釋放則掃描 sale 的件數槽與該顧客的限購槽，比對值等於 holdId 者。）

Key: `flash:hold:{holdId}`（set nx）

## Hold 終態（HoldEnd）

| 值 | 意義 | 由誰寫入 |
|----|------|---------|
| `PAID` | 已成交 | pay（付款成功且未到期） |
| `RELEASED` | 已釋放（到期未付款） | sweep |
| `CANCELLED:{reason}` | 搶購失敗（未成為保留） | grab 失敗路徑 |

Key: `flash:end:{holdId}`（set nx；第一個寫入者決定終態）

其他標記鍵（set nx）：`flash:ok:{holdId}`（搶購已確定成功）、`flash:freed:{holdId}`（唯一釋放者）。

## 狀態推導

| 條件 | getHold 的 status |
|------|-------------------|
| 無 end，且尚未寫入 | HELD（包含已過到期但排程尚未釋放） |
| end = PAID | PAID |
| end = RELEASED 或 CANCELLED | EXPIRED |

## 槽（Slot）

| Key | 值 | 數量 |
|-----|----|------|
| `flash:slot:{saleId}:{i}` | 持有者 holdId 或不存在 | i ∈ [1, quantity] |
| `flash:cslot:{saleId}:{customerId}:{j}` | 持有者 holdId 或不存在 | j ∈ [1, perCustomerLimit] |

槽不存在 = 空位。剩餘件數 = quantity − 存在的件數槽數。

## 請求冪等記錄

| 欄位 | 型別 | 說明 |
|------|------|------|
| customerId | string | 第一次請求的顧客 |
| qty | integer | 第一次請求的件數 |
| holdId | string | 對應的保留 |

Key: `flash:req:{saleId}:{requestId}`（set nx）

## 索引集合

| Key | 內容 |
|-----|------|
| `flash:sales` | 所有 saleId |
| `flash:sale-holds:{saleId}` | 該搶購所有 holdId（供排程掃描） |
