# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 搶購檔次 | 商家開的一檔限量搶購活動 | flash_sales / SaleInput | FLASH_SALE |
| 搶購編號 | 一檔搶購的唯一識別 | flash_sales.sale_id / saleId | FLASH_SALE |
| 限量件數 | 這檔搶購總共只賣這麼多件 | flash_sales.quantity | FLASH_SALE |
| 限購件數 | 每位顧客在這檔最多能買的件數 | flash_sales.per_customer_limit / perCustomerLimit | FLASH_SALE |
| 開始時間 | 搶購期間的起點（含） | flash_sales.starts_at / startsAt | FLASH_SALE |
| 結束時間 | 搶購期間的終點（不含） | flash_sales.ends_at / endsAt | FLASH_SALE |
| 搶購期間 | 開始時間（含）到結束時間（不含）之間 | — | FLASH_SALE |
| 剩餘可搶件數 | 商品頁顯示、目前還能搶的件數 | flash_sales.remaining / getRemaining | FLASH_SALE |
| 顧客 | 來搶購的人 | holds.customer_id / customerId | FLASH_SALE |
| 搶購 | 顧客在搶購期間指定件數送出請求 | FlashSale.grab | FLASH_SALE |
| 搶購件數 | 顧客這次要搶幾件 | GrabInput.qty / holds.qty | FLASH_SALE |
| 請求編號 | 呼叫端對每次搶購請求給的編號，網路逾時重送時沿用同一個 | grab_requests.request_id / requestId | FLASH_SALE |
| 保留 | 搶到後系統替顧客暫時留住的件數 | holds / Hold | FLASH_SALE |
| 保留編號 | 一筆保留的唯一識別 | holds.hold_id / holdId | FLASH_SALE |
| 到期時間 | 保留失效的時刻 = 建立時間 + 10 分鐘；現在時間 >= 到期時間即為已到期 | holds.expires_at / expiresAt | FLASH_SALE |
| 保留中 | 已搶到、尚未付款也尚未被排程釋放 | HoldStatus 'HELD' | FLASH_SALE |
| 已成交 | 付款成功，保留轉為成交 | HoldStatus 'PAID' | FLASH_SALE |
| 已釋放 | 到期未付款，排程已把件數還回 | HoldStatus 'EXPIRED' | FLASH_SALE |
| 付款通知 | 金流告知系統某筆保留付款成功 | FlashSale.pay | FLASH_SALE |
| 金流 | 外部付款服務，付款結果以通知送達，可能重複送達 | — | FLASH_SALE |
| 排程 | 每分鐘在每台伺服器各跑一次、釋放到期未付款保留的工作 | FlashSale.sweep | FLASH_SALE |
| 釋放 | 把到期未付款的保留件數還給其他人搶，並扣回該顧客的累計佔用件數 | sweep → EXPIRED | FLASH_SALE |
| 伺服器 | 一個 createFlashSale 實例；多台之間不共用記憶體 | createFlashSale(store, now) | FLASH_SALE |
| 共用儲存 | 所有伺服器共用的原子 key-value 儲存，類似 Redis | Store | FLASH_SALE |
| 現在時間 | 一律由 now() 取得的 ISO 8601 時間 | now() | FLASH_SALE |
| 累計佔用件數 | 某顧客在某檔次目前被計入限購的件數 = 保留中 + 已成交件數 | customer_quotas.used_qty | FLASH_SALE |
| 失敗原因 | 操作失敗時回傳的英文大寫代碼 | Result.reason | FLASH_SALE |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | SOLD_OUT | R-FLASH_SALE-005／012 剩餘可搶件數不足的失敗原因 | resolved/features/限量搶購_剩餘不足時的反應.md、resolved/data/限量搶購_失敗原因文案格式.md |
| MSG-002 | LIMIT_EXCEEDED | R-FLASH_SALE-006／013 超過限購件數的失敗原因 | resolved/features/限量搶購_超過限購時的反應.md、resolved/data/限量搶購_失敗原因文案格式.md |
| MSG-003 | NOT_STARTED | R-FLASH_SALE-007 搶購尚未開始的失敗原因 | resolved/data/限量搶購_失敗原因文案格式.md |
| MSG-004 | ENDED | R-FLASH_SALE-008 搶購已結束的失敗原因 | resolved/data/限量搶購_失敗原因文案格式.md |
| MSG-005 | INVALID_INPUT | R-FLASH_SALE-023／024 開檔或搶購參數不合法的失敗原因（共用） | resolved/features/限量搶購_開檔參數不合法的反應.md、resolved/features/限量搶購_搶購輸入不合法的反應.md |
| MSG-006 | SALE_NOT_FOUND | R-FLASH_SALE-025 搶購編號不存在的失敗原因 | resolved/features/限量搶購_搶購輸入不合法的反應.md |
| MSG-007 | DUPLICATE_SALE | R-FLASH_SALE-022 搶購編號重複開檔的失敗原因 | resolved/features/限量搶購_重複開同一搶購編號.md |
| MSG-008 | HOLD_EXPIRED | R-FLASH_SALE-009／014／020 保留已到期或已釋放的付款失敗原因 | resolved/features/限量搶購_到期後排程釋放前收到付款.md、resolved/features/限量搶購_重複付款通知的回應.md |
| MSG-009 | HOLD_NOT_FOUND | R-FLASH_SALE-010 保留編號不存在的付款失敗原因 | resolved/features/限量搶購_重複付款通知的回應.md |
