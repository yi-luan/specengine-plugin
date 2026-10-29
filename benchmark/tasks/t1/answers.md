# 標準答案表（T1 會員點數折抵）— 回答者只准依此表回答

| 洞 | 類型 | 問題 | 標準答案 |
| :-- | :-- | :-- | :-- |
| H1 | 必問 | 點數不足（pointsToUse > pointsBalance）時怎麼辦？ | 整筆拒絕，不自動折到餘額用完。reason 固定為 `INSUFFICIENT_POINTS` |
| H2 | 必問 | 折抵超過訂單金額 30% 時怎麼辦？ | 整筆拒絕，不自動截斷到上限。reason 固定為 `EXCEEDS_LIMIT` |
| H3 | 必問 | 30% 上限算出小數（例如訂單 101 元 → 30.3）時上限取多少？ | 無條件捨去取整數，上限 30 點 |
| H4 | 必問 | pointsToUse = 0 算成功還是失敗？ | 成功。finalAmount = orderAmount，remainingPoints = pointsBalance |
| H5 | 必問 | pointsToUse 是負數或非整數時？ | 拒絕，reason 固定為 `INVALID_POINTS` |
| H6 | 必問 | orderAmount 為 0 或負數、或 pointsBalance 為負數時？ | 拒絕，reason 固定為 `INVALID_INPUT` |
| H7 | 必問 | 多個錯誤同時發生時，回報哪一個？ | 檢查順序固定：INVALID_INPUT → INVALID_POINTS → INSUFFICIENT_POINTS → EXCEEDS_LIMIT，回報第一個命中的 |
| H8 | 陷阱 | （需求有寫）折抵點數必須是整數 | 需求第 1 句已寫，不該再問；10.5 點要拒絕（同 H5） |
| H9 | 陷阱 | （需求有寫）上限剛好等於 30% 可不可以？ | 「不得超過」= 等於可以。訂單 1000 折 300 成功 |

回答規則：
- 問到表上的洞，照標準答案回答，不加油添醋。
- 問到表上沒有的問題，一律回答「你決定，照你的最佳判斷」並記錄該題。
- 不主動提示、不糾正、不要求補測試。
