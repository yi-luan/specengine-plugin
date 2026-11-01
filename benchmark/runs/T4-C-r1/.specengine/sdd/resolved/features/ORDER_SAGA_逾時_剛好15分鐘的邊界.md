# 釐清問題
需求說「下單後 15 分鐘內沒有完成付款的訂單，要自動取消」。tick(now) 時，now 距下單時間剛好 15 分鐘整（例如 12:00:00 下單、12:15:00 tick）算不算逾時？

# 定位
R-ORDER_SAGA-013（逾時自動取消），模組 ORDER_SAGA；orders.placed_at

# 多選題選項
| 選項 | 描述 (工程 Trade-off) |
|---|---|
| A | 算：now − 下單時間 >= 15 分鐘 即取消（12:15:00 取消） |
| B | 不算：now − 下單時間 > 15 分鐘 才取消（12:15:00 仍處理中，12:15:01 取消） |
| Short | 自訂簡答 (<=5 字) |

# 影響範圍
OrderService.tick 的比較運算子；Scenario Outline 邊界列。

# 優先級
High

# 可複用慣例候選 (Reusable Policy Candidate)
Yes

# 來源
spec-01

---
# 最終決策
- **決策選項**：A：算：now − 下單時間 >= 15 分鐘 即取消（12:15:00 取消）。
- **寫回位置**：矩陣 R-ORDER_SAGA-013 pre_conditions；policy-defaults POLICY-004
- **時間戳**：2026-11-01 02:44
