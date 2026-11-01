# Implementation Plan: Payment Service (event-driven order flow)

**Branch**: `001-payment-service` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-payment-service/spec.md`

## Summary

Implement `createPaymentService(balances)` in `src/payment.ts` as a pure in-memory,
event-driven service. It learns order details from `OrderPlaced`, charges the customer on
`StockReserved` (emitting `PaymentSucceeded` / `PaymentFailed`), refunds on `OrderCancelled`
(emitting `PaymentRefunded`), and is idempotent at the event-id level and at the per-order
state level so that duplicate and out-of-order delivery never double-charges, double-refunds,
or loses a charge. Behaviour is specified as a Gherkin feature file run by cucumber-js;
step definitions drive the service directly with fabricated events from the other services.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, ES2022, NodeNext) on Node.js 24, loaded via tsx

**Primary Dependencies**: none at runtime (only `node:crypto` for `randomUUID`); dev:
`@cucumber/cucumber` 11, `tsx`, `typescript`, `@types/node`

**Storage**: N/A — in-memory `Map`/`Set` inside the factory closure

**Testing**: cucumber-js via `npm test` (config `cucumber.cjs`: features from
`tests/features/**/*.feature`, steps from `tests/steps/**/*.ts`, support from
`tests/support/**/*.ts`); `npm run typecheck` for `tsc --noEmit`

**Target Platform**: Node.js library module consumed by the team's integration entry
`src/shop.ts`

**Project Type**: single library module (one service file) + BDD tests

**Performance Goals**: N/A — every `handle` call is O(1) map lookups; test suite runs in
well under a second

**Constraints**: only `src/payment.ts` and `tests/**` may be touched; `src/events.ts`,
`src/shop.ts`, `src/order.ts`, `src/inventory.ts` are read-only; no DB, no network, no
wall-clock; all amounts integers

**Scale/Scope**: single process, tens of orders in tests; state grows linearly with number
of distinct orders and event ids seen (acceptable for the in-memory benchmark scope)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Shared Contract Is Immutable | No change to `src/events.ts` / `src/shop.ts`; `createPaymentService(balances: Record<string, number>): PaymentService` implemented exactly | PASS — plan only edits `src/payment.ts` |
| II. Service Ownership & Isolation | Only `src/payment.ts` + `tests/**` edited; no import of order/inventory modules; state in closure; irrelevant events return `[]` | PASS |
| III. Test-First With Executable Specifications | Feature file + steps written before implementation; red first, then green; `npm test` green at the end; tests fabricate colleagues' events | PASS — tasks ordered feature → steps → red run → implement |
| IV. Event-Delivery Robustness | Event-id dedupe set + per-order state machine; unique ids via `randomUUID`; integer amounts; ISO time untouched | PASS — see research.md R1–R3 |
| V. Simplicity & Determinism | One file, one closure, two maps and one set; no randomness except event ids (tests assert uniqueness, not value) | PASS |

Post-design re-check (after Phase 1): no new violations; no entries needed in Complexity
Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-payment-service/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── payment-service.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── events.ts            # shared contract (read-only)
├── shop.ts              # integration entry (read-only)
├── order.ts             # colleague's (read-only, empty shell)
├── inventory.ts         # colleague's (read-only, empty shell)
└── payment.ts           # THIS FEATURE: createPaymentService

tests/
├── features/
│   └── payment.feature  # Gherkin scenarios for the payment service
├── steps/
│   └── payment.steps.ts # step definitions driving createPaymentService
└── support/
    └── world.ts         # custom World: service instance, collected events, helpers
```

**Structure Decision**: Single-project layout as already established by the repository.
Product code stays in `src/payment.ts` (the only owned source file). Tests follow the
existing `cucumber.cjs` globs: feature files under `tests/features/`, step definitions under
`tests/steps/`, support code under `tests/support/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no violations.
