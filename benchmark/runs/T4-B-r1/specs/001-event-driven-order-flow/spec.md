# Feature Specification: Event-Driven Order Flow

**Feature Branch**: `001-event-driven-order-flow`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "事件驅動下單流程（訂單、庫存、付款三個服務）— see tasks/t4/requirement.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Successful Purchase (Priority: P1)

A customer places an order for a quantity of one product at a given amount. The order starts in
"processing" (PENDING). The inventory service reserves the stock, the payment service charges the
customer, and the order becomes "confirmed" (CONFIRMED). Each service only learns about the
others through broadcast events.

**Why this priority**: This is the core happy path; without it nothing else has value.

**Independent Test**: Place one order with sufficient stock and balance, broadcast each emitted
event to all three services, and observe the order ending CONFIRMED with stock and balance reduced.

**Acceptance Scenarios**:

1. **Given** stock for SKU "A" is 10 and customer "c1" has balance 100, **When** "c1" places order
   "o1" for 2 of "A" at amount 50, **Then** the command succeeds, the order is PENDING, and exactly
   one `OrderPlaced` event is emitted carrying the order details.
2. **Given** `OrderPlaced` for "o1" is broadcast, **When** the inventory service handles it,
   **Then** it emits `StockReserved` for "o1" and the available stock of "A" becomes 8.
3. **Given** `StockReserved` for "o1" is broadcast, **When** the payment service handles it,
   **Then** it emits `PaymentSucceeded` for "o1" with amount 50 and the balance of "c1" becomes 50.
4. **Given** `PaymentSucceeded` for "o1" is broadcast, **When** the order service handles it,
   **Then** order "o1" becomes CONFIRMED.
5. **Given** any of the above events, **When** a service that does not care about that event
   type handles it, **Then** it returns no events and changes no state.

---

### User Story 2 - Insufficient Stock or Funds (Priority: P1)

When stock is insufficient the order is marked "out of stock" (REJECTED). When the customer's
balance is insufficient the order is marked "payment failed" (FAILED) and the reserved stock is
released back.

**Why this priority**: Failure paths are the core of the compensation design; they must work
before cancellation and timeouts can be meaningful.

**Independent Test**: Place an order exceeding stock and verify REJECTED with stock untouched;
place an order exceeding balance and verify FAILED with stock released and balance untouched.

**Acceptance Scenarios**:

1. **Given** stock for "A" is 1, **When** `OrderPlaced` for 2 of "A" is handled by inventory,
   **Then** it emits `StockRejected` and available stock stays 1.
2. **Given** `StockRejected` for "o1" is handled by the order service, **Then** "o1" becomes
   REJECTED.
3. **Given** "c1" has balance 10 and stock was reserved for "o1" (amount 50), **When** the payment
   service handles `StockReserved`, **Then** it emits `PaymentFailed` and the balance stays 10.
4. **Given** `PaymentFailed` for "o1" is handled by the order service, **Then** "o1" becomes FAILED.
5. **Given** inventory reserved 2 of "A" for "o1" (available 8), **When** it handles
   `PaymentFailed` for "o1", **Then** it emits `StockReleased` and available stock returns to 10.

---

### User Story 3 - Customer Cancellation with Compensation (Priority: P2)

A customer cancels an order. The order service records the cancellation (reason CUSTOMER) and
emits `OrderCancelled`; the inventory service puts back any reserved stock, and the payment
service refunds any money already charged, emitting `PaymentRefunded`.

**Why this priority**: Required by the requirement but depends on the P1 flows being in place.

**Independent Test**: Cancel a confirmed order and verify status CANCELLED/CUSTOMER, stock
restored, balance restored, and `PaymentRefunded` emitted.

**Acceptance Scenarios**:

1. **Given** order "o1" is PENDING, **When** the customer cancels it, **Then** the command succeeds,
   "o1" becomes CANCELLED with cancel reason CUSTOMER, and `OrderCancelled` is emitted.
2. **Given** inventory reserved stock for "o1", **When** it handles `OrderCancelled` for "o1",
   **Then** it releases the stock (available restored) and emits `StockReleased`.
3. **Given** payment charged 50 for "o1", **When** it handles `OrderCancelled` for "o1", **Then** it
   refunds 50 to the customer and emits `PaymentRefunded` with amount 50.
4. **Given** payment has not charged anything for "o1", **When** it handles `OrderCancelled`,
   **Then** it emits no `PaymentRefunded` and the balance is unchanged.
5. **Given** order "o1" is CONFIRMED (already paid), **When** the customer cancels, **Then** it
   succeeds, "o1" becomes CANCELLED with reason CUSTOMER, `OrderCancelled` is emitted, and the
   downstream compensation restores the stock and refunds the full amount.
