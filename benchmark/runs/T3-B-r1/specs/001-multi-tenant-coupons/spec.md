# Feature Specification: 多租戶優惠券套用

**Feature Branch**: `001-multi-tenant-coupons`

**Created**: 2026-10-20

**Status**: Draft

## Clarifications

### Session 2026-10-20

- Q: 現在時間剛好等於 `validFrom` 或 `validTo` 的那一刻，優惠券算不算在有效期間內？ → A: 兩端都算有效（含頭含尾），以時間戳比較 validFrom ≤ now ≤ validTo。
- Q: 折扣總額超過訂單金額時，應截斷為 0 還是整筆拒絕？ → A: 整筆拒絕，原因 `DISCOUNT_EXCEEDS_AMOUNT`；總折扣剛好等於訂單金額可以，finalAmount = 0。
- Q: 傳入清單中同一張券（同租戶同代碼）出現兩次時如何處理？ → A: 整筆拒絕，原因 `DUPLICATE_COUPON`。
- Q: 訂單金額為 0、負數或非整數時如何處理？ → A: 一律拒絕，原因 `INVALID_INPUT`。
- Q: 多種錯誤同時命中時的檢查順序與回報？ → A: `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`，回報第一個命中的。

**Input**: User description: "多租戶優惠券：系統服務多個租戶，每個租戶有自己的優惠券，優惠券只能用在同一租戶的訂單。優惠券有 PERCENT 與 FIXED 兩種；有有效期間；可標記可疊加，不可疊加者一張訂單只能用一張；可疊加者可多張同時使用；固定金額折扣不得使訂單金額低於 0；可設最低消費金額；結帳時回傳折扣後金額、折扣總額與實際套用的優惠券代碼；套用失敗時回傳失敗原因；百分比折扣一律以折扣前的訂單金額計算；同一租戶內優惠券代碼唯一；所有金額以整數元計算。固定技術介面：`src/coupon.ts` 匯出 `Coupon`、`ApplyInput`、`ApplyResult`、`applyCoupons`。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 單張優惠券結帳折扣 (Priority: P1)

顧客在某租戶的商店結帳時出示一張該租戶的優惠券（百分比或固定金額），系統計算折扣後金額、折扣總額，並回傳實際套用的優惠券代碼。

**Why this priority**: 這是優惠券功能的核心價值；沒有單張折扣計算，其他規則都沒有意義。

**Independent Test**: 以一筆訂單金額加上一張有效優惠券呼叫結帳，驗證折扣後金額、折扣總額與套用代碼正確。

**Acceptance Scenarios**:

1. **Given** 租戶 T1 的訂單金額 1000 元，**When** 套用 T1 的 PERCENT 10% 優惠券 `P10`，**Then** 回傳成功、折扣後金額 900、折扣總額 100、套用代碼 `[P10]`。
2. **Given** 租戶 T1 的訂單金額 1000 元，**When** 套用 T1 的 FIXED 150 元優惠券 `F150`，**Then** 回傳成功、折扣後金額 850、折扣總額 150、套用代碼 `[F150]`。
3. **Given** 租戶 T1 的訂單金額 1000 元，**When** 不帶任何優惠券結帳，**Then** 回傳成功、折扣後金額 1000、折扣總額 0、套用代碼為空清單。

---

### User Story 2 - 無效優惠券被拒絕並說明原因 (Priority: P1)

顧客出示的優惠券若不屬於本租戶、不在有效期間內、或訂單金額未達最低消費，系統拒絕套用並回傳明確的失敗原因。

**Why this priority**: 錯誤套用會造成租戶直接的金錢損失（跨租戶盜用、過期券），是與 P1 同等重要的防護。

**Independent Test**: 分別以跨租戶、過期、未生效、未達最低消費的優惠券結帳，驗證各自回傳失敗與對應原因。

**Acceptance Scenarios**:

1. **Given** 租戶 T1 的訂單，**When** 套用租戶 T2 的優惠券，**Then** 回傳失敗，原因指出優惠券不屬於本租戶。
2. **Given** 現在時間晚於優惠券的 `validTo`，**When** 套用該優惠券，**Then** 回傳失敗，原因指出優惠券已過期／不在有效期間。
3. **Given** 現在時間早於優惠券的 `validFrom`，**When** 套用該優惠券，**Then** 回傳失敗，原因指出優惠券尚未生效／不在有效期間。
4. **Given** 優惠券最低消費 500 元，訂單金額 499 元，**When** 套用該優惠券，**Then** 回傳失敗，原因指出未達最低消費。
5. **Given** 優惠券最低消費 500 元，訂單金額 500 元，**When** 套用該優惠券，**Then** 回傳成功（達到門檻即可使用）。

---

### User Story 3 - 多張優惠券疊加 (Priority: P2)

