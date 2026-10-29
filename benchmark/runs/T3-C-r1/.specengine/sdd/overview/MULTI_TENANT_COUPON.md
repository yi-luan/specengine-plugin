# 模組釐清佇列總覽：MULTI_TENANT_COUPON（多租戶優惠券）

- 建立：2026-10-20 07:55（spec-01，plugin 2.0.0）
- 最後更新：2026-10-20 15:15（spec-02 佇列清空）
- 需求來源：bench/t3/requirement.md「需求：多租戶優惠券」
- 核心切片：結帳呼叫端呼叫 `applyCoupons` 純函式，對同一租戶的訂單套用一張或多張優惠券，回傳折扣後金額、折扣總額與實際套用的代碼；失敗時回傳失敗原因。
- 主幹 Flow：R-MULTI_TENANT_COUPON-000（單張 FIXED 券成功套用）

## 問題統計
- 待答 0 ｜ 掛起 0 ｜ 已解決 15（resolved/features 13、resolved/data 2）
- 矩陣 19 條 Rules（R-000～R-018）

## 已解決清單
| 題 | 寫回 |
| :--- | :--- |
| Q01 租戶不符 | R-002、MSG-001 |
| Q02 期間外 | R-003、MSG-002 |
| Q03 有效期間邊界 | R-003、R-010、POLICY-002 |
| Q04 多張不可疊加 | R-004、MSG-003 |
| Q05 不可疊加混用 | R-011、MSG-003 |
| Q06 多張可疊加計算 | R-005 |
| Q07 百分比小數 | R-001、R-005、R-013、POLICY-004 |
| Q08 折扣超過訂單金額 | R-006、R-014、MSG-005、POLICY-005 |
| Q09 最低消費判定 | R-007、R-008、MSG-007、erm.dbml |
| Q10 沒傳任何券 | R-016 |
| Q11 重複傳入 | R-012、MSG-004、POLICY-003 |
| Q12 訂單金額合法範圍 | R-015、MSG-006、POLICY-006 |
| Q13 券值合法範圍 | R-017、MSG-008、erm.dbml |
| Q14 多錯誤回報順序 | R-018 |
| Q15 失敗原因格式（需求方：你決定） | terms.md、POLICY-001 |

## 本輪套用的慣例
- spec-01：無（policy-defaults.md 當時為空）
- spec-02 晉升：POLICY-001～006

## flow-align 第 1 次退回（2026-10-20 15:17）：狀態退回 CLARIFYING
- 待答 2 題（Medium 2，來源 spec-flow-align）：
  1. data/多租戶優惠券_Q16_時間欄位格式不合法.md
  2. data/多租戶優惠券_Q17_最低消費金額設定不合法.md

## spec-02 第 2 輪（2026-10-20 15:18）
- Q16 時間欄位不合法（需求方：你決定）→ R-015、R-017、MSG-006、MSG-008、erm.dbml
- Q17 最低消費金額不合法（需求方：你決定）→ R-017、MSG-008、erm.dbml
- 待答 0 ｜ 掛起 0 ｜ 已解決 17

## 下一步
- `spec flow-align`（第 2 次，沿用已確認的 5 張圖）。
