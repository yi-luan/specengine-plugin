# ORDER_SERVICE 釐清佇列總覽

- 來源：需求 `specengine-bench-work/tasks/t4-team/requirement.md`（訂單服務 src/order.ts）
- 建立：spec-01，2026-11-01 02:46
- 最近更新：spec-02 第二輪寫回，2026-11-01 02:48

## 問題統計
- 待答 0 題（第一輪 10 題已全部由需求方回答，Q10 為需求方授權代決）
- 已解決 10 題，掛起 0 題

## 已解決題目與寫回位置
- 輸入合法性（Q1 A）→ R-004、R-000 前提、dbml qty/amount
- 重複訂單編號（Q2 A）→ R-005
- 顧客取消可取消的狀態（Q3 B）→ R-006、R-007、R-008、MSG-003
- 不存在訂單的取消（Q4 A）→ R-009、MSG-004
- 逾時取消的臨界點（Q5 A）→ R-010、R-011
- 逾時取消適用的訂單狀態（Q6 C）→ R-010、R-012
- 取消後才收到付款成功（Q7 A）→ R-013
- 重複事件的處理（Q8 A）→ R-014
- 亂序事件的狀態覆寫（Q9 C）→ R-013、R-001～R-003 的 resolved_by
- 事件識別碼產生方式（Q10 代決 UUID v4）→ terms.md 事件識別碼、POLICY-008

## 本輪套用的慣例
- POLICY-001 至 POLICY-008（見 `.specengine/spec/policy-defaults.md`）

## 刻意不做（exclusions.md）
- X-ORDER_SERVICE-001、002（忽略不關心的事件）、X-ORDER_SERVICE-003（庫存與付款不屬訂單服務）
