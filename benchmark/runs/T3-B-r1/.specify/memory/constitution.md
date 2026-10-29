<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all five template slots filled)
- Added sections: Core Principles (I–V), Technology Stack & Layout, Development Workflow, Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read the constitution at runtime)
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. TypeScript Only
All product code and test code MUST be written in TypeScript under `strict` mode as configured in
`tsconfig.json`. No JavaScript source files are permitted in `src/` or `tests/`. Type-level contracts
(exported `type`/`interface` declarations) are part of the public API and MUST be preserved exactly
as specified by the feature requirement when the requirement fixes them.

Rationale: strict typing catches contract drift between spec, tests, and implementation at compile
time, which is the cheapest place to catch it.

### II. Behaviour-Driven Tests with cucumber-js (NON-NEGOTIABLE)
Every feature MUST be verified by Gherkin feature files executed by cucumber-js. Step definitions
live in `tests/steps/`, support code in `tests/support/`, and feature files in `tests/features/`.
Tests MUST be written before or alongside implementation; a feature is not complete until every
scenario passes. Scenarios MUST be derived from the acceptance criteria of the feature spec, and
each functional requirement MUST be covered by at least one scenario.

Rationale: executable specifications keep the spec and the code honest with each other.

### III. Single Test Entry Point
`npm test` MUST be the one command that runs the complete test suite and MUST exit non-zero on any
failure. No test may require a separate command, environment variable, or manual setup to be
discovered. `npm run typecheck` MUST also pass (zero TypeScript errors) before a feature is
considered done.

Rationale: a single green command is the only reliable convergence signal for humans and agents.

### IV. Product Code in `src/`, Tests in `tests/`
Product (runtime) code MUST live under `src/`. Test code (features, steps, support) MUST live under
`tests/`. Product code MUST NOT import from `tests/`, and test code MUST NOT contain business logic
that belongs in `src/`. Module file names requested by a feature requirement (e.g. `src/coupon.ts`)
MUST be used verbatim.

Rationale: a fixed layout lets tooling (cucumber config, tsconfig) stay stable across features.

### V. Pure, Deterministic Domain Logic
Domain functions MUST be pure: no I/O, no database, no clock reads, no global mutable state. Any
time-dependent behaviour MUST receive the current time as an input parameter. Monetary values MUST
be handled as integers (whole currency units) with explicit, documented rounding rules. Results
MUST be deterministic for identical inputs.

Rationale: purity makes every rule unit-testable with plain Gherkin tables and removes flakiness.

## Technology Stack & Layout

- Runtime: Node.js (ESM, `"type": "module"`), tests executed via `node --import tsx`.
- Language: TypeScript 5.x, `strict: true`, `module: NodeNext`.
- Test runner: `@cucumber/cucumber` 11.x configured in `cucumber.cjs`
  (features: `tests/features/**/*.feature`; steps/support: `tests/steps/**/*.ts`,
  `tests/support/**/*.ts`).
- Test reports are written to `reports/` (git-ignored).
- No runtime dependencies may be added without a documented justification in the feature plan.

## Development Workflow

- Features follow the Spec Kit flow: constitution → specify → clarify → plan → tasks → implement →
  converge. Each stage's artifact lives under `specs/<feature>/`.
- Ambiguities in requirements MUST be resolved through clarification questions recorded in the
  spec, not by silent assumption. Where an assumption is unavoidable it MUST be written down in
  the spec's Assumptions section.
- Definition of Done for a feature: all scenarios green under `npm test`, `npm run typecheck`
  clean, every functional requirement traceable to at least one scenario, and the public interface
  matches the requirement verbatim.

## Governance

This constitution supersedes all other project practices. Amendments require: a written rationale,
a version bump following semantic versioning (MAJOR for removing or redefining a principle, MINOR
for adding a principle or materially expanding guidance, PATCH for wording clarifications), and an
updated `Last Amended` date. Every plan MUST include a Constitution Check that verifies compliance
with Principles I–V before implementation starts; any violation MUST be justified in the plan's
Complexity Tracking table or removed.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
