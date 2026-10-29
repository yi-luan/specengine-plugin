# Feature Specification: Member Points Discount at Checkout

**Feature Branch**: `001-points-discount`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "會員點數折抵 — 會員結帳時可以用點數折抵現金，1 點折抵 1 元，折抵點數必須是整數。單筆訂單的折抵金額不得超過訂單金額的 30%。折抵成功後，會員的點數餘額要扣掉這次使用的點數。折抵成功時回傳折抵後的應付金額與剩餘點數；不成功時回傳失敗原因。技術介面固定：在 src/points.ts 匯出 applyPointsDiscount(input: PointsDiscountInput): PointsDiscountResult，純函式，不碰資料庫，金額與點數皆以整數元／整數點計算。"

## Clarifications

### Session 2026-10-20

- Q: What values should the failure reason take for each failure case — fixed machine codes like `EXCEEDS_LIMIT`, and if so what are the codes for insufficient balance and invalid points? → A: Fixed codes. Insufficient balance → `INSUFFICIENT_POINTS`; negative or non-integer points → `INVALID_POINTS`; over 30% cap → `EXCEEDS_LIMIT`.
- Q: When the member asks for more points than their balance, refuse as a whole or auto-reduce to the full balance? → A: Refuse as a whole, no automatic reduction; reason `INSUFFICIENT_POINTS`.
- Q: When the order amount is 0 or negative, or the point balance is negative, refuse and with which reason? → A: Refuse; reason fixed as `INVALID_INPUT`.
- Q: When several rules are violated at once, in which order are they checked? → A: Fixed order `INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT`; report the first hit.
- Q: If the order amount or point balance is not a whole number, refuse with `INVALID_INPUT` or assume it never occurs? → A: "You decide" — executor decision: refuse with `INVALID_INPUT`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Redeem points for a cash discount (Priority: P1)

A member who is checking out an order chooses to spend a whole number of points. Each point is
worth 1 dollar. The system reduces the amount the member must pay by the points used and reduces
the member's point balance by the same number of points. The member sees the new amount payable
and how many points they have left.

**Why this priority**: This is the core value of the feature — without it nothing else matters.

**Independent Test**: Can be fully tested by submitting an order amount, a point balance and a
valid number of points, and checking the returned amount payable and remaining points.

**Acceptance Scenarios**:

1. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   200 points, **Then** the result is successful, the amount payable is 800 dollars and the
   remaining points are 300.
2. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   exactly 300 points (exactly 30% of the order), **Then** the result is successful, the amount
   payable is 700 dollars and the remaining points are 200.
3. **Given** an order of 100 dollars and a member with 30 points, **When** the member uses all
   30 points, **Then** the result is successful, the amount payable is 70 dollars and the
   remaining points are 0.

---

### User Story 2 - Discount is capped at 30% of the order (Priority: P1)

A member may not reduce a single order by more than 30% of its amount using points, regardless
of how many points they hold. The member is told the redemption did not succeed and why.

**Why this priority**: This is the business rule that protects margin; a redemption that ignores
the cap is a financial defect, so it ships together with the core redemption.

**Independent Test**: Can be tested by requesting more points than 30% of the order amount and
verifying the request is refused with a reason that names the 30% limit.

**Acceptance Scenarios**:

1. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   301 points, **Then** the result is unsuccessful with reason `EXCEEDS_LIMIT`.
2. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   301 points, **Then** the request is refused as a whole (the system does not automatically
   trim the points to the maximum allowed) and the member's point balance is not changed.
3. **Given** an order of 1001 dollars and a member with 500 points, **When** the member uses
   300 points, **Then** the result is successful (30% of 1001 is 300.3, rounded down to a cap of
   300), the amount payable is 701 dollars and the remaining points are 200.
4. **Given** an order of 1001 dollars and a member with 500 points, **When** the member uses
   301 points, **Then** the result is unsuccessful with reason `EXCEEDS_LIMIT`.

---

### User Story 3 - Invalid redemption requests are refused with a clear reason (Priority: P2)

A member who tries to use more points than they own, a non-whole number of points, or a negative
number of points is refused, and a fixed reason code identifies the violated rule. The member's
balance is untouched. Requests whose order amount or balance is itself invalid are refused too.

**Why this priority**: Prevents data corruption (negative balances) and gives members actionable
feedback; it is secondary only because a well-behaved client rarely sends such input.

**Independent Test**: Can be tested by submitting each kind of invalid input and verifying the
request is refused with the matching reason and no change in balance.

**Acceptance Scenarios**:

1. **Given** an order of 1000 dollars and a member with 100 points, **When** the member uses
   150 points, **Then** the result is unsuccessful with reason `INSUFFICIENT_POINTS` (the
   request is not reduced to the 100 points available).
2. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   10.5 points, **Then** the result is unsuccessful with reason `INVALID_POINTS`.
3. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   -5 points, **Then** the result is unsuccessful with reason `INVALID_POINTS`.
4. **Given** an order of 1000 dollars and a member with 500 points, **When** the member uses
   0 points, **Then** the result is successful, the amount payable is 1000 dollars (unchanged)
   and the remaining points are 500 (unchanged).
5. **Given** an order of 0 dollars and a member with 500 points, **When** the member uses
   10 points, **Then** the result is unsuccessful with reason `INVALID_INPUT`.
