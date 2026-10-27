# 領域術語對照表 (terms.md)

跨模組共用。所有 .feature、流程圖、矩陣與測試程式碼中的領域名詞以本表為準，嚴禁同義異詞混用。

## 名詞

| 領域中文 | 技術欄位／識別字 | 說明 | 來源模組 |
|---|---|---|---|
| 會員 | members | 登入並進行結帳的使用者 | POINTS_REDEMPTION |
| 點數餘額 | members.points_balance | 會員目前可用點數（整數點）；1 點折 1 元 | POINTS_REDEMPTION |
| 訂單 | orders | 結帳中的訂單 | POINTS_REDEMPTION |
| 訂單金額 | orders.total_amount | 折抵前的原始金額（新台幣整數元） | POINTS_REDEMPTION |
| 應付金額 | orders.payable_amount | 訂單金額減去折抵點數後會員實際要付的金額 | POINTS_REDEMPTION |
| 折抵／折抵點數 | orders.redeemed_points | 用點數抵扣訂單金額的動作，以及該筆動作的點數數值 | POINTS_REDEMPTION |
| 生效中的折抵 | orders.redeemed_points > 0 | 訂單上尚未取消、尚未隨訂單送出結案的折抵 | POINTS_REDEMPTION |
| 取消折抵 | — | 會員在送出訂單前整筆撤回折抵，點數退回、應付金額恢復；不提供部分取消 | POINTS_REDEMPTION |

## 固定文案（錯誤訊息）

| 情境 | 文案 | 決策來源 |
|---|---|---|
| 折抵點數超過會員點數餘額（含同時超過訂單金額） | 折抵點數超過餘額 | resolved/features/點數折抵_超過上限時的系統反應.md |
| 折抵點數超過訂單金額（未超過餘額） | 折抵點數超過訂單金額 | resolved/features/點數折抵_超過上限時的系統反應.md |
| 折抵點數為 0 或空白 | 折抵點數必須大於 0 | resolved/features/點數折抵_折抵零點.md |
| 扣點或減價寫入失敗 | 折抵失敗 | resolved/features/點數折抵_扣點與減價的原子性.md |
| 訂單沒有生效中的折抵卻取消折抵 | 沒有可取消的折抵 | resolved/features/點數折抵_非預期狀態下取消.md |
| 訂單已送出後取消折抵 | 訂單已送出，無法取消折抵 | resolved/features/點數折抵_非預期狀態下取消.md |
