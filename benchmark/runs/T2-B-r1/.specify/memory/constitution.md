<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all five placeholders filled)
- Added sections: Core Principles (I–V), Technology Constraints, Development Workflow, Governance
- Removed sections: none
- Templates: .specify/templates/plan-template.md, spec-template.md, tasks-template.md read the
  constitution at runtime; no edits required.
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. TypeScript-Only Product Code
All product code MUST be written in TypeScript (strict mode, ES modules, as configured in
`tsconfig.json`) and MUST live under `src/`. No JavaScript source files are permitted in `src/`.
Public interfaces that a requirement fixes by name (types, function signatures, file paths) MUST be
exported exactly as specified and MUST NOT be renamed.

Rationale: a single, strictly typed language keeps the contract between spec, tests and code
mechanically checkable.

### II. Behaviour Is Specified in Gherkin and Verified by cucumber-js
Every functional requirement MUST be expressed as one or more Gherkin scenarios in a `.feature`
file under `tests/features/`, with step definitions in `tests/steps/` (and shared support code in
`tests/support/`). cucumber-js is the only test runner. Scenarios MUST be concrete (real values,
observable outcomes) and MUST map 1:1 to the acceptance scenarios of the spec.

Rationale: executable specifications are the single source of truth for "done".

### III. `npm test` Is the Only Gate (NON-NEGOTIABLE)
`npm test` MUST run the full cucumber-js suite via the existing `cucumber.cjs` configuration and
MUST pass with zero failed, undefined, pending or ambiguous steps before any feature is considered
complete. No test may be skipped, tagged out or deleted to achieve green. New tests MUST be
discoverable by `npm test` without changes to the test command.

Rationale: one command, one answer; the gate must be impossible to argue with.

### IV. Test-First, Red Then Green
For each task, the feature scenarios and step definitions MUST exist and MUST be observed failing
before the corresponding product code is written. Implementation stops when `npm test` is green;
no speculative behaviour beyond the spec is added.

Rationale: tests written after code describe what was built, not what was required.

### V. Pure, Deterministic Domain Logic
Domain functions MUST be pure: they MUST NOT mutate their inputs, MUST NOT depend on global
mutable state, I/O, clocks or randomness, and MUST return new values. Failures are returned as
values (discriminated result types), never thrown, unless the spec explicitly says otherwise.
Monetary amounts are integers in the smallest unit (whole dollars for this project).

Rationale: purity makes every scenario reproducible and every function unit-testable in isolation.

## Technology Constraints

- Language/runtime: TypeScript 5.x on Node.js (ESM, `"type": "module"`), executed via `tsx`.
- Test framework: `@cucumber/cucumber` 11.x, configured by `cucumber.cjs`; feature globs are
  `tests/features/**/*.feature`, step/support globs are `tests/steps/**/*.ts` and
  `tests/support/**/*.ts`.
- Commands: `npm test` (behaviour gate), `npm run typecheck` (`tsc --noEmit`, MUST also pass).
- Directory layout: product code in `src/`, tests in `tests/`, Spec Kit artifacts in `specs/`,
  governance in `.specify/`.
- No new runtime dependencies MAY be added without a documented justification in the plan.

## Development Workflow

- Features follow the Spec Kit sequence: constitution → specify → clarify → plan → tasks →
  implement → converge. Each phase writes its artifact under `specs/<feature>/`.
- Ambiguities in a spec MUST be marked and resolved in the clarify phase, never silently assumed
  in code; unresolved assumptions MUST be recorded in the spec's Assumptions section.
- A task is complete only when its scenarios pass under `npm test` and `npm run typecheck` is
  clean.
- Code review (human or automated) MUST verify compliance with Principles I–V.

## Governance

This constitution supersedes all other development practices in this repository. Amendments
MUST be made by editing this file, bumping the version per semantic versioning (MAJOR for
incompatible principle removals/redefinitions, MINOR for new or materially expanded principles,
PATCH for clarifications), updating `Last Amended`, and recording the change in the Sync Impact
Report comment. Every plan MUST include a Constitution Check; any deviation MUST be justified in
the plan's Complexity Tracking table or rejected.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
