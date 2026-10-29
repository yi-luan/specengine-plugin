# Research: Member Points Discount at Checkout

**Date**: 2026-10-20 | **Plan**: [plan.md](./plan.md)

The Technical Context contained no `NEEDS CLARIFICATION` items (the stack is fixed by the
constitution and the existing repository). The research below records the technical decisions
that the design relies on.

## R1. Computing the 30% cap without floating-point error

- **Decision**: `cap = Math.floor((orderAmount * 3) / 10)`.
- **Rationale**: `orderAmount` is validated as an integer first, so `orderAmount * 3` is an exact
  integer (safe for all realistic order sizes). Dividing an integer by 10 in IEEE-754 and
  flooring returns the exact mathematical floor for every safe integer, and no `0.3` literal
  (which is not representable in binary) ever enters the computation. Satisfies spec FR-003a
  (round down) and Constitution V (integer-safe).
- **Alternatives considered**:
  - `Math.floor(orderAmount * 0.3)` — rejected: `0.3` is inexact; for some inputs the product
    lands just below an integer boundary and floors one too low.
  - Integer remainder arithmetic `(n*3 - (n*3) % 10) / 10` — correct but less readable; no
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
