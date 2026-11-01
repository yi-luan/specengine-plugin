# 模組 PAYMENT（付款服務）釐清佇列總覽

- 建立時間：2026-11-01 02:54（spec-01，plugin 2.1.0）；最近更新：2026-11-01 02:59（spec-02）
- 需求來源：事件驅動下單流程（團隊版），付款服務切片；本專案只實作 `src/payment.ts`
- 矩陣：16 條 Rule（main_flow 1、edge_case 15）
- erm.dbml：4 個 Table（customer_balance、payment_order、processed_event、emitted_event）
- terms.md：17 個術語 ｜ exclusions：3 條 ｜ 套用慣例：0 項 ｜ 晉升慣例：2 項（POLICY-001、POLICY-002）

## 問題統計

| 優先級 | 待答 | 已解決 | 掛起 |
| :--- | ---: | ---: | ---: |
| High | 0 | 3 | 0 |
| Medium | 0 | 2 | 0 |
| Low | 0 | 1 | 0 |
| 合計 | 0 | 6 | 0 |

## 已解決（spec-02，2026-11-01 02:59）

| 題 | 決策 | 寫回 |
| :--- | :--- | :--- |
| F-001 亂序：StockReserved 先於 OrderPlaced | 使用者授權執行者決定 → A（先記住、OrderPlaced 到達時補做） | R-007、R-008 新增；POLICY-001 |
| F-002 已完成動作的重複事件 | A（依狀態靜默忽略）＋同 id 一律忽略、退款全額最多一次 | R-011、012、013、015 新增；R-003 修改；POLICY-002 |
| F-003 已取消後才收到 StockReserved | A（記住已取消，不扣款不發事件） | R-004 修改；R-009 新增 |
| F-004 付款失敗後再收到 StockReserved | 同 id 忽略；其餘使用者授權執行者決定 → A（不重試） | R-011、R-014 新增 |
| D-001 初始餘額表沒有的顧客 | A（視為 0；不夠就 PaymentFailed 一毛不扣；getBalance 回 0） | R-001、R-006 修改 |
| F-005 金額 0 或負數 | 使用者授權執行者決定 → B（0 成功、負數 PaymentFailed） | R-000、R-001 修改；R-010 新增 |

## 工程預設（非業務決策，spec-01 直接採用）

- 事件 id 以 `node:crypto` 的 `randomUUID()` 產生，加 `pay-` 前綴以利除錯；滿足「全系統唯一」。
- 「餘額足夠」解讀為餘額 >= 訂單金額（相等視為足夠）。

## 下一步

- 矩陣 16 條 Rule 超過小模組精簡確認門檻（< 4 條），需走 `spec flow-align`。
