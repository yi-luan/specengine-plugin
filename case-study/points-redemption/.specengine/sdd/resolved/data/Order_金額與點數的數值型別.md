# 釐清問題
「1 點折 1 元」。訂單金額是否可能帶小數（例如 299.5 元）？點數是否只能是整數？若訂單金額帶小數而點數為整數，折抵上限如何取整（floor／ceil／round）？

# 定位
orders.total_amount、orders.payable_amount、members.points_balance（模組 POINTS_REDEMPTION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 金額與點數皆為整數（新台幣整數元），不存在取整問題 |
| B | 金額可帶小數，點數為整數；折抵上限取 floor（無條件捨去） |
| C | 金額與點數皆可帶小數，1 點 = 1 元等比折抵 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
erm.dbml 三個欄位的型別（目前草稿暫為 integer）；邊界值 Scenario Outline 的範例資料；是否有精度損失測試。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

---
# 最終決策
- **決策選項**：A — 金額與點數皆為整數（新台幣整數元），不存在取整問題
- **更新檔案**：.specengine/spec/erm.dbml（members.points_balance、orders.total_amount／redeemed_points／payable_amount 型別與 note）／.specengine/spec/terms.md（單位）／.specengine/spec/policy-defaults.md（POLICY-006）
- **時間戳**：2026-10-18 01:10
