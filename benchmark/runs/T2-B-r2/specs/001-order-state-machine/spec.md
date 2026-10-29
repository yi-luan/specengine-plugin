# Feature Specification: Order State Machine

**Feature Branch**: `001-order-state-machine`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "需求：訂單狀態機 — 訂單建立後狀態為「已建立」，訂單金額必須大於 0；已建立的訂單可以付款，付款金額必須等於訂單金額，付款後狀態為「已付款」；已付款的訂單可以出貨，出貨後狀態為「已出貨」；已建立或已付款的訂單可以取消，取消後狀態為「已取消」；已付款的訂單取消時，系統要退還全部已付金額；已出貨的訂單可以申請退款，退款可以分多次，累計退款金額不得超過已付金額；累計退款金額達到已付金額時，狀態變為「已退款」；每次操作成功時回傳更新後的訂單，失敗時回傳失敗原因。技術介面固定：`src/order.ts` 匯出 OrderStatus / Order / OrderResult 型別與 createOrder、pay、ship、cancel、refund 純函式；金額皆為整數元。"

## Clarifications

### Session 2026-10-20

- Q: Can a paid-but-not-yet-shipped order be refunded directly with a refund operation, or must the customer be made whole only through cancellation? → A: No; refund on a 已付款 order is rejected with `INVALID_TRANSITION`, the customer is refunded via cancel.
- Q: Are 已取消 and 已退款 terminal states, meaning every operation attempted on them is rejected? → A: Yes; pay/ship/cancel/refund on 已取消 or 已退款 all fail with `INVALID_TRANSITION`.
- Q: When a single refund exceeds the remaining refundable balance, should the whole refund be rejected or capped at the balance? → A: Rejected as a whole with `REFUND_EXCEEDS_PAID`; never truncated.
- Q: When a payment amount is 0 or negative on a 已建立 order, which reason is returned? → A: `INVALID_AMOUNT` (check order: state → amount validity → amount comparison).
- Q: Should the order identifier be validated when creating an order (e.g. empty string rejected)? → A: Owner delegated ("你決定"); decision: no validation, id is an opaque string.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and pay for an order (Priority: P1)

A shop operator creates an order for a positive amount. The order starts in the
"created" (已建立) state. The customer then pays exactly the order amount, after which the
order is "paid" (已付款) and records the paid amount.

**Why this priority**: Creation and payment are the entry point of every order lifecycle;
without them no other transition is reachable. This slice alone delivers a usable
"take an order and collect money" capability.

**Independent Test**: Can be fully tested by creating an order with a positive amount,
checking its status/amounts, paying exactly that amount and checking the resulting status
and paid amount. Negative paths (zero/negative amount, wrong payment amount, paying twice)
are testable without any later transition.

**Acceptance Scenarios**:

1. **Given** no order, **When** an order is created with id "o-1" and amount 100,
   **Then** the operation succeeds and the returned order has status 已建立 (CREATED),
   amount 100, paid amount 0 and refunded amount 0.
2. **Given** no order, **When** an order is created with amount 0 or a negative amount,
   **Then** the operation fails with a reason explaining the amount must be greater than 0.
3. **Given** a 已建立 order of amount 100, **When** a payment of 100 is made,
   **Then** the operation succeeds and the returned order has status 已付款 (PAID) and
   paid amount 100.
4. **Given** a 已建立 order of amount 100, **When** a payment of 99 or 101 is made,
   **Then** the operation fails with a reason explaining the payment must equal the order
   amount, and the original order is unchanged.
5. **Given** an order that is not 已建立 (e.g. 已付款, 已出貨, 已取消, 已退款),
   **When** a payment is attempted, **Then** the operation fails with a reason explaining
   the order cannot be paid in its current state.

---

### User Story 2 - Ship a paid order and cancel before shipping (Priority: P2)

A paid order can be shipped, after which it is "shipped" (已出貨). An order that has not
yet been shipped (已建立 or 已付款) can be cancelled; cancelling a paid order returns the
full paid amount to the customer.

**Why this priority**: Shipping completes the happy path; cancellation is the most common
exception path and the only one that touches money before shipment.

**Independent Test**: Can be tested by taking a created/paid order (from Story 1) and
applying ship / cancel, verifying status changes, the refunded money on paid-order
cancellation, and that shipping or cancelling from any other state fails.

**Acceptance Scenarios**:

1. **Given** a 已付款 order, **When** it is shipped, **Then** the operation succeeds and the
   returned order has status 已出貨 (SHIPPED) with amounts unchanged.
2. **Given** an order that is 已建立, 已出貨, 已取消 or 已退款, **When** shipping is
   attempted, **Then** the operation fails with a reason explaining only paid orders can be
   shipped.
