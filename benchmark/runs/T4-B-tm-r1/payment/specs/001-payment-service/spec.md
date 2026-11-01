# Feature Specification: Payment Service (event-driven order flow)

**Feature Branch**: `001-payment-service`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "需求檔 tasks/t4-team/requirement.md（事件驅動下單流程：訂單、庫存、付款三個服務 — 團隊版），本功能範圍為我負責的付款服務（src/payment.ts）。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Charge the customer once stock is reserved (Priority: P1)

When the inventory service has reserved stock for an order, the payment service charges
the customer the order amount. If the customer's balance covers the amount, the balance is
reduced and the rest of the system is told that payment succeeded; otherwise the balance is
left untouched and the system is told that payment failed.

**Why this priority**: This is the core value of the payment service; without it no order
can ever be confirmed.

**Independent Test**: Feed the service an `OrderPlaced` event followed by a `StockReserved`
event for the same order and check the resulting event and the customer's balance.

**Acceptance Scenarios**:

1. **Given** customer C has balance 100 and order O (customer C, amount 60) has been placed,
   **When** stock is reserved for O, **Then** C's balance becomes 40 and exactly one
   `PaymentSucceeded` for O with amount 60 is emitted.
2. **Given** customer C has balance 50 and order O (customer C, amount 60) has been placed,
   **When** stock is reserved for O, **Then** C's balance stays 50 and exactly one
   `PaymentFailed` for O is emitted.
3. **Given** customer C has balance 60 and order O (amount 60) has been placed,
   **When** stock is reserved for O, **Then** the charge succeeds and C's balance becomes 0
   (an exact balance is sufficient).
4. **Given** the service receives events it does not act on (`OrderPlaced`, `StockRejected`,
   `StockReleased`, `PaymentSucceeded`, `PaymentFailed`, `PaymentRefunded`),
   **When** such an event is handled, **Then** no event is emitted and no balance changes.

---

### User Story 2 - Refund when an order is cancelled (Priority: P2)

When an order is cancelled (by the customer, or automatically by the order service after the
15-minute payment window), the payment service returns the amount it charged to the customer
and tells the system that the payment was refunded.

**Why this priority**: Cancellation is the second mandated flow; a customer must never lose
money for an order that is not fulfilled.

**Independent Test**: After a successful charge, feed an `OrderCancelled` event for the
order and check that the balance is restored and a `PaymentRefunded` event is emitted.

**Acceptance Scenarios**:

1. **Given** order O was charged 60 to customer C (balance now 40), **When** O is cancelled,
   **Then** C's balance becomes 100 and exactly one `PaymentRefunded` for O with amount 60
   is emitted.
2. **Given** order O was placed but the charge for O failed (balance insufficient),
   **When** O is cancelled, **Then** C's balance is unchanged and no event is emitted
   (nothing was charged, so nothing is refunded).
3. **Given** order O was cancelled before any stock reservation arrived, **When** a
   `StockReserved` for O arrives later (out-of-order delivery), **Then** the customer is not
   charged and no event is emitted (the service remembers that O is cancelled).
4. **Given** order O was charged and refunded once, **When** any further `OrderCancelled`
   for O arrives, **Then** no second refund is made (at most one refund per order, always
   for the full charged amount).

---

### User Story 3 - Behave correctly under duplicate and out-of-order delivery (Priority: P3)

The event bus delivers every event at least once, may deliver duplicates, and does not
preserve order. The payment service must never double-charge, never double-refund, and must
not lose a legitimate charge just because events arrived in an unexpected order.

**Why this priority**: Required by the delivery guarantees in the requirement; without it
money is lost or double-counted in production, but it builds on top of stories 1 and 2.

**Independent Test**: Replay the same `StockReserved` / `OrderCancelled` events multiple
times and in shuffled order and check balances and emitted events.

**Acceptance Scenarios**:

1. **Given** order O was already charged, **When** the same `StockReserved` for O is
   delivered again, **Then** no additional charge is made and no additional event is emitted.
2. **Given** order O was already refunded, **When** the same `OrderCancelled` for O is
   delivered again, **Then** no additional refund is made and no additional event is emitted.