6. **Given** order "o1" is REJECTED, FAILED or already CANCELLED, **When** the customer cancels,
   **Then** the command fails with reason `NOT_CANCELLABLE`, no event is emitted and the status is
   unchanged.
7. **Given** no order "o9" exists, **When** the customer cancels "o9", **Then** the command fails
   with reason `ORDER_NOT_FOUND` and no event is emitted.

---

### User Story 4 - Automatic Timeout Cancellation (Priority: P2)

An order that has not completed payment within 15 minutes of being placed is cancelled
automatically when time advances past the deadline. The cancel reason is TIMEOUT and the same
compensation (stock release, refund if charged) follows via `OrderCancelled`.

**Why this priority**: Required behaviour; depends on cancellation compensation (Story 3).

**Independent Test**: Place an order, do not deliver `PaymentSucceeded`, advance time to 15
minutes later, and verify the order is CANCELLED with reason TIMEOUT and `OrderCancelled` emitted.

**Acceptance Scenarios**:

1. **Given** "o1" was placed at 12:00:00Z and is still PENDING, **When** time advances to
   12:15:00Z (exactly 15 minutes later; the boundary is inclusive), **Then** `OrderCancelled` for
   "o1" is emitted once and "o1" is CANCELLED with reason TIMEOUT.
2. **Given** "o1" was placed at 12:00:00Z and is still PENDING, **When** time advances to
   12:14:59Z, **Then** no event is emitted and "o1" stays PENDING.
3. **Given** "o1" is CONFIRMED, REJECTED, FAILED or already CANCELLED, **When** time advances past
   the deadline, **Then** no event is emitted and the status is unchanged.
4. **Given** "o1" timed out at 12:15:00Z, **When** time advances again to 12:20:00Z, **Then** no
   further `OrderCancelled` is emitted for "o1".
5. **Given** two orders with different placement times, **When** time advances past only the
   earlier deadline, **Then** only the earlier order is cancelled.

---

### User Story 5 - Reliable Delivery Semantics (Priority: P2)

Events may be delivered more than once and in any order. Each service must produce the same
final state and emit each outcome event only once per order regardless of duplicates or ordering.

**Why this priority**: Explicitly required (item 8); without it the compensation logic double
charges or double releases.

**Independent Test**: Deliver `OrderPlaced` twice to inventory and verify stock is reduced only
once and `StockReserved` emitted only once; deliver `StockReserved` before `OrderPlaced` to payment
and verify the charge happens exactly once after both are known.

**Acceptance Scenarios**:

1. **Given** inventory already handled `OrderPlaced` for "o1", **When** the same event (same id)
   arrives again, **Then** no event is emitted and the available stock is unchanged.
2. **Given** payment already charged for "o1", **When** `StockReserved` for "o1" arrives again,
   **Then** no event is emitted and the balance is unchanged.
3. **Given** the order service already handled `PaymentSucceeded` for "o1", **When** it arrives
   again, **Then** no change and no event.
4. **Given** payment receives `StockReserved` for "o1" before it has seen `OrderPlaced` for "o1",
   **When** `OrderPlaced` for "o1" later arrives, **Then** the charge is made exactly once and
   `PaymentSucceeded` is emitted once.
5. **Given** inventory receives `OrderCancelled` for "o1" before `OrderPlaced` for "o1", **When**
   `OrderPlaced` later arrives, **Then** no stock is reserved and no `StockReserved` is emitted.
6. **Given** payment receives `OrderCancelled` for "o1" before `StockReserved` for "o1", **When**
   `StockReserved` later arrives, **Then** no charge is made and no payment event is emitted.
7. **Given** order "o1" was cancelled (by customer or timeout) and `PaymentSucceeded` for "o1"
   arrives afterwards at the order service, **Then** "o1" stays CANCELLED (cancellation is final)
   and no event is emitted; the payment service, having both charged and seen `OrderCancelled`,
   refunds and emits `PaymentRefunded` exactly once; the inventory service likewise releases the
   stock exactly once.
8. **Given** inventory released stock for "o1" because of `PaymentFailed`, **When**
   `OrderCancelled` for "o1" also arrives, **Then** stock is not released a second time and no
   second `StockReleased` is emitted.
9. **Given** order "o1" is in a terminal state (CANCELLED, REJECTED or FAILED), **When** any
   event for "o1" arrives at the order service, **Then** the status and cancel reason never change
   and no event is emitted.
10. **Given** payment already charged for "o1", **When** a `StockReserved` for "o1" with a
    different event id arrives, **Then** it is treated as a duplicate: no second charge and no
    event (deduplication is per order and step, not per event id).

---

### Edge Cases

- Placing an order with an `orderId` that already exists fails with reason `DUPLICATE_ORDER`, creates
  nothing and emits nothing.
