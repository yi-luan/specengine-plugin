<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all five principle slots filled)
- Added sections: Core Principles (I–V), Technology Constraints, Development Workflow, Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read the constitution at runtime)
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. TypeScript-Only Product Code
All product code MUST be written in TypeScript (`strict` mode, ES modules per `tsconfig.json`) and
MUST live under `src/`. No JavaScript source files are permitted in `src/`. Public interfaces that a
requirement document fixes by name (types, function signatures, file paths) MUST be exported exactly
as specified and MUST NOT be renamed.

Rationale: a fixed, typed contract keeps the product code independently verifiable and prevents
accidental API drift.

### II. Pure, Deterministic Domain Logic
Business logic MUST be implemented as pure functions: no database, network, filesystem, or clock
access. Any time-dependent behaviour MUST take the current time as an explicit input. All money
amounts MUST be integer units (whole dollars); fractional results MUST be resolved by an explicit,
documented rounding rule.

Rationale: pure functions are trivially testable with cucumber-js and reproducible across runs.

### III. Behaviour-Driven Tests (NON-NEGOTIABLE)
Every feature MUST be covered by Gherkin `.feature` files with cucumber-js step definitions. Tests
MUST live under `tests/` (features in `tests/features/`, step definitions in `tests/steps/`,
shared support in `tests/support/`). `npm test` MUST discover and run every scenario, and the suite
MUST be green before a feature is considered complete. Scenarios MUST be written from the
requirement before or alongside implementation, and every functional requirement MUST map to at
least one scenario.

Rationale: executable specifications are the single source of truth for behaviour.

### IV. Explicit Failure Semantics
Functions that can fail MUST return a discriminated result (`ok: true | false`) rather than throw
for expected business failures. Each failure MUST carry a stable, human-readable reason string.
Unexpected failures (programming errors) MAY throw.

Rationale: callers need to distinguish and report business rejections without exception handling.

### V. Simplicity and YAGNI
Implement only what the specification requires. No speculative abstractions, configuration layers,
or extra dependencies beyond those already in `package.json` unless a task explicitly justifies
them. Prefer a single small module per feature.

Rationale: the project is small; added structure costs more than it returns.

## Technology Constraints

- Language: TypeScript 5.x, `strict: true`, `module: NodeNext`, target ES2022.
- Runtime: Node.js 24 with `tsx` loader (`node --import tsx`).
- Test framework: `@cucumber/cucumber` 11.x; configuration in `cucumber.cjs`.
- Test command: `npm test` (MUST be the only command needed to run the full suite).
- Type check: `npm run typecheck` (`tsc --noEmit`) MUST pass with zero errors.
- Directory layout: product code in `src/`, tests in `tests/`, reports in `reports/` (ignored).

## Development Workflow

1. Specification (`spec.md`) is written and clarified before planning.
2. Plan (`plan.md`) MUST record a Constitution Check; any violation MUST be justified in the
   Complexity Tracking table or the plan MUST be revised.
3. Tasks (`tasks.md`) MUST include test tasks for every user story; test tasks precede or accompany
   implementation tasks.
4. Implementation is complete only when `npm test` is green and `npm run typecheck` passes.
5. Convergence review (`/speckit-converge`) MUST report Converged before the feature is closed.

## Governance

This constitution supersedes all other development practices in this repository. Amendments MUST be
made by editing this file, bumping the version per semantic versioning (MAJOR: principle removal or
redefinition; MINOR: new principle or materially expanded guidance; PATCH: wording/clarification),
and updating the Last Amended date. Every plan and task list MUST be reviewed for compliance with
these principles; deviations MUST be documented and justified in the plan's Complexity Tracking
section.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
