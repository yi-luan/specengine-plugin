# Feature Specification: 多租戶優惠券（Multi-Tenant Coupons）

**Feature Branch**: `001-multi-tenant-coupons`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "多租戶優惠券：系統服務多個租戶，每個租戶有自己的優惠券，只能用在同一租戶的訂單；PERCENT 與 FIXED 兩種折扣；有效期間；可疊加／不可疊加；FIXED 不得使金額低於 0；最低消費；結帳回傳折扣後金額、折扣總額與實際套用代碼；失敗回傳原因；百分比一律以折扣前金額計算；同租戶代碼唯一；金額為整數元。技術介面 `applyCoupons(input)` 固定不可更名，純函式。"

## Clarifications

### Session 2026-10-20

- Q: 一張券不符合條件時，整筆是全部失敗還是略過該券？ → A: 整筆拒絕（all-or-nothing）；跨租戶 `TENANT_MISMATCH`、過期或尚未生效 `COUPON_EXPIRED`、未達最低消費 `MIN_ORDER_NOT_MET`、違反疊加規則 `NOT_STACKABLE`。
- Q: 不可疊加券能否與可疊加券同時使用？ → A: 不行，不可疊加券只能單獨使用；違反時整筆拒絕，`NOT_STACKABLE`。
- Q: 百分比折扣出現小數時如何取整？ → A: 每張 PERCENT 券的折扣額各自無條件捨去取整數。
- Q: 有效期間起訖時間點本身是否有效？ → A: 含頭含尾，以時間戳比較 validFrom ≤ now ≤ validTo。
- Q: 同時違反多條規則時回傳哪個 reason？ → A: 依序 `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。追問：`DISCOUNT_EXCEEDS_AMOUNT` = 折扣總額超過訂單金額時整筆拒絕（剛好等於可以，finalAmount = 0）；`INVALID_INPUT` = orderAmount 為 0、負數或非整數（其他欄位由團隊判斷）；`INVALID_COUPON` = 券值不合法：PERCENT 不在 1～100、FIXED ≤ 0、非整數（其他欄位由團隊判斷）。
- Q: 同一請求重複傳入同一代碼怎麼處理？ → A: 整筆拒絕，`DUPLICATE_COUPON`。
- Q: 沒有傳任何優惠券時回什麼？ → A: 成功；finalAmount = orderAmount、discount = 0、applied = []。
- Q: 最低消費用哪個金額判斷？ → A: 折扣前訂單金額；等於可以；未達整筆拒絕，`MIN_ORDER_NOT_MET`。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 單張優惠券結帳 (Priority: P1)

結帳時，顧客在某租戶的訂單上使用一張該租戶的優惠券（百分比或固定金額），系統回傳折扣後金額、折扣總額，以及實際套用的優惠券代碼。

**Why this priority**: 這是優惠券功能的最小可用價值；沒有它其他規則都無意義。

**Independent Test**: 給定一筆訂單金額與一張有效、同租戶的優惠券，呼叫結帳套券，即可驗證金額計算正確。

**Acceptance Scenarios**:

1. **Given** 租戶 T1 訂單金額 1000 元、T1 的 PERCENT 10% 券 "P10"（期間內、無最低消費），**When** 結帳套用 "P10"，**Then** 成功，折扣 100、折扣後 900、套用代碼 ["P10"]。
2. **Given** 租戶 T1 訂單金額 1000 元、T1 的 FIXED 150 元券 "F150"，**When** 結帳套用 "F150"，**Then** 成功，折扣 150、折扣後 850、套用代碼 ["F150"]。
3. **Given** 訂單金額 100 元、FIXED 300 元券，**When** 結帳套用，**Then** 整筆失敗，原因 `DISCOUNT_EXCEEDS_AMOUNT`（不得使金額低於 0）。
4. **Given** 訂單金額 100 元、FIXED 100 元券，**When** 結帳套用，**Then** 成功，折扣 100、折扣後 0。
5. **Given** 未帶任何優惠券，**When** 結帳，**Then** 成功，折扣 0、折扣後等於原金額、套用代碼為空。
6. **Given** 訂單金額 333 元、PERCENT 15% 券，**When** 結帳套用，**Then** 成功，折扣 49（49.95 無條件捨去）、折扣後 284。
7. **Given** 訂單金額 0 元，**When** 結帳，**Then** 整筆失敗，原因 `INVALID_INPUT`。

---

### User Story 2 - 使用條件檢查與失敗原因 (Priority: P1)

系統拒絕不符合條件的優惠券：不同租戶、不在有效期間、未達最低消費，並回傳明確的失敗原因。

**Why this priority**: 租戶隔離與有效性是防止錯誤折扣（金錢損失）的核心保護。

**Independent Test**: 分別以跨租戶券、過期／未生效券、未達最低消費的訂單呼叫，驗證回傳失敗與原因。

**Acceptance Scenarios**:

1. **Given** 租戶 T1 的訂單、T2 的優惠券，**When** 結帳套用，**Then** 整筆失敗，原因 `TENANT_MISMATCH`。
2. **Given** 優惠券有效期間 2026-01-01 至 2026-01-31，**When** 於 2026-02-01 結帳，**Then** 整筆失敗，原因 `COUPON_EXPIRED`。
3. **Given** 優惠券有效期間自 2026-03-01 起，**When** 於 2026-02-15 結帳（尚未生效），**Then** 整筆失敗，原因 `COUPON_EXPIRED`。
4. **Given** 最低消費 500 元的券、訂單 499 元，**When** 結帳，**Then** 整筆失敗，原因 `MIN_ORDER_NOT_MET`。
5. **Given** 最低消費 500 元的券、訂單 500 元，**When** 結帳，**Then** 可以套用。
6. **Given** 一張合格券與一張跨租戶券，**When** 同時套用，**Then** 整筆失敗（all-or-nothing），原因 `TENANT_MISMATCH`，合格券也不套用。

---

### User Story 3 - 多張優惠券疊加 (Priority: P2)

顧客可在同一張訂單同時使用多張標記為「可疊加」的優惠券；不可疊加的券一張訂單只能用一張。

**Why this priority**: 疊加是進階促銷能力，建立在 Story 1、2 之上。

**Independent Test**: 以多張可疊加券、多張不可疊加券、混合組合呼叫，驗證套用結果與失敗原因。

**Acceptance Scenarios**:

1. **Given** 訂單 1000 元、可疊加 PERCENT 10% "S10" 與可疊加 FIXED 50 "S50"，**When** 同時套用，**Then** 成功，折扣 150（10% 以折扣前 1000 計算 = 100，加 50）、折扣後 850、套用代碼 ["S10","S50"]（依傳入順序）。
2. **Given** 訂單 1000 元、兩張可疊加 PERCENT 10% 與 20%，**When** 同時套用，**Then** 兩者都以 1000 計算，折扣 300、折扣後 700。
3. **Given** 兩張不可疊加券，**When** 同時套用，**Then** 整筆失敗，原因 `NOT_STACKABLE`。
4. **Given** 一張不可疊加券與一張可疊加券，**When** 同時套用，**Then** 整筆失敗，原因 `NOT_STACKABLE`（不可疊加券只能單獨使用）。
5. **Given** 只有一張不可疊加券，**When** 套用，**Then** 正常成功。

---

### Edge Cases

- 各券折扣加總超過折扣前訂單金額時，整筆拒絕 `DISCOUNT_EXCEEDS_AMOUNT`；剛好等於可以，finalAmount = 0。
- 訂單金額為 0、負數或非整數：`INVALID_INPUT`。
- 券值不合法（PERCENT 不在 1～100、FIXED ≤ 0、非整數）：`INVALID_COUPON`。
- 百分比折扣產生非整數金額（例如 333 元打 15% = 49.95）時，每張 PERCENT 券的折扣額各自無條件捨去取整數（49.95 → 49）。
- now 恰等於 validFrom 或 validTo 時仍有效（含頭含尾，以時間戳比較）。
- 同一請求中重複傳入同一代碼：整筆拒絕，`DUPLICATE_COUPON`。
- 未傳任何券：成功，折扣 0、金額不變、applied 為空。
- 訂單金額恰等於最低消費：可以套用。
- 同時違反多條規則：依 FR-016 的優先順序回報第一個命中的 reason。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 只允許優惠券套用在與其相同租戶的訂單上；不同租戶的券不得套用並須回傳原因。
- **FR-002**: 系統 MUST 支援兩種折扣類型：PERCENT（以百分比計算折扣）與 FIXED（固定金額折扣，單位元）。
- **FR-003**: 系統 MUST 僅在優惠券有效期間內允許使用，以結帳請求提供的「當下時間」的時間戳判斷 validFrom ≤ now ≤ validTo（含頭含尾）；過期或尚未生效皆回 `COUPON_EXPIRED`。
- **FR-004**: 系統 MUST 要求不可疊加的優惠券單獨使用：請求中若含不可疊加券且券數大於 1（不論其他券是否可疊加），整筆失敗，原因 `NOT_STACKABLE`。
- **FR-005**: 系統 MUST 允許多張可疊加的優惠券同時用於同一張訂單。
- **FR-006**: 系統 MUST 確保折扣後訂單金額不低於 0：各券折扣加總 > 折扣前訂單金額時整筆拒絕 `DISCOUNT_EXCEEDS_AMOUNT`；加總等於訂單金額時成功且 finalAmount = 0。
- **FR-007**: 系統 MUST 以折扣前訂單金額判斷最低消費：orderAmount ≥ minOrderAmount 才可使用（等於可以），未達時整筆拒絕 `MIN_ORDER_NOT_MET`；未設定最低消費者無限制。
- **FR-008**: 成功時系統 MUST 回傳折扣後金額、折扣總額，以及依傳入順序列出的實際套用優惠券代碼。
- **FR-009**: 套用失敗時系統 MUST 回傳失敗原因。
- **FR-010**: 百分比折扣 MUST 一律以折扣前的訂單金額計算，不受其他券影響。
- **FR-011**: 同一租戶內優惠券代碼 MUST 唯一。
- **FR-012**: 所有金額 MUST 以整數元表示與計算。
- **FR-013**: 系統 MUST 以既定的對外介面提供套券計算，為不存取任何外部資料儲存的純計算（相同輸入恆得相同輸出）。
- **FR-014**: 當請求中有任一張不符合條件的優惠券時，系統 MUST 整筆拒絕（all-or-nothing），不套用任何券，並回傳原因代碼：跨租戶 `TENANT_MISMATCH`；過期或尚未生效 `COUPON_EXPIRED`；未達最低消費 `MIN_ORDER_NOT_MET`；違反疊加規則 `NOT_STACKABLE`。
- **FR-015**: 每張 PERCENT 券的折扣額 MUST 各自無條件捨去取整數元。
- **FR-016**: 同時違反多條規則時，系統 MUST 依下列順序回報第一個命中的 reason：`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`。
- **FR-017**: 同一請求中重複出現相同優惠券代碼時，系統 MUST 整筆拒絕，reason `DUPLICATE_COUPON`。
- **FR-018**: 請求未帶任何優惠券時，系統 MUST 回傳成功：finalAmount = orderAmount、discount = 0、applied = []。
- **FR-019**: 系統 MUST 以 `INVALID_INPUT` 拒絕不合法的請求：orderAmount 為 0、負數或非整數；tenantId 非字串或空字串；now 無法解析為時間；coupons 不是陣列。
- **FR-020**: 系統 MUST 以 `INVALID_COUPON` 拒絕本身不合法的優惠券：PERCENT 的 value 不是 1～100 的整數；FIXED 的 value 不是正整數；type 不是 PERCENT/FIXED；tenantId 非字串；code 非字串或空字串；陣列元素不是物件；validFrom/validTo 無法解析或 validFrom > validTo；minOrderAmount 有設定但不是 ≥ 0 的整數；stackable 不是布林值。
- **FR-021**: FR-016 的優先順序以「類別」為單位套用於整個請求：先檢查所有券是否命中較前面的類別，全部通過才檢查下一個類別。

### Key Entities

- **Coupon（優惠券）**: 屬於單一租戶；屬性：租戶、代碼（租戶內唯一）、類型（PERCENT/FIXED）、數值、有效期間起迄、是否可疊加、最低消費（選填）。
- **Apply Request（套券請求）**: 租戶、折扣前訂單金額（整數元）、欲套用的優惠券清單（有序）、當下時間。
- **Apply Result（套券結果）**: 成功時含折扣後金額、折扣總額、實際套用代碼清單；失敗時含失敗原因。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% 的驗收情境（含所有邊界情境）在自動化驗收測試中通過。
- **SC-002**: 跨租戶套券在任何測試案例中成功率為 0%。
- **SC-003**: 任何輸入下折扣後金額皆 ≥ 0 且為整數元，折扣總額 = 折扣前金額 − 折扣後金額。
- **SC-004**: 每一個失敗結果都附帶可辨識的失敗原因（0 筆無原因失敗）。

## Assumptions

- 呼叫端（結帳流程）負責提供當下時間；本功能不自行讀取系統時鐘。
- 優惠券資料由呼叫端隨請求傳入；本功能不負責優惠券的建立、儲存或查詢。
- 「同租戶代碼唯一」由優惠券管理端保證；本功能在同一請求中收到重複代碼時回 `DUPLICATE_COUPON`。
- FR-019/FR-020 中需求方未指定的欄位（tenantId、now、coupons 型別、時間、minOrderAmount、code、stackable、type）由開發團隊依最佳判斷定義。
- 「重複代碼」以代碼字串完全相同判斷（區分大小寫）。