顧客同時出示多張可疊加優惠券，系統將全部套用並合計折扣；若出示多張不可疊加優惠券，系統拒絕並說明原因。

**Why this priority**: 疊加是進階用法，建立在單張折扣與驗證規則之上。

**Independent Test**: 以兩張可疊加券、兩張不可疊加券、以及混合組合分別結帳，驗證結果。

**Acceptance Scenarios**:

1. **Given** 訂單金額 1000 元，**When** 套用兩張可疊加券 PERCENT 10% 與 FIXED 50，**Then** 回傳成功、折扣總額 150、折扣後金額 850、套用代碼依傳入順序列出兩張。
2. **Given** 訂單金額 1000 元，**When** 套用兩張可疊加 PERCENT 10% 與 PERCENT 20%，**Then** 兩張都以 1000 元為基礎計算，折扣總額 300、折扣後金額 700。
3. **Given** 訂單金額 1000 元，**When** 套用兩張不可疊加券，**Then** 回傳失敗，原因指出不可疊加券一張訂單只能使用一張。
4. **Given** 訂單金額 1000 元，**When** 套用一張不可疊加券與一張可疊加券，**Then** 回傳失敗，原因 `NOT_STACKABLE`（不可疊加券只能單獨使用，不得與任何其他券並用）。
5. **Given** 訂單金額 1000 元，**When** 只套用一張不可疊加券，**Then** 回傳成功並套用該券。

---

### User Story 4 - 折扣不得使金額低於零 (Priority: P2)

固定金額折扣（單張或合計）超過訂單金額時，系統不得讓折扣後金額變成負數。

**Why this priority**: 金額為負會造成帳務錯誤，但屬於邊界防護。

**Independent Test**: 以 FIXED 金額大於訂單金額的優惠券結帳，驗證結果不為負。

**Acceptance Scenarios**:

1. **Given** 訂單金額 100 元，**When** 套用 FIXED 150 元優惠券，**Then** 回傳失敗，原因 `DISCOUNT_EXCEEDS_AMOUNT`。
2. **Given** 訂單金額 100 元，**When** 套用 FIXED 100 元優惠券，**Then** 回傳成功，折扣後金額 0、折扣總額 100。
3. **Given** 訂單金額 100 元，**When** 套用兩張可疊加券 PERCENT 60% 與 PERCENT 50%，**Then** 回傳失敗，原因 `DISCOUNT_EXCEEDS_AMOUNT`（合計 110 > 100）。

---

### Edge Cases

