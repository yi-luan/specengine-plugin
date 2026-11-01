# Feature Specification: Inventory Service (Stock Reservation)

**Feature Branch**: `001-inventory-service`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "事件驅動下單流程（訂單、庫存、付款三個服務）— 團隊版 requirement.md；本人負責其中的「庫存服務」（src/inventory.ts）：收到 OrderPlaced 保留庫存並發 StockReserved / StockRejected，付款失敗或訂單取消時放回保留庫存，事件至少送達一次、可能重複、不保證順序。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reserve stock when an order is placed (Priority: P1)

When the order service announces a newly placed order (`OrderPlaced` with SKU and quantity), the
inventory service checks the stock it can still offer for that SKU. If enough is available it sets
the quantity aside for that order and announces `StockReserved`; otherwise it leaves stock untouched
and announces `StockRejected`.

**Why this priority**: This is the core job of the service; without it no order can proceed to
payment and no order can be rejected for lack of stock.

**Independent Test**: Start the service with a known stock table, feed it an `OrderPlaced` event
built by the test, and check both the announced event and the remaining available stock.

**Acceptance Scenarios**:

1. **Given** SKU "A" has 10 available, **When** an `OrderPlaced` for SKU "A" qty 3 arrives,
   **Then** the service announces exactly one `StockReserved` for that order and SKU "A" now has 7
   available.
2. **Given** SKU "A" has 2 available, **When** an `OrderPlaced` for SKU "A" qty 3 arrives,
   **Then** the service announces exactly one `StockRejected` for that order and SKU "A" still has 2
   available.
3. **Given** SKU "A" has 3 available, **When** an `OrderPlaced` for SKU "A" qty 3 arrives,
   **Then** the service announces `StockReserved` and SKU "A" has 0 available.
4. **Given** the stock table has no entry for SKU "Z", **When** an `OrderPlaced` for SKU "Z"
   arrives, **Then** the service announces `StockRejected` and reports 0 available for "Z".
5. **Given** SKU "A" has 5 available, **When** two different orders each place qty 3 for "A",
   **Then** the first is reserved (2 left) and the second is rejected (still 2 left).

---

### User Story 2 - Return reserved stock on payment failure or cancellation (Priority: P1)

When the payment service announces `PaymentFailed`, or the order service announces
`OrderCancelled` (customer cancellation or 15-minute timeout), the inventory service returns the
quantity it had set aside for that order so other customers can buy it again, and announces
`StockReleased`. Only quantities actually reserved are returned, and at most once per order.

**Why this priority**: Without release, failed and cancelled orders would permanently lock stock.

**Independent Test**: Reserve stock via `OrderPlaced`, then feed the failure/cancel event and check
that available stock is restored and the correct announcement is made.

**Acceptance Scenarios**:

1. **Given** order O1 reserved qty 3 of SKU "A" (7 left), **When** `PaymentFailed` for O1 arrives,
   **Then** the service announces exactly one `StockReleased` for O1 and "A" has 10 available.
2. **Given** order O1 reserved qty 3 of SKU "A" (7 left), **When** `OrderCancelled` for O1 arrives,
   **Then** the service announces exactly one `StockReleased` for O1 and "A" has 10 available.
3. **Given** order O1 was rejected (nothing reserved), **When** `OrderCancelled` or
   `PaymentFailed` for O1 arrives, **Then** available stock is unchanged and nothing is announced.
4. **Given** order O1's reservation was already returned (e.g. after `PaymentFailed`), **When**
   `OrderCancelled` for O1 arrives later (timeout or customer), **Then** stock is not returned a
   second time and no further `StockReleased` is announced.
5. **Given** order O1 reserved stock and `PaymentSucceeded` arrived, **When** `OrderCancelled` for
   O1 arrives (customer cancels a confirmed order), **Then** the reserved quantity is returned to
   available stock and exactly one `StockReleased` is announced.

---

### User Story 3 - Stay correct under duplicate and out-of-order delivery (Priority: P1)

The event bus may deliver the same event more than once and in any order. The inventory service
must never reserve or release the same order twice, and must not corrupt stock when a failure or
cancellation reaches it before the corresponding `OrderPlaced`.

