<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: all template placeholders replaced (initial ratification)
- Added sections: Technology Stack, Development Workflow and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. TypeScript Strict Product Code
All product code lives under `src/` and MUST be written in TypeScript compiled with `strict: true`
(see `tsconfig.json`). Public function signatures and exported types MUST be explicit; `any` MUST
NOT be used in exported APIs. Exported names defined by a technical interface spec are fixed and
MUST NOT be renamed.
Rationale: the feature contract is consumed by other code; compile-time guarantees keep it stable.

### II. Behavior Specified in Gherkin, Verified by cucumber-js
Observable behavior MUST be described as Gherkin scenarios and executed with cucumber-js through
`npm test`. Step Definitions live under `tests/steps/` and shared helpers under `tests/support/`.
A behavior without a scenario MUST NOT be considered delivered.
Rationale: scenarios are the single executable source of truth for what the system does.

### III. Test-First (NON-NEGOTIABLE)
Scenarios and Step Definitions MUST be written and observed failing (red) before the product code
that makes them pass (green). Refactoring MUST keep `npm test` green.
Rationale: a test that has never failed does not prove the behavior it claims to cover.

### IV. Pure, Dependency-Free Domain Logic
Domain logic (for example coupon application) MUST be implemented as pure functions with no
database, network, file-system, or clock access; the current time MUST be passed in as input.
Rationale: pure functions are deterministic and trivially testable under cucumber-js.

### V. Integer Money and Explicit Failure Results
All monetary amounts MUST be integer currency units; fractional results MUST be resolved by an
explicit, documented rounding rule rather than left implicit. Expected business failures MUST be
returned as explicit result values (for example `{ ok: false, reason }`) instead of thrown
exceptions. Rationale: money arithmetic must be exact and failure reasons must be observable to
callers.

## Technology Stack

- Runtime: Node.js with ES modules (`"type": "module"`), TypeScript 5.x, target ES2022.
- Test runner: `@cucumber/cucumber` executed via `npm test`; TypeScript loaded through `tsx`.
- Type checking: `npm run typecheck` (`tsc --noEmit`) MUST pass.
- New runtime or dev dependencies require a justification recorded in the plan.

## Development Workflow and Quality Gates

- Work proceeds as specification → clarification → plan → tasks → implementation → convergence.
- Before a change is considered complete, `npm test` MUST pass with zero failing scenarios and
  `npm run typecheck` MUST pass.
- Ambiguous requirements MUST be resolved with the requirement owner before implementation; the
  resolution is recorded in the specification.

## Governance

This constitution supersedes all other practices in this repository. Amendments require a written
change to this file, a recorded rationale, and a review of dependent artifacts (specification, plan,
tasks, and tests). Versioning follows semantic versioning: MAJOR for removed or redefined
principles, MINOR for new principles or materially expanded guidance, PATCH for wording fixes.
Every plan and convergence review MUST verify compliance with these principles; any violation MUST
be either fixed or explicitly justified in the plan's complexity tracking.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
