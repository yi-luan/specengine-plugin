# Implementation Plan: Order State Machine

**Branch**: `001-order-state-machine` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-order-state-machine/spec.md`

## Summary

Implement a pure, in-memory order lifecycle (CREATED → PAID → SHIPPED → REFUNDED, with
CANCELLED reachable from CREATED/PAID) as five exported pure functions in `src/order.ts`
with the exact signatures fixed by the requirement. Every operation returns
`{ ok: true, order }` with a fresh order object or `{ ok: false, reason }` with one of four
fixed reason codes, checked in the order state → amount validity → amount comparison.
Behaviour is specified as Gherkin features under `tests/features/` and verified by
cucumber-js step definitions under `tests/steps/`, run with `npm test`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, `module: NodeNext`), executed on Node.js 24 via `tsx`

**Primary Dependencies**: none at runtime; devDependencies `@cucumber/cucumber` 11.x, `tsx`, `typescript`, `@types/node` (all already installed)

**Storage**: N/A (pure functions over in-memory values)

**Testing**: cucumber-js via `npm test` (`node --import tsx .../cucumber.js`, config `cucumber.cjs`: features from `tests/features/**/*.feature`, steps from `tests/steps/**/*.ts` and `tests/support/**/*.ts`); `npm run typecheck` for `tsc --noEmit`

**Target Platform**: Node.js 24 library (ES modules)

**Project Type**: library (single project)

**Performance Goals**: each operation is O(1); full acceptance suite completes in < 10 s (SC-004)

**Constraints**: public interface of `src/order.ts` fixed verbatim; functions MUST be pure (no mutation of input); amounts are integer dollars; no new dependencies

**Scale/Scope**: 1 module, 5 functions, 4 reason codes, ~25 acceptance scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. TypeScript Only | `src/order.ts` and all tests are `.ts`; `tsc --noEmit` passes | PASS (planned) |
| II. BDD with cucumber-js | Every FR-001…FR-017 and every acceptance scenario maps to a Gherkin scenario calling the real exports | PASS (traceability table in tasks.md) |
| III. `npm test` single gate | Features placed under `tests/features/` so the existing `cucumber.cjs` discovers them; red observed before green | PASS (planned) |
| IV. Source/Test layout | `src/order.ts`; `tests/features/`, `tests/steps/`, `tests/support/`; no test imports from src other than the public module | PASS |
| V. Simplicity & pure functions | No framework/DB/CLI; no new deps; copy-on-success | PASS |

Post-Phase-1 re-check: design introduces no additional projects, abstractions or dependencies. All gates still PASS. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-order-state-machine/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── order-api.md     # public TypeScript contract of src/order.ts
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # existing placeholder (unchanged)
└── order.ts             # the feature: types + createOrder/pay/ship/cancel/refund

tests/
├── features/
│   └── order-state-machine.feature   # Gherkin scenarios (US1–US3 + edge cases)
├── steps/
│   └── order.steps.ts                # step definitions calling src/order.ts
└── support/
    └── world.ts                      # custom World holding current order / last result / snapshot
```

**Structure Decision**: Single-project library layout mandated by the constitution and the
existing `cucumber.cjs` / `tsconfig.json`. The feature is one source module and one feature
file; no sub-folders (`models/`, `services/`) are warranted for five functions.

## Design Notes

- **Check order** (FR-013): every function first validates state (`INVALID_TRANSITION`), then
  the amount's validity (`INVALID_AMOUNT`: must be a finite integer > 0), then the comparison
  (`AMOUNT_MISMATCH` for pay, `REFUND_EXCEEDS_PAID` for refund).
- **Purity**: success returns `{ ...order, ...changes }`; the input object is never written to.
  Tests capture a structural snapshot before each call and compare afterwards.
- **Cancel of PAID**: `refundedAmount = paidAmount`, `paidAmount` unchanged, status CANCELLED.
- **Refund**: `refundedAmount + amount > paidAmount` → reject; equal → REFUNDED; less → stays
  SHIPPED.

## Complexity Tracking

No constitution violations; table intentionally empty.
