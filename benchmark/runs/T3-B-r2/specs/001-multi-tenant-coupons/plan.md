# Implementation Plan: Multi-Tenant Coupons

**Branch**: `001-multi-tenant-coupons` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-multi-tenant-coupons/spec.md`

## Summary

Provide a pure function `applyCoupons(input)` in `src/coupon.ts` that validates a checkout
request (tenant, order amount, presented coupons, current time) against the eight business
rules in a fixed precedence order, and returns either `{ ok: true, finalAmount, discount,
applied }` or `{ ok: false, reason }` with one of eight fixed reason codes. Behaviour is
specified and verified by cucumber-js Gherkin scenarios under `tests/`, run via `npm test`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, NodeNext ESM) on Node.js 24 via `tsx`

**Primary Dependencies**: none at runtime; `@cucumber/cucumber` 11.x, `tsx`, `typescript` (dev)

**Storage**: N/A (pure function; coupons are passed in by the caller)

**Testing**: cucumber-js (`npm test`), `tsc --noEmit` (`npm run typecheck`)

**Target Platform**: Node.js 24 library module

**Project Type**: library (single module)

**Performance Goals**: O(n) over the presented coupon list; no measurable latency target
(sub-millisecond for realistic n < 100)

**Constraints**: integer arithmetic only; no I/O; no clock access (time passed in); public
type and function names fixed by the requirement and MUST NOT be renamed

**Scale/Scope**: one exported function, four exported types, ~10 Gherkin scenarios groups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. TypeScript-Only Product Code | Code in `src/coupon.ts`, strict TS, names exactly as required | PASS |
| II. Pure, Deterministic Domain Logic | No I/O, `now` is an input, integer money, documented floor rule | PASS |
| III. Behaviour-Driven Tests | Feature files in `tests/features/`, steps in `tests/steps/`, run by `npm test`; every FR maps to a scenario | PASS (verified in tasks) |
| IV. Explicit Failure Semantics | `ApplyResult` discriminated union with fixed reason codes | PASS |
| V. Simplicity and YAGNI | One module, no new dependencies | PASS |

Post-Phase-1 re-check: design adds no additional modules or dependencies. All gates still PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-tenant-coupons/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── applyCoupons.md  # Phase 1 output (public function contract)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts             # existing barrel (re-exports coupon module)
└── coupon.ts            # applyCoupons + exported types

tests/
├── features/
│   └── coupon.feature   # Gherkin scenarios covering FR-001..FR-018
├── steps/
│   └── coupon.steps.ts  # step definitions calling applyCoupons
└── support/
    └── world.ts         # typed World holding the request under construction and the result
```

**Structure Decision**: Single-project library layout. `cucumber.cjs` already globs
`tests/features/**/*.feature`, `tests/steps/**/*.ts`, `tests/support/**/*.ts`, so no test
configuration change is needed.

## Design Overview

Rule evaluation order (FR-018), each stage returning the first failure found:

1. `INVALID_INPUT` — `orderAmount` not a positive integer.
2. `INVALID_COUPON` — any coupon whose `value` is not an integer, or PERCENT outside 1–100, or
   FIXED ≤ 0.
3. `TENANT_MISMATCH` — any coupon whose `tenantId !== input.tenantId`.
4. `DUPLICATE_COUPON` — any `tenantId + code` pair appearing twice.
5. `COUPON_EXPIRED` — any coupon where `!(validFrom <= now <= validTo)` by epoch-ms comparison.
6. `MIN_ORDER_NOT_MET` — any coupon with `minOrderAmount` defined and `orderAmount < minOrderAmount`.
7. `NOT_STACKABLE` — more than one coupon and at least one is non-stackable.
8. `DISCOUNT_EXCEEDS_AMOUNT` — `sum(floor(orderAmount * percent / 100)) + sum(fixed) > orderAmount`.

Each stage iterates coupons in presentation order so that, within a stage, the first
offending coupon determines the result (deterministic). Success returns
`finalAmount = orderAmount - discount`, `discount`, and `applied = coupons.map(c => c.code)`.

## Complexity Tracking

No constitution violations; table intentionally empty.
