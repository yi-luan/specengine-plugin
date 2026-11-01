# 跨模組慣例

| ID | 立場 | 首次決策模組 | 歸檔路徑 | 日期 |
| :--- | :--- | :--- | :--- | :--- |
| POLICY-001 | 同一事件 id 一律只處理一次：重複送達的事件第二次起直接忽略，不改任何狀態、不發任何事件 | INVENTORY_RESERVATION | resolved/features/INVENTORY_RESERVATION_重複收到同一訂單OrderPlaced的回應.md、resolved/data/INVENTORY_RESERVATION_重複送達的判定依據.md | 2026-11-01 |
| POLICY-002 | 補償型事件（放回、退款等）找不到對應的前置狀態時不動作、不發補償事件；同一個對象的補償最多執行一次 | INVENTORY_RESERVATION | resolved/features/INVENTORY_RESERVATION_沒有可放回庫存時收到放回事件的回應.md | 2026-11-01 |
| POLICY-003 | 終結事件（取消、失敗）先於建立事件到達時，記住該對象已結束；之後到達的建立事件不執行、不發任何事件 | INVENTORY_RESERVATION | resolved/features/INVENTORY_RESERVATION_放回事件先於下單事件到達.md | 2026-11-01 |
