# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 庫存總量 | 某商品 SKU 目前實際擁有的數量 | stock_item.total_qty | INVENTORY |
| 可供保留庫存 | 某商品 SKU 目前還能保留給新訂單的數量（庫存總量扣除保留中的數量） | stock_item.total_qty 減去 reservation.qty（status = RESERVED） | INVENTORY |
| 保留 | 為某張訂單把庫存先留下來，不給其他訂單用 | reservation 一筆紀錄，status = RESERVED | INVENTORY |
| 放回 | 把為某張訂單保留的庫存還回可供保留庫存 | reservation.status 改為 RELEASED | INVENTORY |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
