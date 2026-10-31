# Research: 多租戶優惠券

本檔記錄 Phase 0 的決策。spec 中已無 [NEEDS CLARIFICATION]，以下為實作層面的決定。

## 1. 百分比折扣的捨去規則

- **Decision**: 折扣金額 = `Math.floor(orderAmount * value / 100)`，結果為整數元，永遠向下取整。
- **Rationale**: 需求要求所有金額為整數元（FR-012），而百分比運算可能產生小數。向下取整不會多給顧客折扣，符合 constitution V 要求的「明確、可文件化的捨去規則」。
- **Alternatives considered**: 四捨五入（可能多給折扣，且半值行為需額外定義）；無條件進位（同樣多給折扣）。

## 2. 判定順序（決定回傳哪一個失敗代碼）

需求 FR-013 規定多券任一失敗即整筆拒絕，回傳「第一張失敗券」的原因。實作判定順序如下：

1. 整批檢查（與個別券無關）：
   1. `DUPLICATE_COUPON`：同一 `tenantId` + `code` 出現兩次（先出現者不算失敗，第二次出現時失敗）。
   2. `NOT_STACKABLE`：批次中含不可疊加券且總張數大於 1。
2. 個別券，依傳入順序逐張檢查，遇到第一個失敗即回傳：
   1. `INVALID_COUPON`：PERCENT 不在 1–100、FIXED ≤ 0、或 value 非整數。
   2. `TENANT_MISMATCH`：`coupon.tenantId !== input.tenantId`。
   3. `COUPON_EXPIRED`：`now` 不在 `[validFrom, validTo]` 之內（起迄皆包含）。
   4. `MIN_ORDER_NOT_MET`：有 `minOrderAmount` 且 `orderAmount < minOrderAmount`。

- **Rationale**: 整批性質的錯誤（重複、不可疊加）與券本身無關，應先於個別券檢查，結果較可預測。
- **Alternatives considered**: 全部依傳入順序混合檢查（可行，但同一請求的失敗代碼會因券的排序而改變，較難說明）。

## 3. `COUPON_NOT_FOUND` 的可達性

- **Decision**: `applyCoupons` 的輸入是已取得的 `Coupon` 物件陣列，函式本身無法得知「提交的代碼在租戶中不存在」。
  因此本函式不會回傳 `COUPON_NOT_FOUND`；該代碼保留給呼叫端在查詢券資料時使用。
  需求方於 Q6 確認此做法（「你決定，照你的最佳判斷，固定介面不可更改」）。
- **Rationale**: 需求檔的介面固定為 `ApplyInput.coupons: Coupon[]`，不接受代碼字串，函式不擁有查詢能力（constitution IV）。
- **Alternatives considered**: 改為接受代碼字串並自行查表（違反純函式原則且更動固定介面，不可行）。
- **Follow-up**: 需求方應確認此代碼的語意是否符合預期（見 BENCH-LOG 假設紀錄）。

## 4. 多張可疊加券的計算方式

- **Decision**: 每張券的折扣皆以折扣前訂單金額計算（FR-010）。折扣總額 = min(所有券折扣加總, orderAmount)，折扣後金額 = orderAmount − 折扣總額。
- **Rationale**: 讓計算與傳入順序無關（只有 `applied` 列表依傳入順序），並保證折扣後金額不低於 0（FR-006）。
- **Alternatives considered**: 依序逐張扣減（百分比會依順序改變結果，與 FR-010 衝突）。

## 5. 沒有提交任何券

- **Decision**: 回傳成功，`finalAmount = orderAmount`、`discount = 0`、`applied = []`。
- **Rationale**: 沒有套用券是合法情境，不是失敗；與 spec Edge Cases 的預設一致。

## 6. 非業務錯誤的處理

- **Decision**: `orderAmount` 非整數或為負、時間字串無法解析，視為呼叫端的程式錯誤，以拋出例外（`RangeError` / `TypeError`）處理，不使用 `{ ok: false }`。
- **Rationale**: 需求只定義業務失敗的代碼；這些情況沒有對應的固定代碼，也不屬於業務規則。constitution V 的「明確回傳」只適用於業務失敗。
- **Alternatives considered**: 新增額外的失敗代碼（超出需求檔定義的固定代碼範圍，不採用）。