- Placing an order whose `qty` or `amount` is not a positive integer (≥ 1), or whose `orderId`,
  `customerId` or `sku` is an empty string, fails with reason `INVALID_INPUT`, creates nothing and
  emits nothing.
- Cancelling an unknown order fails with reason `ORDER_NOT_FOUND`; cancelling an order that is
  REJECTED, FAILED or already CANCELLED fails with reason `NOT_CANCELLABLE`.
- Looking up an unknown order returns "not found" (undefined).
- Inventory asked about a SKU it has never seen reports 0 available.
- Payment asked about a customer it has never seen reports balance 0.
- A customer cancellation requested after the 15-minute deadline but before the clock was
  advanced is still a CUSTOMER cancellation.
- Multiple orders for the same SKU or the same customer each reserve/charge independently; the
  second order sees the stock/balance remaining after the first.
- Every event emitted anywhere in the system has an `id` that is unique across all three services
  and across all events ever emitted in the run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The order service MUST create an order in PENDING state from a placement request and
  emit exactly one `OrderPlaced` event carrying the order id, customer, SKU, quantity, amount and
  placement time.
- **FR-002**: The order service MUST reject a placement whose `orderId` already exists with reason
  `DUPLICATE_ORDER`, and MUST reject a placement whose `qty` or `amount` is not a positive integer
  or whose `orderId`, `customerId` or `sku` is an empty string with reason `INVALID_INPUT`. A
  rejected placement creates no order and emits no event.
- **FR-003**: The inventory service MUST, on first receipt of `OrderPlaced`, reserve the quantity
  when available stock ≥ quantity and emit `StockReserved`; otherwise emit `StockRejected` without
  changing stock.
- **FR-004**: The inventory service MUST report, per SKU, the stock currently available for
  reservation (initial stock minus active reservations).
- **FR-005**: The payment service MUST, once it knows both the order details (`OrderPlaced`) and
  that stock is reserved (`StockReserved`), charge the customer when balance ≥ amount and emit
  `PaymentSucceeded` with the amount; otherwise emit `PaymentFailed` without changing the balance.
- **FR-006**: The order service MUST transition PENDING → CONFIRMED on `PaymentSucceeded`,
  PENDING → REJECTED on `StockRejected`, and PENDING → FAILED on `PaymentFailed`. CANCELLED,
  REJECTED and FAILED are terminal: once reached, no later event of any kind changes the order's
  status or cancel reason. CONFIRMED may only move to CANCELLED via customer cancellation.
- **FR-007**: The inventory service MUST release the reservation for an order on `PaymentFailed`
  and emit `StockReleased`.
- **FR-008**: The order service MUST let a customer cancel an order that is PENDING or CONFIRMED,
  set the status to CANCELLED with cancel reason CUSTOMER, and emit `OrderCancelled`. Cancelling an
  order that is REJECTED, FAILED or CANCELLED MUST fail with reason `NOT_CANCELLABLE`; cancelling an
  unknown order MUST fail with reason `ORDER_NOT_FOUND`. A failed cancel emits nothing.
- **FR-009**: The inventory service MUST, on `OrderCancelled`, release exactly the quantity
  actually reserved for that order (at most once per order) and emit `StockReleased`; if nothing
  is reserved (never reserved, already released, or rejected) it MUST NOT change stock and MUST
  emit nothing.
- **FR-010**: The payment service MUST, on `OrderCancelled`, refund any amount charged for that
  order and emit `PaymentRefunded` with that amount; if nothing was charged it MUST emit nothing.
- **FR-011**: The order service MUST, when time is advanced, cancel every order that is still
  PENDING and for which `now >= placement time + 15 minutes` (inclusive boundary), setting cancel
  reason TIMEOUT and emitting one `OrderCancelled` per such order.
- **FR-012**: Every service MUST ignore (return no events, change no state) any event type it does
  not handle.
- **FR-013**: Every service MUST be idempotent with respect to duplicate deliveries. Deduplication
  is keyed by (order id, step): once a step (reserve, reject, charge, fail, release, refund,
  status transition) has been performed for an order, any further event that would trigger the
  same step MUST NOT change state or emit again, regardless of whether its event `id` is the same
  or different.
- **FR-014**: Every service MUST tolerate out-of-order delivery: a service MUST remember what it has
  learned about an order and act once all prerequisites are known, and MUST never reserve or charge
  for an order it already knows is cancelled.
- **FR-015**: A compensation (stock release, refund) MUST happen at most once per order.
- **FR-016**: Services MUST keep only their own state and MUST NOT call or read each other; all
  coordination is via events returned from command/handle calls and broadcast by the caller.
