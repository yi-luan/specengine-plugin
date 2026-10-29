# Implementation Plan: Member Points Discount at Checkout

**Branch**: `001-points-discount` | **Date**: 2026-10-20 | **Revised**: 2026-10-20 (change request E4) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-points-discount/spec.md`

## Summary

Provide a pure TypeScript function `applyPointsDiscount` (exported from `src/points.ts` with the
fixed signature from the requirement) that validates a points-redemption request against four
ordered rules (`INVALID_INPUT` → `INVALID_POINTS` → `INSUFFICIENT_POINTS` → `EXCEEDS_LIMIT`),
returns `{ ok: true, finalAmount, remainingPoints }` on success and `{ ok: false, reason }`
otherwise. The 35% cap is `floor(orderAmount * 35 / 100)` points. Behaviour is verified by
cucumber-js scenarios run via `npm test`.

## Change History

- **E4 (2026-10-20)** — spec FR-003/FR-003a raised the per-order cap from 30% to 35%. Every
  other rule, reason code and the public interface are unchanged. Touch-points: the cap
  constant/comment in `src/points.ts`, the cap examples in `tests/features/points-discount.feature`
  (step definitions need no change), and the design documents in this directory
  (`research.md` R1, `data-model.md`, `contracts/points-api.md`, `quickstart.md`).

## Technical Context

**Language/Version**: TypeScript 5.6 (strict, ESM / NodeNext) on Node.js 22

**Primary Dependencies**: none at runtime; dev: `@cucumber/cucumber` 11.x, `tsx` 4.x, `typescript` 5.x, `@types/node`

**Storage**: N/A (pure function, no persistence)

**Testing**: cucumber-js (Gherkin features in `tests/features/`, steps in `tests/steps/`), run by `npm test`; `npm run typecheck` for `tsc --noEmit`

**Target Platform**: Node.js library module (platform-independent)

**Project Type**: library (single pure function module)

**Performance Goals**: O(1) per call, no allocation beyond the result object; not a concern

**Constraints**: integer-only arithmetic for money/points; no floating-point in business rules; fixed public interface names/types must not change; no new dependencies

**Scale/Scope**: one exported function, two exported types, ~40 lines of product code; ~20 scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. TypeScript Only | Product + tests in `.ts`, strict mode, fixed interface exported verbatim | PASS — `src/points.ts` exports exactly the required types/function |
| II. BDD with cucumber-js (NON-NEGOTIABLE) | Every FR covered by a Gherkin scenario; features in `tests/features/`, steps in `tests/steps/` | PASS — feature file maps FR-001..FR-011 to scenarios (see quickstart) |
| III. Single entry point `npm test` | Suite runs via `cucumber.cjs`; non-zero on fail/undefined/pending | PASS — existing config already globs `tests/features/**` and `tests/steps/**` |
| IV. Fixed layout | Code in `src/`, tests in `tests/`, no new top-level dirs | PASS — only `src/points.ts`, `tests/features/`, `tests/steps/` added |
| V. Pure, integer-safe logic | No I/O, deterministic, integer math, explicit rounding rule, YAGNI | PASS — cap uses integer multiply then floor-divide; `Number.isInteger` guards |

**Pre-Phase-0 result**: all gates PASS, no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/001-points-discount/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── points-api.md    # Public TypeScript contract of src/points.ts
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # existing placeholder (unchanged)
└── points.ts            # applyPointsDiscount + PointsDiscountInput / PointsDiscountResult

tests/
├── features/
│   └── points-discount.feature   # Gherkin scenarios for FR-001..FR-011
└── steps/
    └── points-discount.steps.ts  # cucumber step definitions calling applyPointsDiscount
```

**Structure Decision**: Single-project library layout mandated by Constitution IV. The existing
`cucumber.cjs` already loads `tests/features/**/*.feature` and `tests/steps/**/*.ts` through
`tsx`, so no configuration changes are needed. `tests/support/` is not needed because the
scenarios carry their own state in a per-scenario World object created by cucumber.

## Design Notes

- **Check order** (FR-011): implement as a straight-line sequence of guards returning early;
  this makes the precedence obvious and trivially testable.
- **Cap computation** (FR-003a): `const cap = Math.floor((orderAmount * 35) / 100);` —
  `orderAmount * 35` is an exact integer, dividing an integer by 100 and flooring yields the exact
  integer floor for all safe integers; no `0.35` literal is used. (E4: was `* 3 / 10` for 30%.)
- **Validation** (FR-009, FR-002, FR-005): `Number.isInteger(x)` rejects `NaN`, `Infinity` and
  fractional values; combined with sign checks this covers every invalid-input case.
- **Result shape**: discriminated union on `ok`; on failure no `finalAmount` / `remainingPoints`
  fields exist (FR-007).

## Complexity Tracking

> No constitution violations; table intentionally empty.

## Post-Design Constitution Re-check

Re-evaluated after Phase 1 (data-model, contracts, quickstart): all five gates still PASS. No
new dependencies, no new directories, interface unchanged, all rules expressed as integer
comparisons.

Re-evaluated again after change request E4 (35% cap): all five gates still PASS — the only
product-code change is the integer cap formula (Principle V: integer multiply then floor-divide,
rounding rule explicit in FR-003a and tested), the interface is untouched (Principle I), and the
changed scenarios remain cucumber features under `tests/` run by `npm test` (II, III, IV).