- 多張優惠券中有一張無效（跨租戶、過期、未達最低消費）時：整筆結帳整體失敗（all-or-nothing），回傳該張的失敗原因；原因代碼固定為 `TENANT_MISMATCH`（跨租戶）、`COUPON_EXPIRED`（過期或尚未生效，同一代碼）、`MIN_ORDER_NOT_MET`（未達最低消費）。
- 百分比折扣計算結果有小數時（例如 15% × 333 = 49.95）：每張 PERCENT 的折扣額各自無條件捨去取整數（49）。
- 現在時間剛好等於 `validFrom` 或 `validTo` 時：視為有效（含頭含尾，validFrom ≤ now ≤ validTo）。
- 多張 PERCENT 可疊加券合計超過 100%，或 PERCENT 與 FIXED 合計超過訂單金額時：整筆拒絕，原因 `DISCOUNT_EXCEEDS_AMOUNT`；合計剛好等於訂單金額則成功、折扣後金額 0。
- 傳入的優惠券清單含同一張券（同租戶同代碼）重複多次時：整筆拒絕，原因 `DUPLICATE_COUPON`。
- 訂單金額為 0、負數或非整數時：整筆拒絕，原因 `INVALID_INPUT`。
- 最低消費門檻以原始（折扣前）訂單金額判斷（假設，與 FR-010 以折扣前金額為基礎一致）。
- 券本身的值不合法（PERCENT 不在 0–100、FIXED 為負、非整數、`validFrom` 晚於 `validTo`）時：整筆拒絕，原因 `INVALID_COUPON`（判定條件為假設）。
- 多種錯誤同時命中時依固定順序檢查並回報第一個命中者：`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 只允許優惠券套用在同一租戶的訂單；任一張租戶不符時整筆 MUST 拒絕，原因 `TENANT_MISMATCH`。
- **FR-002**: 系統 MUST 支援兩種優惠券類型：百分比折扣（PERCENT，`value` 為折扣百分比）與固定金額折扣（FIXED，`value` 為折扣元數）。
- **FR-003**: 系統 MUST 只在優惠券有效期間（`validFrom` ≤ now ≤ `validTo`，含頭含尾，以時間戳比較）內允許使用；任一張過期或尚未生效時整筆 MUST 拒絕，原因 `COUPON_EXPIRED`（未生效亦用同一代碼）。
- **FR-004**: 系統 MUST 支援「可疊加」標記；不可疊加的優惠券 MUST 單獨使用——同一訂單中若不可疊加券與任何其他券（不論可否疊加）並存，整筆 MUST 拒絕，原因 `NOT_STACKABLE`。單獨一張不可疊加券可正常使用。
- **FR-005**: 系統 MUST 允許多張可疊加優惠券同時套用於同一訂單。
- **FR-006**: 系統 MUST 確保折扣後訂單金額不低於 0：折扣總額超過訂單金額時整筆 MUST 拒絕，原因 `DISCOUNT_EXCEEDS_AMOUNT`；折扣總額剛好等於訂單金額時成功，折扣後金額為 0。
- **FR-007**: 系統 MUST 支援優惠券的最低消費金額，以原始（折扣前）訂單金額判定；任一張未達者整筆 MUST 拒絕，原因 `MIN_ORDER_NOT_MET`；未設定表示無限制；恰好等於門檻視為達標。
- **FR-008**: 成功時系統 MUST 回傳折扣後金額、折扣總額、以及實際套用的優惠券代碼清單（依傳入順序）。
- **FR-009**: 失敗時系統 MUST 回傳固定的失敗原因代碼字串；套用採 all-or-nothing：任一張券無效則整筆失敗，不略過該券。
- **FR-010**: 百分比折扣 MUST 一律以折扣前（原始）訂單金額計算，不受其他券影響；每張 PERCENT 的折扣額各自無條件捨去取整數。
- **FR-011**: 同一租戶內優惠券代碼 MUST 唯一；傳入清單中同一張券（同租戶同代碼）出現兩次以上時整筆 MUST 拒絕，原因 `DUPLICATE_COUPON`。
- **FR-012**: 所有金額 MUST 以整數元計算與回傳；訂單金額為 0、負數或非整數時整筆 MUST 拒絕，原因 `INVALID_INPUT`。
- **FR-015**: 多種錯誤同時命中時，系統 MUST 依固定順序檢查並回報第一個命中的原因：`INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`。
- **FR-016**: 券本身的值不合法時整筆 MUST 拒絕，原因 `INVALID_COUPON`（判定條件見 Assumptions）。
- **FR-013**: 結帳計算 MUST 為純函式：不存取資料庫、不讀取系統時鐘，「現在時間」由呼叫端傳入。
- **FR-014**: 公開介面 MUST 與需求固定的技術介面完全一致（`src/coupon.ts` 匯出 `Coupon`、`ApplyInput`、`ApplyResult`、`applyCoupons`，名稱不可更動）。

### Key Entities *(include if feature involves data)*

- **Coupon（優惠券）**: 屬於某一租戶；具唯一代碼（租戶內唯一）、類型（PERCENT/FIXED）、折扣值、有效期間起迄、是否可疊加、選填的最低消費金額。
- **ApplyInput（結帳請求）**: 租戶、原始訂單金額（整數元）、欲套用的優惠券清單（有序）、現在時間。
- **ApplyResult（結帳結果）**: 成功時含折扣後金額、折扣總額、實際套用代碼清單；失敗時含失敗原因。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% 的跨租戶、過期、未生效、未達最低消費的優惠券套用請求被拒絕並附原因。
- **SC-002**: 100% 的成功結帳結果滿足「折扣後金額 = 原始金額 − 折扣總額」且折扣後金額 ≥ 0，所有數值為整數。
- **SC-003**: 多張百分比券同時套用時，每張折扣額均等於以原始金額計算的結果（不因順序而異）。
- **SC-004**: 同一輸入重複計算 100% 得到相同結果（確定性）。
- **SC-005**: 需求列出的 12 條業務規則每一條至少有一個可執行的驗收情境覆蓋。

## Assumptions

- 優惠券資料的持久化、建立與管理不在本功能範圍；本功能只負責結帳時的套用計算。
- 「租戶內代碼唯一」由資料來源保證；本功能只在同一次輸入內檢查重複（FR-011）。
- 時間以 ISO 8601 字串傳入，以 UTC 瞬間（時間戳）比較；時區由呼叫端在字串中表達。
- `INVALID_COUPON` 的判定條件（需求方未定義，執行者假設）：PERCENT 的 `value` 不在 0–100 範圍、FIXED 的 `value` 為負、`value` 非整數、`minOrderAmount` 設定時為負或非整數、`validFrom`/`validTo` 無法解析或 `validFrom` 晚於 `validTo`。
- 最低消費門檻以原始（折扣前）訂單金額判定（執行者假設）。
- 失敗原因為固定代碼字串（見 FR-015 列出的八個代碼），不附加其他文字。
- 多張可疊加券的折扣總額 = 各 PERCENT 以原始金額計算並各自捨去後的加總 + 各 FIXED 金額加總（由 FR-010 推導）。