- **FR-017**: Every emitted event MUST carry a system-wide unique `id`.
- **FR-018**: All amounts and quantities are integers; all times are ISO 8601 UTC strings.
- **FR-019**: Looking up an order MUST return its current status and, when CANCELLED, the cancel
  reason; unknown orders return not found.

### Key Entities

- **Order**: id, customer id, SKU, quantity, amount, placement time, status (PENDING, CONFIRMED,
  REJECTED, FAILED, CANCELLED), cancel reason (CUSTOMER or TIMEOUT when CANCELLED). Owned by the
  order service.
- **Reservation**: order id → SKU and quantity currently held, plus whether it has been released.
  Owned by the inventory service together with per-SKU available stock.
- **Charge**: order id → customer id and amount charged, plus whether refunded. Owned by the
  payment service together with per-customer balance.
- **Event**: id, type, order id and type-specific payload. Produced by services, broadcast by the
  caller to all services.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every combination of sufficient/insufficient stock and sufficient/insufficient
  balance, broadcasting the emitted events until none remain ends the order in exactly the
  expected terminal state (CONFIRMED, REJECTED, FAILED) with stock and balance matching the
  expected arithmetic, 100% of the time.
- **SC-002**: Delivering any event twice, or any pair of events in reverse order, produces the
  same final state and the same multiset of outcome events as a single in-order delivery.
- **SC-003**: After any cancellation (customer or timeout), reserved stock and charged money are
  returned exactly once, and available stock and balance equal their pre-order values.
- **SC-004**: Across a run that emits at least 100 events from all three services, no two events
  share an `id`.
- **SC-005**: The full acceptance suite runs in memory with no external dependencies and completes
  in under 10 seconds.

## Clarifications

### Session 2026-11-01

- Q: Which order states may a customer cancel from? → A: PENDING and CONFIRMED only. REJECTED /
  FAILED / CANCELLED return `{ ok: false, reason: 'NOT_CANCELLABLE' }` with no event; unknown
  order returns reason `ORDER_NOT_FOUND`. Cancelling a CONFIRMED order sets cancelReason
  `CUSTOMER`, releases stock and refunds the full amount.
- Q: Is the 15-minute timeout boundary inclusive? → A: Yes, `now >= placedAt + 15 min` cancels
  (12:15:00Z after a 12:00:00Z placement is cancelled).
- Q: When `PaymentSucceeded` arrives after the order was cancelled, who wins? → A: Cancellation is
  final. CANCELLED / REJECTED / FAILED are terminal states; no later event changes the order's
  status. The payment service refunds (emits `PaymentRefunded`) once it has both charged and seen
  `OrderCancelled`; the inventory service releases the stock likewise.
- Q: Should inventory emit `StockReleased` when releasing stock because of `OrderCancelled`? → A:
  Yes. Only the quantity actually reserved is put back, at most once per order; if nothing was
  reserved, stock is unchanged and no `StockReleased` is emitted.
- Q: What `reason` does a rejected `placeOrder` return? → A: duplicate `orderId` →
  `DUPLICATE_ORDER`; `qty` or `amount` not a positive integer, or `orderId` / `customerId` / `sku`
  empty string → `INVALID_INPUT`. Neither creates an order nor emits an event.
- Q: Are re-delivered events with a different `id` duplicates or new events? → A: Owner delegated
  the decision; chosen: deduplicate per (order id, step) regardless of event id, so no double
  charge / double reserve is possible.

## Assumptions

- The caller (test harness or application) is responsible for broadcasting every event returned
  by any service to all three services' `handle`; services never deliver to each other.
- `tick(now)` is the only trigger for timeout cancellation; the order service does not cancel on
  its own when `cancelOrder` or `handle` is called with a later time.
- A customer cancellation at or after the deadline, received before `tick`, is a CUSTOMER
  cancellation (not TIMEOUT).
- `cancelOrder` on a REJECTED or FAILED order is refused (`NOT_CANCELLABLE`); nothing is held for
  such orders so no compensation is ever needed.
- When an order's stock was already released because of `PaymentFailed`, a subsequent
  `OrderCancelled` does not release again (FR-015).
- The payment service treats `OrderPlaced` as the source of customer id and amount; it stores
  these until `StockReserved` arrives (or vice versa).
- Timeout cancellation emits `OrderCancelled` exactly like a customer cancellation, so inventory
  and payment compensate identically.
- Event ids are generated by each service with a service-specific prefix and a counter, which
  guarantees uniqueness without randomness.
- Both `qty` and `amount` must be positive integers (≥ 1); 0 is invalid for either.
- Idempotency is keyed by (order id, step); a re-sent event with the same or a different id has
  no effect once the step was performed (decision delegated to the implementer by the owner).
- `tick(now)` with a `now` earlier than the placement time of an order simply does not cancel
  that order; time never moves orders backwards.
