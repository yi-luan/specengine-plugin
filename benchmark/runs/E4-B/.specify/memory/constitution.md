# bench-points Constitution

## Core Principles

### I. TypeScript Only

All product code and all test code MUST be written in TypeScript under `strict` mode as
configured in `tsconfig.json`. JavaScript source files MUST NOT be added to `src/` or `tests/`.
Public interfaces that a requirement fixes by name and signature MUST be exported exactly as
specified; renaming or reshaping a fixed interface is forbidden.

Rationale: a single typed language keeps the contract between tests and implementation
machine-checkable (`npm run typecheck`) and avoids drift between declared and real behaviour.

### II. Behaviour-Driven Tests with cucumber-js (NON-NEGOTIABLE)

Every functional requirement MUST be covered by at least one Gherkin scenario executed by
cucumber-js. Feature files live in `tests/features/**/*.feature`; step definitions live in
`tests/steps/**/*.ts`; shared hooks/world live in `tests/support/**/*.ts`. Tests MUST be written
(red) before or alongside the implementation and MUST be green before a task is considered done.
Scenarios MUST state observable behaviour (inputs → outputs), not implementation details.

Rationale: the requirement is business-rule heavy; executable Gherkin keeps the rules readable
by non-engineers and guarantees that each rule is verified rather than assumed.

### III. Single Test Entry Point: `npm test`

`npm test` MUST run the entire cucumber-js suite via `cucumber.cjs` and MUST exit non-zero on any
failing, undefined, or pending step. No test MAY require a different command, environment
variable, database, or network to pass. CI and reviewers rely on `npm test` alone as the gate.

Rationale: one deterministic command removes ambiguity about what "tests pass" means.

### IV. Fixed Source Layout (src/ and tests/)

Product code MUST live under `src/`; test code MUST live under `tests/`. Nothing in `src/` MAY
import from `tests/`. Configuration files stay at the repository root. New top-level directories
MUST NOT be introduced without amending this constitution.

Rationale: a fixed layout lets cucumber's loader globs, the TypeScript `include` list, and
reviewers find everything without per-feature configuration.

### V. Pure, Simple, Integer-Safe Domain Logic

Domain functions MUST be pure (no I/O, no database, no global mutable state) and deterministic.
Money and points MUST be handled as integers (whole currency units / whole points); floating-point
arithmetic MUST NOT be used for amounts, and any rounding rule MUST be explicit in the spec and
tested. Prefer the simplest implementation that satisfies the spec (YAGNI); no speculative
abstractions, frameworks, or dependencies beyond those already in `package.json`.

Rationale: pure integer logic is trivially testable, order-independent, and free of
floating-point surprises in financial calculations.

## Technology Constraints

- Language/runtime: TypeScript 5.x on Node.js (ESM, `"type": "module"`, `NodeNext` resolution).
- Test runner: `@cucumber/cucumber` 11.x, loaded through `tsx`; configuration in `cucumber.cjs`.
- Allowed dev dependencies: those already declared in `package.json`. Adding a dependency
  requires a documented justification in the feature plan.
- No runtime dependencies, no database, no network access in domain code.

## Development Workflow & Quality Gates

- Workflow: Spec Kit flow in order — constitution → specify → clarify → plan → tasks →
  implement → converge. Specs and plans live under `specs/<feature>/`.
- Every feature MUST produce: a spec with testable acceptance scenarios, a plan that passes the
  Constitution Check, a task list, Gherkin features + step definitions, and implementation.
- Definition of Done for any task: `npm test` green, `npm run typecheck` clean, and all
  acceptance scenarios of the spec represented as cucumber scenarios.
- Ambiguities in requirements MUST be resolved through the clarify step (recorded in the spec),
  not by silent assumption; when an assumption is unavoidable it MUST be written in the spec.

## Governance

This constitution supersedes all other development practices in this repository. Amendments
require: (1) a written change to this file, (2) a version bump following semantic versioning —
MAJOR for removing/redefining a principle, MINOR for adding a principle or materially expanding
guidance, PATCH for clarifications — and (3) an updated Sync Impact Report. Every plan MUST
include a Constitution Check that verifies compliance with Principles I–V; any violation MUST be
justified in the plan's Complexity Tracking table or the plan MUST be revised.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
