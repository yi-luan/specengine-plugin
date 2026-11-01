# EVENT_DRIVEN_ORDER 模組釐清總覽

- 來源：需求文件 `tasks/t4/requirement.md`（事件驅動下單流程：訂單、庫存、付款三個服務）
- 建立版本：spec_engine_version 2.1.0
- 建立時間：2026-11-01 02:40

## 矩陣規則

- 已寫入 `.specengine/sdd/matrix/EVENT_DRIVEN_ORDER.json`：14 條（main_flow 1 條、edge_case 13 條）
- R-000 主幹：下單 → 庫存保留 → 扣款 → 已確認
- R-001 庫存不足；R-002 付款失敗並放回庫存；R-003 已確認訂單被顧客取消並退款；R-004 逾時自動取消（滿 15 分鐘，僅處理中）；R-005 重複送達不產生額外效果
- R-006 處理中訂單被取消；R-007 終態與不符狀態的事件忽略；R-008 非法輸入；R-009 重複 orderId；R-010 終態訂單取消；R-011 找不到訂單；R-012 付款服務的取消在途處理；R-013 StockReserved 先到的暫存

## 不做清單

- X-EVENT_DRIVEN_ORDER-001：不碰資料庫或網路（已寫入 `.specengine/spec/exclusions.md`）

## 待答問題

- 第一輪 10 題已全數裁示（2026-11-01 02:42），歸檔於 `.specengine/sdd/resolved/features/`
- 第 3 題（StockReserved 先到）需求方授權由 spec-02 判斷，已選暫存方案，流程對齊時請需求方覆核

## 套用的慣例

- 無（`policy-defaults.md` 尚不存在）

## 套用的慣例

- 無（`policy-defaults.md` 尚不存在）