3. **Given** order O was charged and then refunded, **When** a duplicate `StockReserved` for
   O arrives afterwards, **Then** the customer is not charged again.
4. **Given** the service has NOT yet seen `OrderPlaced` for order O, **When** `StockReserved`
   for O arrives first, **Then** no event is emitted yet, the service remembers that O is
   reserved, and as soon as `OrderPlaced` for O arrives the charge is performed and exactly
   one `PaymentSucceeded` or `PaymentFailed` is emitted in response to that `OrderPlaced`.
5. **Given** `StockReserved` for O arrived before `OrderPlaced` and then `OrderCancelled` for
   O arrives (still before `OrderPlaced`), **When** `OrderPlaced` for O finally arrives,
   **Then** the customer is not charged and no event is emitted.
6. **Given** `OrderPlaced` for O was already seen, **When** a duplicate `OrderPlaced` for O
   arrives, **Then** nothing changes and nothing is emitted.
7. **Given** the charge for O failed (`PaymentFailed` emitted) and the customer's balance has
   since become sufficient, **When** the same `StockReserved` event (same event id) for O is
   delivered again, **Then** the service ignores it: no charge, no state change, no event.
8. **Given** any event the service has already handled, **When** an event with the same event
   id is delivered again, **Then** it is ignored from the second delivery onward: no state
   change and no event, whatever its type.

---

### Edge Cases

- Customer not present in the initial balance table: treated as having balance 0, so any
  positive charge fails; `getBalance` reports 0.
- Order amount 0: the charge always succeeds, balance is unchanged, `PaymentSucceeded`
  with amount 0 is emitted.
- Same customer with several orders: each order is charged/refunded independently against
  the single shared balance, in the order events arrive.
- A refund must restore exactly the amount that was charged, never more, even if the order
  amount were to be reported differently in a later duplicate `OrderPlaced`.
- Every emitted event carries a system-wide unique id; two emitted events never share an id.
- Events for unknown orders of types the service ignores produce nothing.
- A failed charge is final for that order: after `PaymentFailed` has been emitted, no later
  `StockReserved` for the same order (duplicate or not) charges again or emits anything;
  the customer must place a new order. Each order therefore has at most one payment
  outcome event.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST remember the customer and amount of every order it learns
  about from `OrderPlaced`, so that later events that carry only the order id can be acted on.
- **FR-002**: On `StockReserved` for a known order that has no payment outcome yet (neither
  charged nor failed) and has not been cancelled, the service MUST charge the order amount to the order's customer: if the customer's balance is greater
  than or equal to the amount, the balance is reduced by the amount and one
  `PaymentSucceeded` (with the charged amount) is emitted; otherwise the balance is unchanged
  and one `PaymentFailed` is emitted.
- **FR-003**: On `OrderCancelled` for an order that has been successfully charged and not yet
  refunded, the service MUST add the charged amount back to the customer's balance and emit
  one `PaymentRefunded` carrying that amount.
- **FR-004**: The service MUST be idempotent at two levels. (a) Event level: an event whose
  id the service has already handled MUST be ignored from the second delivery onward — no
  state change, no emitted event, regardless of type. (b) Order level: even with a fresh
  event id, a further `StockReserved` MUST NOT charge an order that already has a payment
  outcome, a further `OrderCancelled` MUST NOT refund again, and a further `OrderPlaced`
  MUST NOT alter stored order details. None of these emit events.
- **FR-005**: Once the service has seen `OrderCancelled` for an order (whether or not it was
  ever charged), a later `StockReserved` for it MUST NOT result in a charge and MUST emit no
  event. Cancellation of an order that was never successfully charged MUST emit nothing.
  At most one refund is ever made per order, always for the full charged amount.
- **FR-006**: The service MUST return an empty result for event types it does not act on and
  MUST NOT change any balance for them.
- **FR-007**: The service MUST expose the current balance of any customer; unknown customers
  report 0.
- **FR-008**: Every event emitted by the service MUST carry an id that is unique across the
  whole system.
- **FR-009**: All amounts and balances are integers; the service MUST never drive a balance
  below zero.
