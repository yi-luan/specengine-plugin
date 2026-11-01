# Implementation Plan: Inventory Service (Stock Reservation)

**Branch**: `001-inventory-service` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-inventory-service/spec.md`

## Summary

Implement `createInventoryService(stock)` in `src/inventory.ts` as a pure in-memory event handler:
on `OrderPlaced` it reserves or rejects stock once per order id, on `PaymentFailed` /
`OrderCancelled` it returns a live reservation exactly once and emits `StockReleased`, and it
ignores redelivered events (same id), second `OrderPlaced` for a known order, and events that are
not its concern. Orders whose cancellation/failure arrives before `OrderPlaced` are remembered as
terminated so the late `OrderPlaced` reserves nothing. Behaviour is specified by cucumber-js
feature files under `tests/features/` with step definitions under `tests/steps/`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), ESM / NodeNext, executed with `tsx` on Node 24

**Primary Dependencies**: none at runtime; `@cucumber/cucumber` 11.x, `tsx`, `typescript` for tests

**Storage**: N/A (in-memory `Map`/`Set` only)

**Testing**: cucumber-js via `npm test` (config `cucumber.cjs`: features in `tests/features/**`,
steps in `tests/steps/**/*.ts`, support in `tests/support/**/*.ts`); `npm run typecheck`

**Target Platform**: Node.js library module, no I/O

**Project Type**: single library module inside a three-service shop (one engineer owns one file)

**Performance Goals**: O(1) per event; not a concern at benchmark scale

**Constraints**: only `src/inventory.ts` and inventory-owned tests may change; must satisfy the
fixed `InventoryService` interface in `src/events.ts`; no imports from `src/order.ts` /
`src/payment.ts`; event ids unique system-wide; at-least-once, unordered delivery

**Scale/Scope**: single file (~80 lines), ~20 scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Service Boundary | Only `src/inventory.ts` + `tests/**` touched; no import of order/payment code | PASS (design touches exactly these paths) |
| II. Fixed Shared Contract | Implements `InventoryService` and factory signature verbatim; emitted event ids unique system-wide | PASS (deterministic ids `inventory:<Type>:<orderId>`, see research R2) |
| III. Behaviour-Driven, Test-First | Every FR mapped to a Gherkin scenario in `tests/features/inventory.feature`; steps build incoming events themselves | PASS (quickstart lists scenario coverage) |
| IV. Event Robustness | Dedup by event id, one decision per order id, terminated-before-placement record | PASS (data-model state machine) |
| V. Simplicity / In-Memory | Three plain collections, no abstractions, no timers | PASS |

Post-design re-check (after Phase 1): no violations; Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-inventory-service/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── inventory-service.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── events.ts            # shared contract (fixed, read-only)
├── shop.ts              # integration entry (fixed, read-only)
├── inventory.ts         # THIS FEATURE: createInventoryService
├── order.ts             # colleague's (read-only, empty shell)
└── payment.ts           # colleague's (read-only, empty shell)

tests/
├── features/
│   └── inventory.feature        # Gherkin scenarios for FR-001..FR-013
├── steps/
│   └── inventory.steps.ts       # step definitions (build events, call handle, assert)
└── support/
    └── world.ts                 # cucumber World holding service instance + emitted events
```

**Structure Decision**: single library module. Product code is confined to `src/inventory.ts`
(the only file this engineer owns). Tests use the cucumber layout already wired in `cucumber.cjs`;
`tests/features/` is created by this feature because it does not exist yet.

## Complexity Tracking

No constitution violations; nothing to justify.
