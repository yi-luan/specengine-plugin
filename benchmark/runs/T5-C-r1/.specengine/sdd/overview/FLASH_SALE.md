# 模組總覽：FLASH_SALE（限量搶購）

- 建立：2026-11-02 02:26（spec-01，plugin 2.1.0）
- 最近更新：2026-11-02 02:32（spec-02 第 1 輪，13 題全數解決）
- 矩陣：27 條 Rule（main_flow 5、edge_case 22）
- erm.dbml：flash_sales、holds、grab_requests、customer_quotas（4 Tables）
- terms.md：27 個術語、9 條固定文案（MSG-001～009）
- exclusions：3 條（X-FLASH_SALE-001～003）
- 套用慣例：0 項（spec-01 時 policy-defaults.md 尚無條目）；本模組晉升 9 條（POLICY-001～009）

## 待答問題統計

| 優先級 | 數量 |
| :--- | ---: |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| 合計 | 0 |

已解決：13 ｜ 掛起：0

## 已解決問題（歸檔於 resolved/）

1. features/限量搶購_剩餘不足時的反應.md → A（SOLD_OUT 整筆拒絕）
2. features/限量搶購_超過限購時的反應.md → A（LIMIT_EXCEEDED 整筆拒絕）
3. features/限量搶購_限購件數的累計方式.md → A（保留中＋已成交，釋放後還回）
4. features/限量搶購_同一請求重送的處理.md → A（成功回放、失敗重判）
5. features/限量搶購_到期後排程釋放前收到付款.md → A（HOLD_EXPIRED）
6. features/限量搶購_重複付款通知的回應.md → A（回成功）
7. features/限量搶購_時間邊界的歸屬.md → A（半開區間，到期含）
8. features/限量搶購_伺服器當機造成的件數遺失.md → 授權執行者：A（不回收，記 exclusions）
9. features/限量搶購_重複開同一搶購編號.md → A（DUPLICATE_SALE）
10. features/限量搶購_開檔參數不合法的反應.md → 自填（INVALID_INPUT；限購>限量允許、時間格式錯誤拒絕由執行者決定）
11. features/限量搶購_搶購輸入不合法的反應.md → 自填（INVALID_INPUT／SALE_NOT_FOUND；不存在檔次剩餘回 0 由執行者決定）
12. data/限量搶購_失敗原因文案格式.md → 自填（9 個英文大寫代碼）
13. data/限量搶購_保留紀錄保存期限.md → 授權執行者：A（永久保存，記 exclusions）

## 流程對齊

矩陣 27 條 Rule、多分支，超過小模組精簡確認門檻（< 4 條且無分支），需走 `spec flow-align`。
