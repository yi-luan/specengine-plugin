# bench-points Constitution

## Core Principles

### I. TypeScript Strict

All product and test code MUST be written in TypeScript and MUST pass `tsc --noEmit` with the
repository's `strict` compiler settings. `any` MUST NOT be used to bypass type checking without a
written justification in the code.

Rationale: strict types make contracts (exported types and functions) explicit and verifiable.

### II. Behavior-First Testing with cucumber-js

Every user-visible behavior defined in a feature spec MUST be expressed as at least one Gherkin
scenario executed by cucumber-js. Scenarios are written before (or together with) the
implementation and MUST fail before the implementation makes them pass (Red → Green → Refactor).

Rationale: Gherkin scenarios are the executable form of the spec and the acceptance criteria.

### III. Single Test Entry Point (`npm test`)

`npm test` is the one and only command used to run the test suite. It MUST discover and execute all
feature files and step definitions of the project, and a feature is only complete when `npm test`
exits with code 0 with no undefined, pending, or failing steps.

Rationale: one reproducible entry point removes ambiguity about what "green" means.

### IV. Source/Test Layout

Product code MUST live under `src/`. Tests MUST live under `tests/`: Gherkin feature files in
`tests/features/`, step definitions in `tests/steps/`, shared test support in `tests/support/`.
Product code MUST NOT import from `tests/`.

Rationale: a fixed layout keeps the cucumber configuration and reviews predictable.

### V. Simplicity & Pure Logic

Domain logic SHOULD be implemented as pure, deterministic functions (no I/O, no hidden clock, no
global state) whenever the requirement allows it; inputs such as "current time" MUST be passed in
explicitly. Fixed public interfaces given by requirements MUST NOT be renamed or reshaped.
Additional dependencies MUST be justified; YAGNI applies.

Rationale: pure functions are trivially testable and easy to reason about.

## Technology Constraints

- Language: TypeScript (ES2022, NodeNext modules), executed through `tsx`.
- Test framework: `@cucumber/cucumber` (cucumber-js), configured in `cucumber.cjs`.
- Runtime: Node.js; no Python tooling is available or permitted in the workflow.
- Monetary amounts, where present, are handled as integers unless a spec states otherwise.

## Development Workflow & Quality Gates

- Spec Kit flow: constitution → specify → clarify → plan → tasks → implement → converge.
- Gate 1: `npm test` passes with zero failing/undefined/pending steps.
- Gate 2: `npm run typecheck` passes.
- Gate 3: every functional requirement in the spec maps to at least one scenario.
- Reviews MUST check compliance with this constitution; deviations MUST be recorded in the plan's
  Complexity Tracking section.

## Governance

This constitution supersedes other practices in this repository. Amendments require a documented
change to this file with a Sync Impact Report, a version bump per semantic versioning (MAJOR for
principle removals/redefinitions, MINOR for added principles/sections, PATCH for wording), and an
updated Last Amended date. Every plan MUST include a Constitution Check against these principles.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
