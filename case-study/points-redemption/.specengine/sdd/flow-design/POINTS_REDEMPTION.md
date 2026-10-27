# 流程對齊索引：POINTS_REDEMPTION（點數折抵）

- 確認時間：2026-10-18 01:45（第 2 次 flow-align；第 1 次於 2026-10-18 發現 1 個缺口，已經 spec-02 解決後重畫）
- Rule 總數：11（R-POINTS_REDEMPTION-000 ～ R-POINTS_REDEMPTION-010）
- 使用者確認：無缺口，圖與白話複述與設想一致

## 流程階段

| # | 流程階段 | 涵蓋 rule_id | 檔案 |
|---|---|---|---|
| 1 | 折抵驗證與成交 | 000、001、002、003、007、008 | [POINTS_REDEMPTION/折抵驗證與成交.md](POINTS_REDEMPTION/折抵驗證與成交.md) |
| 2 | 重複折抵以新換舊 | 006、003（沿用 001、002、008） | [POINTS_REDEMPTION/重複折抵以新換舊.md](POINTS_REDEMPTION/重複折抵以新換舊.md) |
| 3 | 取消折抵 | 004、005、010 | [POINTS_REDEMPTION/取消折抵.md](POINTS_REDEMPTION/取消折抵.md) |

R-POINTS_REDEMPTION-003 擴充後同時適用首次與重複折抵，因此列於第 1、2 兩個階段。R-POINTS_REDEMPTION-009 為 known_tradeoff 型 Rule，不畫為分支，列於第 3 階段的已知取捨。

## 已知取捨（彙總）

- 送出訂單與送出後折抵定案屬訂單模組，不在本模組範圍（使用者裁示）
- 餘額為 0 或訂單金額為 0 的折抵已由 001／002 覆蓋（使用者裁示）
- 會員離開／逾時不自動退點（R-POINTS_REDEMPTION-009）
- 不提供部分取消（R-POINTS_REDEMPTION-004）
- 不留點數異動流水表（POLICY-007）