- **FR-010**: The service MUST keep only its own state (order details it has seen, charge /
  refund status per order, customer balances) and MUST NOT call or read other services.
- **FR-011**: If `StockReserved` for an order arrives before its `OrderPlaced`, the service
  MUST remember the reservation and emit nothing; when the `OrderPlaced` later arrives the
  charge MUST be performed then (per FR-002) and the outcome event emitted in response to
  that `OrderPlaced`, unless the order has meanwhile been cancelled (FR-005).
- **FR-012**: A failed charge is final: once `PaymentFailed` has been emitted for an order,
  the service MUST NOT attempt to charge that order again and MUST emit nothing for any
  later `StockReserved` for it.

### Key Entities

- **Customer balance**: integer amount of money a customer currently holds, keyed by
  customer id; seeded at service creation.
- **Order payment record**: what the payment service knows about one order — customer id
  and amount (from `OrderPlaced`, possibly not yet known), whether a reservation has been
  seen, whether a cancellation has been seen, and payment state: `UNPAID` → `PAID`
  (charged) or `FAILED` (insufficient balance); `PAID` → `REFUNDED` on cancellation.
- **Emitted payment events**: `PaymentSucceeded`, `PaymentFailed`, `PaymentRefunded`, each
  with a unique id and the order id (and amount where the contract defines one).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every order whose stock is reserved, exactly one payment outcome event
  (`PaymentSucceeded` or `PaymentFailed`) is produced, regardless of how many times the
  reservation is delivered.
- **SC-002**: For every charged order that is cancelled, exactly one `PaymentRefunded` is
  produced and the customer's balance equals its value before the charge, regardless of how
  many times the cancellation is delivered.
- **SC-003**: Under any interleaving or duplication of the events for one order, the final
  customer balance is the same as under ideal single, ordered delivery.
- **SC-004**: No customer balance is ever negative at any point.
- **SC-005**: 100% of the scenarios above pass in the automated test suite.

## Assumptions

- The order service alone owns the 15-minute timeout; from the payment service's point of
  view a timeout is simply another `OrderCancelled` and is handled identically.
- The payment service does not need a notion of time; it never emits events on its own
  initiative, only in direct response to a handled event.
- The initial balance table passed at creation is the full set of known customers; a
  customer not listed has balance 0.
- Amounts in `OrderPlaced` are non-negative integers; negative amounts are not expected and
  are out of scope.
- The payment service ignores `StockRejected`, `StockReleased` and its own emitted event
  types; it reacts only to `OrderPlaced` (to learn details), `StockReserved` and
  `OrderCancelled`.
- During development the other two services are empty shells; tests fabricate the events
  those services would emit.
- (Decided by the engineer, Q3 left to our judgement) A reservation that arrives before the
  order details is remembered and acted on when the details arrive, because at-least-once
  delivery does not promise a redelivery and dropping it would leave the order stuck until
  the timeout.
- (Decided by the engineer, Q4 partially left to our judgement) A `StockReserved` with a new
  event id for an order whose charge already failed is also ignored, so that every order has
  at most one payment outcome and colleagues' services never see a failure flip to success.

## Clarifications

### Session 2026-11-01

- Q: When an order is cancelled but nothing was ever charged, emit `PaymentRefunded` with
  amount 0 or nothing? → A: Nothing. Refund only what was charged, in full, at most once per
  order; no charge means no refund and no event.
- Q: `StockReserved` arrives after `OrderCancelled` for the same order — charge? → A: No.
  The service remembers the order is cancelled; the late reservation causes no charge and no
  event.
- Q: `StockReserved` arrives before `OrderPlaced` — remember it or ignore it? → A: Left to the
  engineer; decided: remember it and charge when `OrderPlaced` arrives (see Assumptions).
- Q: After a charge failed, if the same `StockReserved` is redelivered, retry the charge or
  treat the order as finally failed? → A: Any event with an id already handled is ignored
  from the second delivery onward (no state change, no event). Other cases left to the
  engineer; decided: a failed charge is final for that order (FR-012), one outcome per order.
