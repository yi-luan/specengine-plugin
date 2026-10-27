# 釐清問題
扣點與退點是否需要留下歷史紀錄（流水帳／Audit Log）？目前骨架 Schema 只有 members.points_balance 與 orders.redeemed_points 兩個「當前值」，取消折抵後看不出曾經折抵過。

# 定位
members.points_balance、orders.redeemed_points；潛在新實體 point_transactions（模組 POINTS_REDEMPTION）

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 需要：新增 point_transactions 流水表，每次扣點／退點各寫一筆，餘額可由流水重算 |
| B | 不需要：只維護當前餘額與訂單上的折抵點數，取消後不留痕 |
| C | 需要但只記在訂單上：orders 保留折抵／取消的時間戳記，不另建流水表 |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
erm.dbml 是否新增 Table；R-000／R-004 的 post_assertions 是否增加「寫入一筆紀錄」；spec-06 巡檢 Schema 的比對範圍。

# 優先級
Medium

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

---
# 最終決策
- **決策選項**：B — 不需要：只維護當前餘額與訂單上的折抵點數，取消後不留痕
- **更新檔案**：.specengine/spec/erm.dbml（檔頭決策註記，不新增 Table）／.specengine/spec/policy-defaults.md（POLICY-007）
- **時間戳**：2026-10-18 01:10
