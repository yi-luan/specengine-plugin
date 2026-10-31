# Data Model: 多租戶優惠券

所有型別於 `src/coupon.ts` 匯出，形狀與名稱依需求檔固定，不可更名。

## Coupon

| 欄位 | 型別 | 說明 | 驗證（由 applyCoupons 判定） |
|------|------|------|------------------------------|
| tenantId | string | 所屬租戶 | 必須與 `ApplyInput.tenantId` 相同，否則 `TENANT_MISMATCH` |
| code | string | 券代碼，同一租戶內唯一 | 同一請求中同 tenantId + code 出現兩次 → `DUPLICATE_COUPON` |
| type | `'PERCENT' \| 'FIXED'` | 折扣類型 | — |
| value | number | PERCENT 為 1–100 的整數百分比；FIXED 為正整數元 | 不合法 → `INVALID_COUPON` |
| validFrom | string (ISO 8601) | 有效期間起（含） | `now` 早於此時刻 → `COUPON_EXPIRED` |
| validTo | string (ISO 8601) | 有效期間迄（含） | `now` 晚於此時刻 → `COUPON_EXPIRED` |
| stackable | boolean | 是否可疊加 | 不可疊加且批次內券張數 > 1 → `NOT_STACKABLE` |
| minOrderAmount | number，選填 | 最低消費（元）；未設定表示無限制 | `orderAmount < minOrderAmount` → `MIN_ORDER_NOT_MET` |

## ApplyInput

| 欄位 | 型別 | 說明 |
|------|------|------|
| tenantId | string | 訂單所屬租戶 |
| orderAmount | number | 折扣前訂單金額（整數元，非負） |
| coupons | Coupon[] | 提交的券，順序即為 `applied` 的順序 |
| now | string (ISO 8601) | 判定有效期間所用的當下時間 |

## ApplyResult

- 成功：`{ ok: true; finalAmount: number; discount: number; applied: string[] }`
  - `finalAmount` = orderAmount − discount，整數且不小於 0
  - `discount` = min(各券折扣加總, orderAmount)，整數
  - `applied` = 實際套用券的代碼，依傳入順序
- 失敗：`{ ok: false; reason: string }`，`reason` 為下列固定代碼之一：

| 代碼 | 觸發條件 |
|------|----------|
| `INVALID_COUPON` | 券值不合法 |
| `TENANT_MISMATCH` | 券不屬於訂單租戶 |
| `COUPON_EXPIRED` | 不在有效期間內 |
| `MIN_ORDER_NOT_MET` | 未達最低消費 |
| `NOT_STACKABLE` | 不可疊加券與其他券同時提交 |
| `DUPLICATE_COUPON` | 同一券在請求中重複出現 |
| `COUPON_NOT_FOUND` | 保留給呼叫端的查詢流程，本函式不會回傳（見 research.md 第 3 節） |

## 狀態

本功能無狀態轉換與持久化，所有資料為單次呼叫的輸入與輸出。
