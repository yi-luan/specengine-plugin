# Feature Specification: Multi-Tenant Coupons

**Feature Branch**: `001-multi-tenant-coupons`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "多租戶優惠券 — 系統服務多個租戶，每個租戶有自己的優惠券；優惠券分百分比折扣與固定金額折扣；有有效期間、可疊加旗標、最低消費；結帳時回傳折扣後金額、折扣總額與實際套用代碼，失敗時回傳原因；百分比一律以折扣前訂單金額計算；同租戶代碼唯一；金額以整數元計算。"

## Clarifications

### Session 2026-10-20

- Q: What should happen when the order amount itself is invalid (0, negative, or not a whole number)? → A: Reject with reason `INVALID_INPUT`.
- Q: What should happen when a coupon's own value is invalid (PERCENT outside 1–100, FIXED ≤ 0, or non-integer)? → A: Reject with reason `INVALID_COUPON`.
- Q: When several rules fail at once, which failure reason is reported? → A: Check in order `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` → `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`; report the first hit.
- Q: Should every failure reason be a fixed uppercase code, and what are the codes for minimum spend, stacking conflict, and duplicate coupon? → A: Yes, fixed codes: `MIN_ORDER_NOT_MET`, `NOT_STACKABLE` (both two non-stackables and non-stackable mixed with stackables), `DUPLICATE_COUPON` (same tenantId + code presented twice).
- Q: Is the minimum spend checked against the pre-discount order amount, and does equal qualify? → A: Pre-discount amount; equal qualifies; otherwise whole checkout rejected with `MIN_ORDER_NOT_MET`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apply a single valid coupon at checkout (Priority: P1)

A shopper of tenant A checks out an order and presents one coupon issued by tenant A. The
coupon is within its validity period and the order meets its minimum spend. The checkout
reports the discounted amount, the total discount, and the code that was applied.

**Why this priority**: This is the core value of the feature — a coupon reduces what the
shopper pays. Without it nothing else matters.

**Independent Test**: Can be fully tested by submitting one order with one coupon (percent or
fixed) and verifying the three returned figures.

**Acceptance Scenarios**:

1. **Given** tenant A has coupon `P10` (PERCENT 10) valid today with no minimum spend,
   **When** an order of 1000 from tenant A is checked out with `P10`,
   **Then** the result is success with final amount 900, discount 100, applied `[P10]`.
2. **Given** tenant A has coupon `F50` (FIXED 50) valid today,
   **When** an order of 300 from tenant A is checked out with `F50`,
   **Then** the result is success with final amount 250, discount 50, applied `[F50]`.
3. **Given** no coupons are presented,
   **When** an order of 300 is checked out,
   **Then** the result is success with final amount 300, discount 0, applied `[]`.
4. **Given** coupon `P15` (PERCENT 15), **When** an order of 333 presents `P15`,
   **Then** discount is 49 (49.95 rounded down), final 284.

---

### User Story 2 - Reject coupons that do not qualify (Priority: P1)

A shopper presents a coupon that cannot be used: it belongs to a different tenant, it is
outside its validity window, or the order is below the coupon's minimum spend. The checkout
refuses the application and tells the shopper why.

**Why this priority**: Incorrect acceptance of a coupon is a direct financial loss and a
cross-tenant data leak. Rejection rules must be in place before launch.

**Independent Test**: Submit an order with a single disqualified coupon and verify the failure
result and its reason.

**Acceptance Scenarios**:

1. **Given** coupon `X` belongs to tenant B, **When** an order from tenant A presents `X`,
   **Then** the result is failure with reason `TENANT_MISMATCH`.
2. **Given** coupon `Y` is valid from 2026-02-01 to 2026-02-28, **When** an order on
   2026-03-01 presents `Y`, **Then** the result is failure with reason `COUPON_EXPIRED`.
3. **Given** coupon `Y` is valid from 2026-02-01 to 2026-02-28, **When** an order on
   2026-01-31 presents `Y`, **Then** the result is failure with reason `COUPON_EXPIRED`
   (not-yet-valid uses the same reason).
4. **Given** coupon `Z` requires minimum spend 500, **When** an order of 499 presents `Z`,
   **Then** the result is failure with reason `MIN_ORDER_NOT_MET`.
5. **Given** coupon `Z` requires minimum spend 500, **When** an order of 500 presents `Z`,
   **Then** the coupon qualifies (minimum is inclusive).
6. **Given** coupon `Y` is valid from 2026-02-01T00:00:00Z to 2026-02-28T23:59:59Z, **When**
   an order at exactly 2026-02-01T00:00:00Z or exactly 2026-02-28T23:59:59Z presents `Y`,
   **Then** the coupon qualifies (both boundaries inclusive).

---

### User Story 3 - Combine stackable coupons (Priority: P2)

