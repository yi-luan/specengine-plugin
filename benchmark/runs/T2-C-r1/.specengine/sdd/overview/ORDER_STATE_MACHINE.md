# 模組釐清佇列總覽：ORDER_STATE_MACHINE（訂單狀態機）

- 建立於：2026-10-20 07:27（spec-01，plugin 2.0.0）
- 矩陣：18 條 Rules（main_flow 1、edge_case 17）
- 待答：0 題 ｜ 掛起：0 ｜ 已解決：14（features 12、data 2）
- 本輪套用慣例：0 項（policy-defaults.md 尚無條目）

## 建議提問順序（依定位分組，High 組優先）

1. 【狀態轉移防禦】已全部解決（4 題，歸檔於 resolved/features/）
2. 【付款與取消】已全部解決（3 題，歸檔於 resolved/features/）
3. 【退款】已全部解決（4 題，歸檔於 resolved/features/；晉升 POLICY-001、POLICY-002）
4. 【失敗原因】已解決（1 題，歸檔於 resolved/features/；晉升 POLICY-003）
5. 【資料輸入驗證】已解決（2 題，歸檔於 resolved/data/；X-ORDER_STATE_MACHINE-001 進 exclusions）

## 釐清結果
- 佇列清空（spec-02）。矩陣 18 條 Rule，超過小模組精簡確認門檻（<4 條），需走 spec flow-align。
- 晉升慣例：POLICY-001、POLICY-002、POLICY-003。
