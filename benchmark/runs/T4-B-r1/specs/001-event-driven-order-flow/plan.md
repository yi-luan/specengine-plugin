# Implementation Plan: Event-Driven Order Flow

**Branch**: `001-event-driven-order-flow` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-event-driven-order-flow/spec.md`

## Summary

Three in-memory services (order, inventory, payment) that coordinate a purchase purely through
broadcast events: place → reserve stock → charge → confirm, with compensation on stock rejection,
payment failure, customer cancellation and 15-minute timeout. Delivery is at-least-once and
unordered, so every service deduplicates per (order id, step) and tolerates prerequisites
arriving in any order. Implementation is a single TypeScript module `src/shop.ts` (fixed public
interface from the requirement) backed by one file per service, verified by cucumber-js feature
files under `tests/features/` driven by `npm test`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), Node.js 24, ESM (`"type": "module"`, NodeNext)

**Primary Dependencies**: none at runtime; dev: `@cucumber/cucumber` 11, `tsx` 4, `typescript` 5

**Storage**: N/A (in-memory `Map`s per service; no persistence)

**Testing**: cucumber-js via `npm test` (`node --import tsx .../cucumber.js`), feature files in
`tests/features/**/*.feature`, steps in `tests/steps/**/*.ts`, world in `tests/support/**/*.ts`;
`npm run typecheck` (`tsc --noEmit`)

**Target Platform**: Node.js library (no CLI, no server)

**Project Type**: library (single project)

**Performance Goals**: whole suite < 10 s (SC-005); every operation O(1) or O(#orders) for `tick`

**Constraints**: no DB, no network, no timers, no randomness; services must not reference each
other; public interface of `src/shop.ts` must match the requirement verbatim

**Scale/Scope**: a handful of orders per test; hundreds of events per run (SC-004)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Specification-First | PASS | spec.md complete, 6 clarifications recorded, no markers remain |
| II. Behaviour-Driven Tests | PASS | One `.feature` per user story in `tests/features/`; steps call only the public `OrderService`/`InventoryService`/`PaymentService` API; tests written before `src/` code |
| III. Single Verification Command | PASS | `cucumber.cjs` already discovers `tests/features/**` and `tests/steps/**`; `npm test` + `npm run typecheck` are the gates |
| IV. Fixed Public Interfaces | PASS | `src/shop.ts` exports exactly the declared types/functions; per-service files are internal and re-exported only via the declared factories |
| V. Simplicity and Determinism | PASS | Plain functions + closures + `Map`; ids from a monotonic counter; no new dependencies |

Post-design re-check (after Phase 1): still PASS. Splitting into four source files is the only
structural choice; it is justified below in Project Structure, not a violation.

## Project Structure

### Documentation (this feature)

```text
specs/001-event-driven-order-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── shop-api.md      # Phase 1 output: the fixed public interface + event contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── shop.ts                 # Public module: types + createOrderService/createInventoryService/createPaymentService
├── ids.ts                  # nextEventId(prefix): system-wide unique, deterministic event ids
├── order-service.ts        # OrderService implementation (orders, cancel, tick, status transitions)
├── inventory-service.ts    # InventoryService implementation (stock, reservations, release)
└── payment-service.ts      # PaymentService implementation (balances, charges, refunds)

tests/
├── features/
│   ├── successful-purchase.feature      # US1
│   ├── order-validation.feature         # US1 edge cases: DUPLICATE_ORDER / INVALID_INPUT / unknown lookups
│   ├── insufficient-stock-or-funds.feature  # US2
│   ├── customer-cancellation.feature    # US3
│   ├── timeout-cancellation.feature     # US4
│   └── reliable-delivery.feature        # US5 (duplicates, out-of-order, terminal states, ids)
├── steps/
│   └── shop.steps.ts                    # All step definitions (public API only)
└── support/
    └── world.ts                         # Custom World: services, event log, broadcast helper
```

**Structure Decision**: Single project. `src/shop.ts` is the only module tests import; the three
service files mirror the requirement's "three independent services" and make the no-shared-state
rule visible in the file layout. `src/index.ts` (pre-existing placeholder) is left untouched.

## Complexity Tracking

No constitution violations; table intentionally empty.