3. **Given** a 已建立 order, **When** it is cancelled, **Then** the operation succeeds and
   the returned order has status 已取消 (CANCELLED) with paid amount 0 and refunded amount 0.
4. **Given** a 已付款 order of amount 100 (paid amount 100), **When** it is cancelled,
   **Then** the operation succeeds, the returned order has status 已取消 (CANCELLED), paid
   amount 100 and refunded amount 100 (the full paid amount is recorded as returned).
5. **Given** an order that is 已出貨, 已取消 or 已退款, **When** cancellation is attempted,
   **Then** the operation fails with a reason explaining the order cannot be cancelled in its
   current state.

---

### User Story 3 - Refund a shipped order in one or more instalments (Priority: P3)

After shipment the customer may be refunded. Refunds can be issued several times; the
cumulative refunded amount can never exceed the paid amount. While the cumulative amount is
below the paid amount the order stays 已出貨; once it reaches the paid amount the order
becomes "refunded" (已退款).

**Why this priority**: Post-shipment refunds are the last stage of the lifecycle and depend
on all earlier stages existing.

**Independent Test**: Can be tested by taking a shipped order and issuing partial refunds,
checking the running total and status after each, then a final refund reaching the paid
amount, plus over-limit and wrong-state refund attempts.

**Acceptance Scenarios**:

1. **Given** a 已出貨 order with paid amount 100 and refunded amount 0, **When** a refund of
   30 is issued, **Then** the operation succeeds, refunded amount becomes 30 and status
   remains 已出貨 (SHIPPED).
2. **Given** a 已出貨 order with paid amount 100 and refunded amount 30, **When** a refund of
   70 is issued, **Then** the operation succeeds, refunded amount becomes 100 and status
   becomes 已退款 (REFUNDED).
3. **Given** a 已出貨 order with paid amount 100 and refunded amount 0, **When** a refund of
   100 is issued in one go, **Then** the operation succeeds and status becomes 已退款.
4. **Given** a 已出貨 order with paid amount 100 and refunded amount 30, **When** a refund of
   71 is issued, **Then** the operation fails with a reason explaining the cumulative refund
   would exceed the paid amount, and the order is unchanged (refunded amount still 30,
   status still 已出貨).
5. **Given** an order that is 已建立, 已付款, 已取消 or 已退款, **When** a refund is
   attempted, **Then** the operation fails with a reason explaining only shipped orders can be
   refunded.

---

### Edge Cases

- Creating an order whose amount is not a whole number of dollars, or not a number at all:
  rejected with `INVALID_AMOUNT` (FR-012).
- Refunding or creating with a non-positive amount (0 or negative): rejected with
  `INVALID_AMOUNT`; paying 0 or a negative amount: rejected with `INVALID_AMOUNT` (validity
  check runs before the comparison); paying a positive amount other than the order amount:
  rejected with `AMOUNT_MISMATCH`.
- A refund larger than the remaining balance (paid − refunded) is rejected as a whole with
  `REFUND_EXCEEDS_PAID`; it is never capped to the balance.
- An operation that is both in the wrong state and has a bad amount (e.g. refunding -5 on a
  已取消 order) reports the state problem first: `INVALID_TRANSITION` (FR-013).
- A refund whose amount is exactly the remaining refundable balance moves the order to
  已退款; a refund one unit higher is rejected.
- Issuing a refund on an order that is already 已退款 (balance is 0): rejected because the
  order is no longer 已出貨.
- Cancelling an order whose paid amount is 0 (已建立) returns nothing and records nothing.
- Every operation leaves the input order untouched; callers that keep the old object still
  see the pre-operation values.
- Operations never throw; all failures are reported as a result with `ok: false` and a
  reason.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating an order with an identifier and an amount; the new
  order MUST have status 已建立 (CREATED), the given amount, paid amount 0 and refunded
  amount 0.
- **FR-002**: System MUST reject order creation when the amount is not greater than 0.
- **FR-003**: System MUST allow paying a 已建立 order only when the payment amount equals the
  order amount; on success the order becomes 已付款 (PAID) and its paid amount equals the
  payment amount.
- **FR-004**: System MUST reject payment when the order is not 已建立, or when the payment
  amount differs from the order amount.
- **FR-005**: System MUST allow shipping a 已付款 order; on success the order becomes 已出貨
  (SHIPPED). Shipping from any other state MUST be rejected.
- **FR-006**: System MUST allow cancelling an order that is 已建立 or 已付款; on success the
  order becomes 已取消 (CANCELLED). Cancelling from any other state MUST be rejected.
- **FR-007**: When a 已付款 order is cancelled, the system MUST return the full paid amount to
  the customer: the returned order has status 已取消 (CANCELLED), its refunded amount is set
  equal to its paid amount, and its paid amount is left unchanged.