**Why this priority**: Rule 8 makes this a hard correctness requirement; a single double-release
would create phantom stock.

**Independent Test**: Replay the same event object twice, and feed events in reversed order, then
check that stock and announcements equal the single, in-order outcome.

**Acceptance Scenarios**:

1. **Given** SKU "A" has 10 available, **When** the same `OrderPlaced` (same event id) for O1 qty 3
   is delivered twice, **Then** only the first delivery announces `StockReserved`, the second
   announces nothing, and "A" has 7 available.
2. **Given** O1 reserved qty 3, **When** the same `PaymentFailed` for O1 is delivered twice,
   **Then** only one `StockReleased` is announced and stock is returned exactly once.
3. **Given** SKU "A" has 10 available, **When** `OrderCancelled` for O1 arrives first and the
   `OrderPlaced` for O1 qty 3 arrives afterwards, **Then** the service remembers that O1 is
   cancelled, does not reserve, announces nothing, and "A" still has 10 available.
4. **Given** SKU "A" has 10 available, **When** `PaymentFailed` for O1 arrives first and the
   `OrderPlaced` for O1 qty 3 arrives afterwards, **Then** the service treats O1 as already
   terminated, does not reserve, announces nothing, and "A" still has 10 available.
5. **Given** an `OrderPlaced` for O1 was already handled (reserved or rejected), **When** another
   `OrderPlaced` for the same order id O1 arrives carrying a different event id, **Then** the
   service ignores it: no stock change and no announcement.

---

### User Story 4 - Ignore events that are not the inventory service's concern (Priority: P2)

Every event is broadcast to all three services. The inventory service must answer events it does
not act on (`StockReserved`, `StockRejected`, `StockReleased`, `PaymentSucceeded`,
`PaymentRefunded`) with no announcements and no stock change.

**Why this priority**: Required by the shared contract; cheap but mandatory for integration.

**Independent Test**: Feed each of these event types and check that nothing is announced and
available stock is unchanged.

**Acceptance Scenarios**:

1. **Given** any stock state, **When** a `PaymentSucceeded`, `PaymentRefunded`, `StockReserved`,
   `StockRejected` or `StockReleased` event arrives, **Then** the service announces nothing and
   available stock is unchanged.

---

### Edge Cases

- An `OrderPlaced` whose SKU is not in the initial stock table is treated as having 0 available
  and is rejected.
- Quantity exactly equal to available stock is reserved (available becomes 0).
- An `OrderPlaced` with quantity 0 or negative is rejected (`StockRejected`), stock unchanged.
- Two orders competing for the same SKU are served strictly in arrival order; the second is
  rejected if the first consumed too much.
- Release events (`PaymentFailed`, `OrderCancelled`) for orders that never reserved stock change
  nothing and announce nothing, but the order id is remembered as terminated so that a later
  `OrderPlaced` for it is not reserved.
- A cancellation after a payment failure (or vice versa) for the same order returns stock only
  once and announces `StockReleased` only once.
- Every announced event carries an identifier that is unique across the whole system, even when
  the same order goes through several announcements.

## Clarifications

### Session 2026-11-01

- Q: Should `OrderCancelled` also produce a `StockReleased` event? → A: Yes; whenever reserved
  stock is returned (payment failure or cancellation) announce `StockReleased`. Only the actually
  reserved quantity is returned, at most once per order; if nothing was reserved, add nothing and
  announce nothing.
- Q: What happens when a cancellation/failure arrives before `OrderPlaced`? → A: For
  `OrderCancelled` first: remember the order as cancelled; a later `OrderPlaced` is not reserved
  and announces nothing. For `PaymentFailed` first: engineer's judgement — handled the same way
  (order remembered as terminated, later `OrderPlaced` not reserved, nothing announced).
- Q: How are duplicates recognised? → A: The same event (same id) delivered again is ignored from
  the second delivery on: no state change, no announcement. For a second `OrderPlaced` with the
  same order id but a different event id: engineer's judgement — ignored as well (at most one
  reservation decision per order id; no stock change, no announcement).
