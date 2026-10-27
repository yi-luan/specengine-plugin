# 模組釐清總覽：POINTS_REDEMPTION（點數折抵）

- 來源需求：`inbox/需求.md`
- 建立版本：SpecEngine 2.0.0
- 矩陣：`.specengine/sdd/matrix/POINTS_REDEMPTION.json`（11 條 Rules）
- Schema：`.specengine/spec/erm.dbml`（members、orders 共 2 個 Tables）
- 狀態（快取）：IMPLEMENTED（spec-05 完成：21/21 Scenario 綠（in-process），verify PASS，lock 於 locks/POINTS_REDEMPTION.lock.json）

## 問題統計

| 優先級 | 待答 | 已解決 | 掛起 |
|---|---|---|---|
| High | 0 | 6 | 0 |
| Medium | 0 | 5 | 0 |
| Low | 0 | 0 | 0 |
| 合計 | 0 | 11 | 0 |


## 已解決（歸檔於 resolved/）

- `resolved/features/點數折抵_超過上限時的系統反應.md` → A（R-001／R-002；POLICY-001）
- `resolved/features/點數折抵_重複折抵同一訂單.md` → B（R-000、R-006；POLICY-002）
- `resolved/features/點數折抵_扣點與減價的原子性.md` → A（R-000、R-007；POLICY-003）
- `resolved/features/點數折抵_折抵零點.md` → A（R-008；POLICY-004）
- `resolved/features/點數折抵_未結帳離開時的點數處置.md` → B（R-009）
- `resolved/features/點數折抵_非預期狀態下取消.md` → A（R-005、R-010；POLICY-005）
- `resolved/features/點數折抵_部分取消.md` → C（R-004）
- `resolved/data/Order_金額與點數的數值型別.md` → A（erm.dbml 型別；POLICY-006）
- `resolved/data/PointTransaction_是否保留折抵歷史.md` → B（不新增 Table；POLICY-007）
- `resolved/features/點數折抵_重複折抵時剛好等於上限.md` → A（R-003 擴充、R-006；來源 flow-align 缺口）
- `resolved/features/點數折抵_R006拒絕範例列與R002優先序矛盾.md` → A（.feature R-006 Outline 修正；來源 spec-05 瑕疵）

## 本輪自動套用的慣例

spec-01 執行時 `policy-defaults.md` 不存在，無套用。spec-02 新建 POLICY-001～007。

## 流程對齊

矩陣 11 條 Rules，超過小模組精簡確認門檻（< 4 條且無分支），需走 `spec flow-align`。

第 1 次 flow-align（2026-10-18）：使用者確認三張圖（折抵驗證與成交／重複折抵以新換舊／取消折抵）與白話複述無不一致，但指出 1 個缺口（重複折抵時剛好等於上限），已包成 MCQ 退回 CLARIFYING。該題已於第 2 次 spec-02 解決（A），需重新執行 `spec flow-align`。

使用者於本次確認中裁示的「已知取捨」（下次 flow-align 落盤時沿用）：
- 「送出訂單」與送出後折抵定案屬訂單模組，不在本模組範圍，不開 MCQ。
- 餘額為 0 或訂單金額為 0 時的折抵已由 R-001／R-002 覆蓋，不另畫分支。
- 會員離開／逾時不自動退點（R-009）。
- 不提供部分取消（R-004）。
- 不留點數異動流水表（POLICY-007）。

## 探測清單

使用 plugin 內建 `references/devil-probes.md`（專案無 `.specengine/probes.md`）。
