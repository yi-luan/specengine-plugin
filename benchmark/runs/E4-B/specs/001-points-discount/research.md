# Research: Member Points Discount at Checkout

**Date**: 2026-10-20 | **Plan**: [plan.md](./plan.md)

The Technical Context contained no `NEEDS CLARIFICATION` items (the stack is fixed by the
constitution and the existing repository). The research below records the technical decisions
that the design relies on.

## R1. Computing the 35% cap without floating-point error

*(Revised 2026-10-20 for change request E4: the cap was 30% = `floor(orderAmount * 3 / 10)`.)*

- **Decision**: `cap = Math.floor((orderAmount * 35) / 100)`.
- **Rationale**: `orderAmount` is validated as an integer first, so `orderAmount * 35` is an exact
  integer (safe for all realistic order sizes). Dividing an integer by 100 in IEEE-754 and
  flooring returns the exact mathematical floor for every safe integer (the fractional part is
  a multiple of 0.01, far larger than the rounding error of the quotient), and no `0.35` literal
  (which is not representable in binary) ever enters the computation. Satisfies spec FR-003a
  (round down) and Constitution V (integer-safe). Examples: 1000 → 350, 1001 → 350, 10 → 3.
- **Alternatives considered**:
  - `Math.floor(orderAmount * 0.35)` — rejected: `0.35` is inexact; for some inputs the product
    lands just below an integer boundary and floors one too low.
  - Reduced fraction `Math.floor((orderAmount * 7) / 20)` — mathematically identical and equally
    exact; not chosen because `35 / 100` reads directly as the 35% in the spec.
  - Integer remainder arithmetic `(n*35 - (n*35) % 100) / 100` — correct but less readable; no
    benefit over the chosen form.

## R2. Input validation strategy

- **Decision**: Use `Number.isInteger` plus sign comparisons for every numeric input, in the
  fixed order `INVALID_INPUT` (orderAmount ≤ 0 or non-integer; pointsBalance < 0 or
  non-integer) → `INVALID_POINTS` (pointsToUse < 0 or non-integer) → `INSUFFICIENT_POINTS`
  (pointsToUse > pointsBalance) → `EXCEEDS_LIMIT` (pointsToUse > cap).
- **Rationale**: `Number.isInteger` returns `false` for `NaN`, `±Infinity` and fractions, so one
  call covers all malformed numbers; early-return guards make the precedence (FR-011) explicit.
- **Alternatives considered**: a validation library (zod etc.) — rejected: adds a dependency
  for four comparisons (Constitution V, YAGNI); TypeScript types already enforce `number`.

## R3. Test layout for cucumber-js in this repository

- **Decision**: One feature file `tests/features/points-discount.feature` with `Scenario
  Outline`s per rule, and one step file `tests/steps/points-discount.steps.ts` using a typed
  World (`this.result`). No `tests/support/` directory.
- **Rationale**: `cucumber.cjs` already globs `tests/features/**/*.feature` and imports
  `tests/steps/**/*.ts` through the `tsx` loader, so `npm test` picks the files up with zero
  configuration. Scenario Outlines keep the table of inputs/outputs compact and readable for
  non-engineers (Constitution II).
- **Alternatives considered**: a unit-test runner (vitest/node:test) — rejected: Constitution II
  mandates cucumber-js and `npm test` only runs cucumber.

## R4. Failure reason representation

- **Decision**: `reason` is the plain string code (`'INVALID_INPUT' | 'INVALID_POINTS' |
  'INSUFFICIENT_POINTS' | 'EXCEEDS_LIMIT'`) typed as `string` in the public union, as the fixed
  interface declares `reason: string`. An internal `PointsDiscountReason` string-literal type
  documents the closed set without changing the public signature.
- **Rationale**: Clarification session fixed the codes; the public type must stay `string`
  (interface may not be renamed/reshaped). An exported literal union would be a (compatible)
  addition, but to keep the surface minimal it is kept internal and documented in the contract.
- **Alternatives considered**: human-readable sentences — rejected by clarification answers.
