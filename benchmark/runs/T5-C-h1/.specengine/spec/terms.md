# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 限量搶購 | 商家設定限量件數與時段，顧客在期間內搶購的活動 | flash_sale | FLASH_SALE |
| 搶購編號 | 一檔限量搶購的唯一識別 | flash_sale.sale_id | FLASH_SALE |
| 限量件數 | 該檔可供搶購的總件數 | flash_sale.quantity | FLASH_SALE |
| 每位顧客限購件數 | 單一顧客可取得的件數上限 | flash_sale.per_customer_limit | FLASH_SALE |
| 保留 | 搶到後系統替顧客暫留的件數，有 10 分鐘付款期限 | hold | FLASH_SALE |
| 保留編號 | 單筆保留的唯一識別 | hold.hold_id | FLASH_SALE |
| 保留到期時間 | 保留失效的時間點，為搶到時間加 10 分鐘 | hold.expires_at | FLASH_SALE |
| 成交 | 保留完成付款，件數正式歸顧客所有 | hold.status = PAID | FLASH_SALE |
| 釋放 | 保留到期未付款，件數歸還給剩餘可搶件數 | hold.status = EXPIRED | FLASH_SALE |
| 剩餘可搶件數 | 商品頁顯示的可搶件數 | getRemaining | FLASH_SALE |
| 搶購請求編號 | 同一次搶購請求的識別，供重送去重 | grab_request.request_id | FLASH_SALE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| FLASH-ERR-001 | INVALID_INPUT | 開檔或搶購參數不合法 | resolved/data/限量搶購_開檔時間順序與限購上限.md |
| FLASH-ERR-002 | DUPLICATE_SALE | 搶購編號已存在 | resolved/data/限量搶購_重複開檔處理.md |
| FLASH-ERR-003 | NOT_STARTED | 搶購尚未開始 | resolved/features/限量搶購_搶購時間邊界.md |
| FLASH-ERR-004 | ENDED | 搶購已結束 | resolved/features/限量搶購_搶購時間邊界.md |
| FLASH-ERR-005 | SOLD_OUT | 剩餘可搶件數不足 | resolved/features/限量搶購_剩餘件數不足時的反應.md |
| FLASH-ERR-006 | LIMIT_EXCEEDED | 超過每位顧客限購件數 | resolved/data/限量搶購_限購計算範圍.md |
| FLASH-ERR-007 | HOLD_EXPIRED | 保留已到期或已釋放，無法付款 | resolved/features/限量搶購_重複付款通知的回應.md |
| FLASH-ERR-008 | HOLD_NOT_FOUND | 找不到保留編號 | resolved/features/限量搶購_重複付款通知的回應.md |
| FLASH-ERR-009 | REQUEST_CONFLICT | 同一搶購請求編號但參數不同 | resolved/features/限量搶購_同一請求重送但參數不同.md |
