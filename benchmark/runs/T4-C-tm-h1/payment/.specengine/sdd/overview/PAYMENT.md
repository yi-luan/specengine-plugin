# PAYMENT 模組釐清佇列總覽

- 來源需求：`<bench>/tasks/t4-team/requirement.md`（付款服務，負責 src/payment.ts）
- 矩陣 Rules：6 條（R-PAYMENT-000 主流程、001 餘額不足、002 取消退款、003 先到的庫存保留暫存、004 重複事件忽略、005 未扣款訂單取消）
- 刻意不做（exclusions）：3 條（X-PAYMENT-001 ～ 003）
- 問題統計：待答 0 ｜ 掛起 0 ｜ 已解決 7
- 本輪套用的慣例：POLICY-001 ～ POLICY-004（見 `.specengine/spec/policy-defaults.md`）

## 已解決紀錄
1. 付款_庫存保留事件先於訂單事件抵達（Q1，執行者依需求方授權決定：A 暫存）→ R-PAYMENT-003
2. 付款_重複庫存保留事件（Q2，需求方：A 同 id 忽略）→ R-PAYMENT-004
3. 付款_顧客不在餘額名單中（Q3，需求方：A 視為 0）→ R-PAYMENT-001
4. 付款_重複取消事件（Q4，需求方：A 同 id 忽略）→ R-PAYMENT-002、R-PAYMENT-004
5. 付款_未扣款訂單被取消（Q5，需求方：A 不退不發）→ R-PAYMENT-005
6. 付款_餘額剛好等於訂單金額（Q6，需求方：A 視為足夠 >=）→ R-PAYMENT-000、001
7. 付款_事件識別碼產生方式（Q7，執行者依需求方授權決定：B `PAY-<orderId>-<事件類型>`）→ terms.md 命名規則

## 巡檢紀錄
（無）
