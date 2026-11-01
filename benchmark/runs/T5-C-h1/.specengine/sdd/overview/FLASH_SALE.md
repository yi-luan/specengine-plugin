# 限量搶購（FLASH_SALE）釐清佇列總覽

- 來源需求：tasks/t5/requirement.md（唯讀）
- 矩陣：18 條 Rule（R-FLASH_SALE-000 為 main_flow，其餘為 edge_case）
- erm.dbml：3 個 Table（flash_sale、hold、grab_request）
- terms.md：11 個術語
- exclusions：0 條（需求未明寫「不做」項目）
- 本輪套用的慣例：0 項（.specengine/spec/policy-defaults.md 尚不存在）

## 問題統計
- 已解決：9 題（全部由需求方回答或 spec-02 依最佳判斷裁示，見 resolved/）
- 待答：0 ｜ 掛起：0

## 已解決題（resolved/）
- data/限量搶購_限購計算範圍.md（需求方 B）
- data/限量搶購_重複開檔處理.md（需求方 A）
- data/限量搶購_開檔時間順序與限購上限.md（需求方指定時間順序；限購大於限量由 spec-02 裁示為 INVALID_INPUT）
- features/限量搶購_剩餘件數不足時的反應.md（需求方 A）
- features/限量搶購_過期未釋放期間件數可否搶.md（spec-02 裁示 A，需求方授權）
- features/限量搶購_重複付款通知的回應.md（需求方 A）
- features/限量搶購_同一請求重送時保留已過期或已成交.md（需求方裁示）
- features/限量搶購_搶購時間邊界.md（需求方 A）
- features/限量搶購_同一請求重送但參數不同.md（spec-02 裁示 A，需求方授權）

## 本輪套用的慣例
無（POLICY 尚未晉升；重複付款與重複開檔標記為可複用候選，待 flow-align 後再決定是否晉升）
