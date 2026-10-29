# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 會員 | 持有點數並結帳的人 | member | POINTS_REDEMPTION |
| 點數餘額 | 會員目前可用的點數，整數點 | PointsDiscountInput.pointsBalance ／ member.points_balance | POINTS_REDEMPTION |
| 折抵點數 | 這次結帳想用來折抵現金的點數，必須是整數 | PointsDiscountInput.pointsToUse ／ order.points_used | POINTS_REDEMPTION |
| 訂單金額 | 這筆訂單的原始金額，整數元 | PointsDiscountInput.orderAmount ／ order.order_amount | POINTS_REDEMPTION |
| 折抵金額 | 折抵點數換成的現金，1 點折抵 1 元 | （= pointsToUse 元） | POINTS_REDEMPTION |
| 折抵上限 | 單筆訂單可折抵的最大點數，為訂單金額 × 30% 無條件捨去取整（101 元 → 30 點） | floor(orderAmount × 0.3) | POINTS_REDEMPTION |
| 應付金額 | 折抵後會員實際要付的錢 | PointsDiscountResult.finalAmount ／ order.final_amount | POINTS_REDEMPTION |
| 剩餘點數 | 折抵成功後會員還剩的點數 | PointsDiscountResult.remainingPoints | POINTS_REDEMPTION |
| 失敗原因 | 折抵不成功時回傳的原因，固定英文代碼（見固定文案 MSG-001～004），多個錯誤同時發生時依固定檢查順序回報第一個命中的 | PointsDiscountResult.reason | POINTS_REDEMPTION |
| 點數折抵 | 會員結帳時用點數折抵現金的動作 | applyPointsDiscount（src/points.ts） | POINTS_REDEMPTION |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INSUFFICIENT_POINTS | R-POINTS_REDEMPTION-003 點數不足拒絕時的 reason | resolved/features/點數折抵_點數不足時的系統反應.md |
| MSG-002 | EXCEEDS_LIMIT | R-POINTS_REDEMPTION-004 超過 30% 上限拒絕時的 reason | resolved/features/點數折抵_超過30%上限時的系統反應.md |
| MSG-003 | INVALID_POINTS | R-POINTS_REDEMPTION-002 非整數、R-POINTS_REDEMPTION-005 負數折抵點數拒絕時的 reason | resolved/features/點數折抵_折抵點數為負數時.md、resolved/data/點數折抵_非整數點數被拒絕時的失敗原因文案.md |
| MSG-004 | INVALID_INPUT | R-POINTS_REDEMPTION-007 訂單金額 ≤ 0 或點數餘額 < 0 拒絕時的 reason | resolved/features/點數折抵_訂單金額或餘額非法時.md |
