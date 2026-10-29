<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification)
- Added sections:
  - Core Principles: I. TypeScript Only, II. Behaviour-Driven Tests with cucumber-js,
    III. `npm test` Is the Single Quality Gate, IV. Source/Test Layout, V. Simplicity & Pure Functions
  - Technology Constraints
  - Development Workflow
  - Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read this file at runtime)
- Follow-up TODOs: none
-->
# bench-points Constitution

## Core Principles

### I. TypeScript Only
All product code and test code MUST be written in TypeScript (`.ts`) and MUST pass
`tsc --noEmit` under the repository `tsconfig.json` (`strict: true`, `module: NodeNext`).
Plain JavaScript source files are not permitted under `src/` or `tests/`.
Rationale: one language and one strict compiler keep the public contracts honest and
catch shape errors before behaviour tests run.

### II. Behaviour-Driven Tests with cucumber-js
Every feature MUST be specified as Gherkin `.feature` files and verified by cucumber-js
step definitions. Each functional requirement and each acceptance scenario in a spec MUST
be traceable to at least one Gherkin scenario. Tests MUST exercise the real exported
functions from `src/`; stubbing the unit under test is forbidden.
Rationale: executable, human-readable scenarios are the shared contract between the
requirement owner and the implementer.

### III. `npm test` Is the Single Quality Gate (NON-NEGOTIABLE)
`npm test` (cucumber-js via `node --import tsx`) is the only accepted definition of
"tests pass". A feature is not complete until `npm test` discovers all of its scenarios
and reports zero failed, zero undefined and zero pending steps. Tests MUST be written
(and observed failing) before the implementation that makes them pass.
Rationale: a single command that anyone can run removes ambiguity about done-ness.

### IV. Source/Test Layout
Product code MUST live under `src/`; tests MUST live under `tests/` (Gherkin in
`tests/features/`, step definitions in `tests/steps/`, shared hooks/world in
`tests/support/`). Product code MUST NOT import from `tests/`, and tests MUST NOT
contain business logic that duplicates `src/`. Public module names and exported
signatures that a requirement declares as fixed MUST be kept verbatim.
Rationale: the cucumber configuration and `tsconfig.json` already assume this layout;
deviating breaks discovery.

### V. Simplicity & Pure Functions
Prefer small, pure, side-effect-free functions that return new values instead of
mutating inputs. No framework, database, network or CLI layer is added unless a
requirement demands it. Every added dependency or abstraction MUST be justified in the
feature plan's Complexity Tracking table.
Rationale: the project is a library of deterministic domain rules; purity keeps
scenarios independent and trivially repeatable.

## Technology Constraints

- Runtime: Node.js 24 (ES modules, `"type": "module"`), TypeScript 5.x, tsx loader.
- Test runner: `@cucumber/cucumber` 11.x configured by `cucumber.cjs`; feature paths and
  step globs declared there MUST NOT be narrowed.
- Only devDependencies already in `package.json` may be used unless a plan justifies
  adding more; no runtime dependencies by default.
- Monetary and quantity values are integers; floating point MUST NOT be used for money.

## Development Workflow

1. Specification (`/speckit-specify`) → clarification → plan → tasks → implementation.
2. Red-Green: write/extend `.feature` + steps, run `npm test` and see red, implement in
   `src/`, run `npm test` and see green, then refactor with the suite still green.
3. Before declaring a feature done: `npm run typecheck` and `npm test` MUST both succeed.
4. Spec, plan and tasks documents live under `specs/<feature>/` and MUST be updated when
   behaviour changes so that documentation never contradicts the tests.

## Governance

This constitution supersedes any other convention in the repository. Amendments MUST be
made by editing this file with an updated Sync Impact Report, a semantic version bump
(MAJOR for principle removal/redefinition, MINOR for new principle or materially expanded
guidance, PATCH for clarifications) and updated dates. Every plan MUST include a
Constitution Check that verifies compliance with Principles I–V; any violation MUST be
recorded and justified in the plan's Complexity Tracking table or the plan is rejected.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