- **FR-008**: System MUST allow refunding a 已出貨 order one or more times; each successful
  refund increases the refunded amount by the refund amount.
- **FR-009**: System MUST reject a refund as a whole (never truncate it) when the cumulative
  refunded amount after the refund would exceed the paid amount; reason `REFUND_EXCEEDS_PAID`;
  the order remains unchanged.
- **FR-010**: When the cumulative refunded amount equals the paid amount after a refund, the
  order status MUST become 已退款 (REFUNDED); otherwise it stays 已出貨.
- **FR-011**: Refunding an order that is not 已出貨 MUST be rejected with `INVALID_TRANSITION`;
  in particular a 已付款 order cannot be refunded directly — it must be cancelled (FR-007).
- **FR-016**: 已取消 and 已退款 are terminal states: pay, ship, cancel and refund on such an
  order MUST all be rejected with `INVALID_TRANSITION`. Likewise shipping a 已建立 order,
  cancelling a 已出貨 order and paying a non-已建立 order are rejected with
  `INVALID_TRANSITION`.
- **FR-017**: The order identifier is not validated; any string (including the empty string)
  is accepted as-is.
- **FR-012**: Amounts are whole dollars (integers). Input amounts MUST be validated:
  an order amount of 0 or less is rejected with reason `INVALID_AMOUNT`; a refund amount of 0
  or less is rejected with reason `INVALID_AMOUNT`; a payment amount different from the order
  amount (under- or over-payment) is rejected with reason `AMOUNT_MISMATCH` — partial
  payment is never allowed. Non-integer amounts (e.g. 10.5, NaN) are treated as invalid
  amounts and rejected with `INVALID_AMOUNT` (owner delegated this choice; see Assumptions).
- **FR-013**: Every successful operation MUST return the updated order; every failed
  operation MUST return a failure reason that is exactly one of the fixed English codes
  `INVALID_AMOUNT`, `AMOUNT_MISMATCH`, `INVALID_TRANSITION`, `REFUND_EXCEEDS_PAID`.
  When more than one problem is present, checks are applied in this order and the first
  failing check's code is returned: (1) state check → `INVALID_TRANSITION`; (2) amount
  validity → `INVALID_AMOUNT`; (3) amount comparison → `AMOUNT_MISMATCH` (payment) or
  `REFUND_EXCEEDS_PAID` (refund).
- **FR-014**: Operations MUST be pure: the order passed in MUST NOT be modified; success
  MUST yield a new order object.
- **FR-015**: The public interface (module `src/order.ts`, the `OrderStatus`, `Order`,
  `OrderResult` types and the `createOrder`, `pay`, `ship`, `cancel`, `refund` functions)
  is fixed by the requirement and MUST be exported with exactly those names and signatures.

### Key Entities

- **Order**: a purchase with an identifier, a status, the order amount, the amount paid so
  far and the cumulative refunded amount. Amounts are whole-dollar integers.
- **OrderStatus**: one of 已建立 (CREATED), 已付款 (PAID), 已出貨 (SHIPPED), 已取消
  (CANCELLED), 已退款 (REFUNDED). Allowed transitions:
  CREATED → PAID (pay), PAID → SHIPPED (ship), CREATED/PAID → CANCELLED (cancel),
  SHIPPED → SHIPPED (partial refund), SHIPPED → REFUNDED (refund reaching paid amount).
  CANCELLED and REFUNDED are terminal.
- **OrderResult**: the outcome of an operation — either success carrying the updated order,
  or failure carrying a reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the state transitions listed under Key Entities succeed when applied
  from their allowed source state, and 100% of transitions attempted from any other state are
  rejected with a reason.
- **SC-002**: For every rejected operation the order passed in is identical to what it was
  before the call, and for every accepted operation the original object is also unchanged
  (no mutation observed in 100% of cases).
- **SC-003**: A sequence of partial refunds whose total equals the paid amount always ends in
  已退款, and no sequence can ever drive the refunded amount above the paid amount.
- **SC-004**: Every numbered item of the original requirement (1–8) is covered by at least one
  automated acceptance scenario, and the whole acceptance suite runs in under 10 seconds.

## Assumptions

- Orders are in-memory values handed between calls; there is no persistence, concurrency or
  identifier uniqueness enforcement in this feature.
- The identifier is an opaque string supplied by the caller; no format validation is done
  (owner delegated this decision; see Clarifications and FR-017).
- Partial refunds leave the order in 已出貨 until the paid amount is fully refunded.
- Shipping and cancellation do not take an amount; refund and payment amounts are supplied by
  the caller.
- Non-integer amounts (fractions, NaN, Infinity) are rejected with `INVALID_AMOUNT` at the
  amount-validity step; the requirement owner delegated this decision ("你決定") and
  "金額皆為整數元" is read as a validation rule.
