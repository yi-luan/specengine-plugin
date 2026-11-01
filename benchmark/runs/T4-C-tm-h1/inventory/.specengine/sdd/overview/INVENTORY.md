# INVENTORY 模組釐清總覽（庫存服務）

- 來源需求：`<bench>/tasks/t4-team/requirement.md`
- 範圍：只負責 `src/inventory.ts` 的庫存服務；訂單、付款、事件匯流排屬其他模組（見 exclusions X-INVENTORY-001 至 005）
- 矩陣：10 條 Rules（主幹 1 條，邊界 9 條）
- 套用慣例：無（`policy-defaults.md` 尚不存在）

## 問題統計

| 優先級 | 待答 | 已解決 |
| :--- | ---: | ---: |
| High | 0 | 4 |
| Medium | 0 | 3 |
| Low | 0 | 1 |
| 合計 | 0 | 8 |

## 待答題

無（佇列已清空）

## 備註

- 「數量為零或負數」一題為需求方授權代決，代決結果為 A。
- 「付款失敗先於下單抵達」一題為需求方授權代決，代決結果為 A。