6. **Given** an order of -100 dollars and a member with 500 points, **When** the member uses
   10 points, **Then** the result is unsuccessful with reason `INVALID_INPUT`.
7. **Given** an order of 1000 dollars and a member with -1 points, **When** the member uses
   10 points, **Then** the result is unsuccessful with reason `INVALID_INPUT`.
8. **Given** an order of 1000 dollars and a member with 100 points, **When** the member uses
   10.5 points (invalid and also exceeding nothing), **Then** the reason is `INVALID_POINTS`;
   and **Given** an order of 100 dollars and a member with 10 points, **When** the member uses
   50 points (both insufficient and over the cap), **Then** the reason is `INSUFFICIENT_POINTS`
   because balance is checked before the 30% cap.

---

### Edge Cases

- Order amount of 0 or negative, or point balance negative: refused with reason `INVALID_INPUT`.
- Order amount or point balance that is not a whole number: refused with reason `INVALID_INPUT`
  (executor decision after "you decide").
- Member with 0 points who requests any positive number of points: refused with
  `INSUFFICIENT_POINTS`.
- Request where several rules are violated at once: exactly one reason is returned, the first
  hit in the fixed order `INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` →
  `EXCEEDS_LIMIT`.
- Extremely large values within whole-number range behave the same as small values; no
  overflow handling beyond normal whole-number limits is expected.
- The feature never changes the order amount itself; only the amount payable is reduced.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a member to apply points to a single order at a fixed rate of
  1 point = 1 dollar of discount.
- **FR-002**: System MUST accept only whole-number (integer) point quantities; any non-integer
  quantity MUST be refused with reason `INVALID_POINTS`.
- **FR-003**: System MUST refuse, as a whole, a redemption whose points exceed 30% of the order
  amount (no automatic trimming to the cap), reporting the fixed reason `EXCEEDS_LIMIT`.
- **FR-003a**: The maximum redeemable points for an order is 30% of the order amount rounded
  DOWN to a whole number (e.g. 1001 dollars → cap 300 points; 1000 dollars → cap 300 points,
  and using exactly 300 is allowed).
- **FR-003b**: A request for 0 points MUST succeed, returning the unchanged order amount as the
  amount payable and the unchanged balance as remaining points.
- **FR-004**: System MUST refuse, as a whole, a redemption when the points requested exceed the
  member's current point balance (no automatic reduction to the available balance), with reason
  `INSUFFICIENT_POINTS`.
- **FR-005**: System MUST refuse negative point quantities with reason `INVALID_POINTS` (0 is
  not negative and is allowed, see FR-003b).
- **FR-006**: On success, System MUST return the amount payable after discount (order amount
  minus points used) and the member's remaining points (balance minus points used).
- **FR-007**: On failure, System MUST return exactly one fixed reason code from the set
  {`INVALID_INPUT`, `INVALID_POINTS`, `INSUFFICIENT_POINTS`, `EXCEEDS_LIMIT`} and MUST NOT
  report any amount payable or remaining points.
- **FR-008**: On failure, the member's point balance MUST remain unchanged (the returned result
  carries no deduction).
- **FR-009**: System MUST refuse, with reason `INVALID_INPUT`, an order amount that is zero,
  negative or non-integer, or a point balance that is negative or non-integer.
- **FR-010**: The redemption evaluation MUST be deterministic and self-contained: the same
  inputs always produce the same result, and no external data store is consulted or modified.
- **FR-011**: When more than one rule is violated, System MUST return exactly one reason — the
  first hit in the fixed check order `INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS`
  → `EXCEEDS_LIMIT`.

### Key Entities

- **Order**: the purchase being paid for; attribute: order amount in whole dollars.
- **Member Points Balance**: the number of whole points a member currently holds before
  redemption.
- **Redemption Request**: the number of whole points the member wants to apply to the order.
- **Redemption Outcome**: either a success (amount payable, remaining points) or a failure
  (reason).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid redemption requests (whole number of points, within balance, within
  30% of the order) produce a success outcome whose amount payable equals order amount minus
  points used and whose remaining points equals balance minus points used.
- **SC-002**: 100% of requests that would exceed 30% of the order amount are refused; no success
  outcome ever shows a discount greater than 30% of the order amount.
- **SC-003**: 100% of requests with invalid points (non-integer, negative, more than balance)
  or invalid order/balance inputs are refused with the single fixed reason code that identifies
  the first violated rule in the defined check order.
- **SC-004**: No outcome ever reports a negative amount payable or a negative remaining point
  balance.
- **SC-005**: Every acceptance scenario in this specification is covered by an automated,
  repeatable check that passes.

## Assumptions

- The order amount supplied is the amount before any points discount; other promotions or taxes
  are already included in that amount and are out of scope here.
- The 30% cap applies to the points discount alone, per single order; combining with other
  discount types is out of scope.
- The feature computes the outcome of a redemption; persisting the new balance to a member
  record is the caller's responsibility and out of scope (the feature is self-contained and
  does not touch any data store).
- Failure reasons are fixed codes (see FR-007); any human-readable wording is the caller's
  responsibility.
- Currency is a single whole-dollar unit; there are no fractional currency amounts.
- Zero or negative order amounts are treated as invalid input rather than as a legitimate
  "free order".