A shopper presents several coupons at once. Stackable coupons may be combined; a
non-stackable coupon may not share an order with another coupon. The checkout reports the
combined discount and lists every code it actually applied, in the order presented.

**Why this priority**: Stacking is a common promotion mechanic but is secondary to single-coupon
correctness.

**Independent Test**: Submit an order with two or more coupons of differing stackability and
verify which combinations succeed.

**Acceptance Scenarios**:

1. **Given** stackable coupons `S10` (PERCENT 10) and `S5` (PERCENT 5), **When** an order of
   1000 presents `[S10, S5]`, **Then** the result is success with discount 150 (each percent
   computed on 1000), final 850, applied `[S10, S5]`.
2. **Given** stackable `S10` (PERCENT 10) and stackable `SF30` (FIXED 30), **When** an order of
   1000 presents `[SF30, S10]`, **Then** discount is 130, final 870, applied `[SF30, S10]`.
3. **Given** non-stackable `N20` and non-stackable `N30`, **When** an order presents both,
   **Then** the result is failure with reason `NOT_STACKABLE`.
4. **Given** non-stackable `N20` and stackable `S10`, **When** an order presents both,
   **Then** the result is failure with reason `NOT_STACKABLE`.
5. **Given** non-stackable `N20` alone, **When** an order presents `[N20]`, **Then** the
   result is success with `N20` applied.
6. **Given** stackable `S10` (PERCENT 10) presented twice for the same tenant, **When** an
   order presents `[S10, S10]`, **Then** the result is failure with reason `DUPLICATE_COUPON`.

---

### User Story 4 - Protect the order total from going negative (Priority: P2)

A shopper presents fixed-amount coupons whose combined value exceeds the order amount. The
checkout must never report a final amount below zero.

**Why this priority**: A negative total is a financial defect; it must be guarded but it is a
boundary condition rather than the main flow.

**Independent Test**: Submit an order of 100 with a FIXED 150 coupon and verify the outcome.

**Acceptance Scenarios**:

1. **Given** FIXED coupon `F150` (value 150), **When** an order of 100 presents `F150`,
   **Then** the result is failure with reason `DISCOUNT_EXCEEDS_AMOUNT` (the whole checkout
   is rejected; the discount is never capped).
2. **Given** FIXED coupon `F100` (value 100), **When** an order of 100 presents `F100`,
   **Then** the result is success with final amount 0, discount 100.
3. **Given** stackable FIXED `F60` and stackable FIXED `F50`, **When** an order of 100 presents
   both, **Then** the result is failure with reason `DISCOUNT_EXCEEDS_AMOUNT`.

---

### User Story 5 - Reject invalid inputs (Priority: P3)

A caller supplies an order amount or a coupon record that is malformed. The checkout refuses
to compute and reports which input was invalid.

**Why this priority**: Defensive validation protects the money calculation but is not a
shopper-facing journey.

**Independent Test**: Submit an order amount of 0 / -1 / 10.5, or a coupon with PERCENT 0 /
PERCENT 101 / FIXED 0 / FIXED 10.5, and verify the failure reasons.

**Acceptance Scenarios**:

1. **Given** any coupons, **When** an order of 0, -1, or 10.5 is checked out, **Then** the
   result is failure with reason `INVALID_INPUT`.
2. **Given** a PERCENT coupon with value 0 or 101, or a FIXED coupon with value 0 or 10.5,
   **When** an order presents it, **Then** the result is failure with reason `INVALID_COUPON`.
3. **Given** an invalid order amount AND a coupon from another tenant, **When** checked out,
   **Then** the reason is `INVALID_INPUT` (first in the precedence order).

---

### Edge Cases

- Percentage discounts whose computed amount is not a whole number (e.g., 15% of 333 =
  49.95): each PERCENT coupon's discount is rounded down (floor) to a whole unit
  individually (49), before summing with other coupons.
- When several coupons are presented and one of them does not qualify (wrong tenant,
  expired/not yet valid): the whole checkout fails (all-or-nothing) with that coupon's
  reason code (`TENANT_MISMATCH`, `COUPON_EXPIRED`); no partial application.
- When several rules fail at once, the reason reported is the first in the precedence
  order `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` →
  `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`.
- Order amount exactly equal to the minimum spend: qualifies (inclusive).
- Order placed exactly at the validity start or end instant: treated as within the period
  (both boundaries inclusive; validFrom ≤ now ≤ validTo by timestamp comparison).
- The same coupon (same tenant + code) presented twice in one order: failure
  `DUPLICATE_COUPON`.
- Order amount of 0, negative, or non-integer: failure `INVALID_INPUT`.
- Coupon value invalid (PERCENT not in 1–100, FIXED ≤ 0, non-integer): failure
  `INVALID_COUPON`.
