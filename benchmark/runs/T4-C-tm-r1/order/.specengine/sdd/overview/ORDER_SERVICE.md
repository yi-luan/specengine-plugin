# 模組釐清佇列總覽：ORDER_SERVICE（訂單服務）

- 建立時間：2026-11-01 02:55
- 最近更新：2026-11-01 03:01（spec-02 完成）
- SpecEngine 版本：2.1.0
- 需求來源：tasks/t4-team/requirement.md（團隊版，本模組只負責 `src/order.ts`）
- 矩陣：14 條 Rules（main_flow 1、edge_case 13）
- erm.dbml：3 個 Tables（orders、processed_events、emitted_events）
- terms.md：31 個術語、4 條固定文案（MSG-001～004）
- exclusions：4 條
- 套用慣例：0 項（spec-01 時 policy-defaults.md 為空）
- 晉升慣例：6 項（POLICY-001～006，由本模組 spec-02 決策晉升）

## 待答統計

| 分類 | 待答 | High | Medium | Low |
| :--- | ---: | ---: | ---: | ---: |
| features/（流程行為） | 0 | 0 | 0 | 0 |
| data/（資料模型） | 0 | 0 | 0 | 0 |
| 合計 | 0 | 0 | 0 | 0 |

## 建議提問順序

（佇列已清空）

## 已解決（13 題，2026-11-01 03:01）

| # | 問題檔 | 決策摘要 | 寫回 |
| :-- | :-- | :-- | :-- |
| 1 | resolved/features/訂單服務_已確認訂單可否取消.md | A：已確認可取消，cancelReason CUSTOMER | R-004 |
| 2 | resolved/features/訂單服務_已結束訂單的取消.md | 自訂：拒絕，reason NOT_CANCELLABLE | R-009、MSG-001、POLICY-006 |
| 3 | resolved/features/訂單服務_重複取消.md | 自訂：拒絕，reason NOT_CANCELLABLE | R-009、MSG-001、POLICY-003 |
| 4 | resolved/features/訂單服務_取消不存在的訂單.md | 自訂：reason ORDER_NOT_FOUND | R-010、MSG-002 |
| 5 | resolved/features/訂單服務_逾時15分鐘的邊界.md | A：now − 下單時間 ≥ 15 分鐘即逾時 | R-005、POLICY-001 |
| 6 | resolved/features/訂單服務_逾時適用的訂單狀態.md | A：只有處理中會被逾時取消 | R-005 |
| 7 | resolved/features/訂單服務_逾時後才取消的原因.md | A：以實際動作為準，CUSTOMER | R-004 |
| 8 | resolved/features/訂單服務_最終狀態後再收到狀態事件.md | A：終態不可逆，忽略 | R-008、POLICY-002 |
| 9 | resolved/features/訂單服務_未知訂單的狀態事件.md | 使用者授權執行者裁量 → A：忽略 | R-013 |
| 10 | resolved/features/訂單服務_重複訂單編號下單.md | 自訂：拒絕，reason DUPLICATE_ORDER | R-011、MSG-003、POLICY-004 |
| 11 | resolved/features/訂單服務_數量不合法的下單.md | 自訂：非正整數拒絕，reason INVALID_INPUT | R-000、R-012、MSG-004、POLICY-005 |
| 12 | resolved/features/訂單服務_金額不合法的下單.md | 自訂：非正整數拒絕，reason INVALID_INPUT | R-000、R-012、MSG-004、POLICY-005 |
| 13 | resolved/features/訂單服務_識別字空字串的下單.md | 自訂：空字串拒絕，reason INVALID_INPUT | R-000、R-012、MSG-004 |

## 掛起

（無）

## 流程對齊

矩陣 14 條 Rule，超過小模組精簡確認門檻（< 4 條），需走 `spec flow-align`。