- Q: How should the service respond to an `OrderPlaced` whose quantity is 0 or negative? → A:
  Engineer's judgement (owner delegated): treat it as an invalid order — announce `StockRejected`,
  change no stock, and record the order id as rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST be created from an initial stock table (SKU → integer quantity) and
  MUST report, for any SKU, the quantity currently available for reservation (initial quantity
  minus quantities set aside for live reservations; 0 for unknown SKUs).
- **FR-002**: On the first `OrderPlaced` for an order id, if the requested quantity is less than
  or equal to the available quantity for that SKU, the service MUST set the quantity aside for that
  order and announce exactly one `StockReserved` carrying the order id.
- **FR-003**: On the first `OrderPlaced` for an order id, if the requested quantity exceeds the
  available quantity, or is not a positive integer (0 or negative), the service MUST leave stock
  unchanged and announce exactly one `StockRejected` carrying the order id.
- **FR-004**: On `PaymentFailed` or `OrderCancelled` for an order with a live reservation, the
  service MUST return exactly the reserved quantity to available stock and announce exactly one
  `StockReleased` carrying the order id.
- **FR-005**: On `PaymentFailed` or `OrderCancelled` for an order with no live reservation
  (never reserved, rejected, or already released), the service MUST change no stock and announce
  nothing.
- **FR-006**: A reservation MUST be returned at most once per order, regardless of how many
  `PaymentFailed` / `OrderCancelled` events (or duplicates of them) arrive.
- **FR-007**: The service MUST treat a redelivered event (same event id) as already processed:
  no stock change and no announcement.
- **FR-008**: The service MUST make at most one reservation decision per order id. A second
  `OrderPlaced` for an already-handled order id (even with a different event id) MUST change no
  stock and announce nothing.
- **FR-009**: When `PaymentFailed` or `OrderCancelled` arrives before the `OrderPlaced` of the same
  order, the service MUST remember that order id as terminated; the later `OrderPlaced` MUST NOT
  reserve stock and MUST announce nothing.
- **FR-010**: On `PaymentSucceeded`, `PaymentRefunded`, `StockReserved`, `StockRejected` and
  `StockReleased`, the service MUST announce nothing and change no stock.
- **FR-011**: Every announced event MUST carry an identifier unique across the whole system.
- **FR-012**: The service MUST keep only its own state (stock and reservations); it MUST NOT read
  or call order or payment state.
- **FR-013**: All quantities are integers.

### Key Entities

- **Stock line**: a SKU with its initial quantity and the quantity currently available.
- **Reservation**: the quantity set aside for one order id and its state (reserved, released).
- **Order record**: what the service knows about an order id — reserved, rejected, released, or
  terminated-before-placement — used to make every decision at most once per order.
- **Processed-event record**: the identifiers of events already acted on, used to ignore
  redeliveries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of placed orders with sufficient stock receive exactly one `StockReserved`, and
  100% of orders with insufficient stock receive exactly one `StockRejected`.
- **SC-002**: After any sequence of orders, failures and cancellations, available stock for every
  SKU equals initial stock minus the sum of live reservations (never negative, never above initial).
- **SC-003**: Delivering every event twice, or in reversed order, produces the same final
  available stock and the same set of announcements as single, in-order delivery.
- **SC-004**: Every behaviour above is covered by an automated scenario and the full scenario suite
  passes.

## Assumptions

- The order service alone decides on the 15-minute timeout and announces it as `OrderCancelled`;
  the inventory service needs no clock.
- `PaymentSucceeded` requires no action from the inventory service: the reserved quantity simply
  stays unavailable (it has been sold).
- Redeliveries of the same event carry the same event id (that is what "the same event" means on
  the bus).
- Only the inventory service announces `StockReserved`, `StockRejected` and `StockReleased`, so an
  identifier scheme that is unique within the inventory service is unique system-wide.
- The initial stock table given at creation is the full catalogue; SKUs not listed have 0 stock.
- Order quantities are normally positive integers (the order service validates input); the
  inventory service still rejects non-positive quantities defensively (FR-003).