- Percent coupon of 100: discount equals the full order amount, final amount 0.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST only apply a coupon to an order of the same tenant; a coupon from
  another tenant MUST be rejected with reason `TENANT_MISMATCH`.
- **FR-002**: System MUST support two coupon types: a percentage discount and a fixed-amount
  discount.
- **FR-003**: System MUST compute a percentage discount on the original (pre-discount) order
  amount, regardless of other coupons applied.
- **FR-004**: System MUST reject a coupon with reason `COUPON_EXPIRED` when the checkout time
  is outside the coupon's validity period (start and end both inclusive); not-yet-valid uses
  the same reason.
- **FR-005**: System MUST reject with reason `MIN_ORDER_NOT_MET` when the pre-discount order
  amount is below the coupon's minimum spend (equal qualifies); a coupon with no minimum spend
  has no such restriction.
- **FR-006**: System MUST allow multiple stackable coupons on one order.
- **FR-007**: System MUST reject the application with reason `NOT_STACKABLE` when a
  non-stackable coupon is presented together with any other coupon (whether that other coupon
  is stackable or not).
- **FR-008**: System MUST reject the checkout with reason `DISCOUNT_EXCEEDS_AMOUNT` when the
  total discount exceeds the order amount; a total discount exactly equal to the order amount is
  accepted with final amount 0.
- **FR-009**: On success, System MUST return the discounted amount, the total discount, and the
  list of codes actually applied in the order they were presented.
- **FR-010**: On failure, System MUST return a reason: one of the fixed code strings
  `INVALID_INPUT`, `INVALID_COUPON`, `TENANT_MISMATCH`, `DUPLICATE_COUPON`, `COUPON_EXPIRED`,
  `MIN_ORDER_NOT_MET`, `NOT_STACKABLE`, `DISCOUNT_EXCEEDS_AMOUNT`.
- **FR-011**: All amounts MUST be whole currency units (integers).
- **FR-012**: Coupon codes MUST be unique within a tenant; presenting the same tenant + code
  twice in one checkout MUST be rejected with reason `DUPLICATE_COUPON`.
- **FR-013**: Checkout with no coupons MUST succeed with final amount equal to the order
  amount, discount 0, and an empty applied list.
- **FR-014**: Each percentage discount MUST be rounded down (floor) to a whole unit
  individually; total discount = sum of floored percent discounts + sum of fixed discounts.
- **FR-015**: Coupon application MUST be all-or-nothing: if any presented coupon fails a rule,
  the whole checkout fails with that coupon's reason and no coupon is applied.
- **FR-016**: System MUST reject with reason `INVALID_INPUT` when the order amount is 0,
  negative, or not a whole number.
- **FR-017**: System MUST reject with reason `INVALID_COUPON` when a coupon's value is invalid
  (PERCENT not within 1–100 inclusive, FIXED ≤ 0, or non-integer).
- **FR-018**: When several rules fail, System MUST report the first failing rule in the order
  `INVALID_INPUT` → `INVALID_COUPON` → `TENANT_MISMATCH` → `DUPLICATE_COUPON` →
  `COUPON_EXPIRED` → `MIN_ORDER_NOT_MET` → `NOT_STACKABLE` → `DISCOUNT_EXCEEDS_AMOUNT`.

### Key Entities

- **Tenant**: An isolated customer of the platform; owns its own coupons and orders.
- **Coupon**: A discount instrument owned by one tenant. Attributes: code (unique per tenant),
  type (percent or fixed), value (PERCENT 1–100; FIXED positive whole units), validity start,
  validity end, stackable flag, optional minimum spend.
- **Checkout Request**: The tenant, the order amount (positive whole units), the coupons
  presented, and the moment of checkout.
- **Checkout Result**: Either a success (final amount, total discount, applied codes) or a
  failure (reason code).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of checkouts with a qualifying coupon report a final amount equal to the
  order amount minus the computed discount.
- **SC-002**: 100% of cross-tenant coupon presentations are rejected.
- **SC-003**: 100% of checkouts report a final amount of zero or more.
- **SC-004**: Every failed checkout carries a non-empty reason that identifies which rule was
  violated.
- **SC-005**: Every numbered business rule in the requirement is covered by at least one
  acceptance scenario in the automated suite.

## Assumptions

- Validity period boundaries are inclusive at both ends.
- Minimum spend is compared against the original order amount (before any discount) and is
  inclusive (order amount equal to the minimum qualifies).
- A non-stackable coupon must be the only coupon in the checkout; it cannot be combined even
  with stackable coupons.
- Coupons presented at checkout are assumed to already be persisted records; no coupon creation
  or storage is part of this feature.
- Checkout time and validity timestamps are supplied as absolute instants; no time-zone
  conversion is needed.
- Timestamps that cannot be parsed are outside the scope of this feature (callers supply
  well-formed ISO 8601 instants).
