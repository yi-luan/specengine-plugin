# 領域術語

| 術語 | 白話說明 | 技術對應 | 首次出現模組 |
| :--- | :--- | :--- | :--- |
| 會員 | 使用點數結帳的人 | members | POINTS_REDEMPTION |
| 點數 | 會員累積、可用來折抵現金的單位，1 點折抵 1 元，一律整數 | int | POINTS_REDEMPTION |
| 點數餘額 | 會員目前可用的點數 | PointsDiscountInput.pointsBalance／members.points_balance | POINTS_REDEMPTION |
| 訂單金額 | 本筆訂單折抵前的金額（整數元） | PointsDiscountInput.orderAmount／orders.order_amount | POINTS_REDEMPTION |
| 折抵點數 | 會員這次結帳要用掉的點數（整數點） | PointsDiscountInput.pointsToUse／orders.points_used | POINTS_REDEMPTION |
| 折抵金額 | 折抵點數換算成的現金（1 點 = 1 元），與折抵點數數值相同 | pointsToUse | POINTS_REDEMPTION |
| 折抵上限 | 單筆訂單可折抵金額的上限：訂單金額的 30%，算出小數時無條件捨去取整數 | Math.floor(orderAmount × 0.3) | POINTS_REDEMPTION |
| 應付金額 | 折抵後會員實際要付的金額（整數元） | PointsDiscountResult.finalAmount／orders.final_amount | POINTS_REDEMPTION |
| 剩餘點數 | 折抵成功後會員剩下的點數 | PointsDiscountResult.remainingPoints | POINTS_REDEMPTION |
| 折抵成功／不成功 | 折抵結果是否被接受 | PointsDiscountResult.ok（true／false） | POINTS_REDEMPTION |
| 失敗原因 | 折抵不成功時回傳的原因字串 | PointsDiscountResult.reason | POINTS_REDEMPTION |
| 點數折抵函式 | 執行折抵計算的純函式，不碰資料庫 | src/points.ts applyPointsDiscount | POINTS_REDEMPTION |

# 固定文案

| ID | 文案 | 用途 | 來源決策 |
| :--- | :--- | :--- | :--- |
| MSG-001 | INSUFFICIENT_POINTS | R-POINTS_REDEMPTION-003 點數不足拒絕訊息（reason 逐字） | resolved/features/點數折抵_點數不足時的系統反應.md |
| MSG-002 | EXCEEDS_LIMIT | R-POINTS_REDEMPTION-002 超過折抵上限拒絕訊息（reason 逐字） | resolved/features/點數折抵_超過30趴上限時的系統反應與文案.md |
| MSG-003 | INVALID_POINTS | R-POINTS_REDEMPTION-001 折抵點數為負數或非整數的拒絕訊息（reason 逐字） | resolved/features/點數折抵_負數或非整數點數的處理與文案.md |
| MSG-004 | INVALID_INPUT | R-POINTS_REDEMPTION-004 訂單金額為 0 或負數、或點數餘額為負數的拒絕訊息（reason 逐字） | resolved/features/點數折抵_訂單金額或餘額非法值的處理.md |
