<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all five principle slots defined)
  - I. TypeScript Strict
  - II. Behaviour-Driven Tests with cucumber-js (NON-NEGOTIABLE)
  - III. Source / Test Layout
  - IV. Shared-Store Correctness
  - V. Simplicity and Determinism
- Added sections: Technology Constraints; Development Workflow & Quality Gates; Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read this file at runtime)
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. TypeScript Strict

All product and test code MUST be TypeScript compiled under the repository `tsconfig.json`
(`strict: true`, `module: NodeNext`, ES2022 target). `npm run typecheck` (`tsc --noEmit`)
MUST pass with zero errors before any feature is considered done. `any` is forbidden except
where an external library forces it, and such uses MUST carry a comment stating why.
Rationale: the project is graded on exported type contracts; strict typing catches
contract drift at compile time instead of at review time.

### II. Behaviour-Driven Tests with cucumber-js (NON-NEGOTIABLE)

Every functional requirement MUST be expressed as Gherkin scenarios executed by
`@cucumber/cucumber` through `npm test`. The workflow is Red → Green: feature files and
step definitions are written (and observed to fail) before the implementation that makes
them pass. `npm test` MUST exit 0 with every scenario passing and zero undefined,
pending or ambiguous steps before a feature is complete. Tests MUST be hermetic: no real
database, no network, no wall clock; all external dependencies are injected
(in-memory `Store`, injected `now()`).
Rationale: cucumber scenarios are the executable specification; they are the only
acceptance evidence the project recognises.

### III. Source / Test Layout

Product code lives exclusively under `src/`. Test code lives exclusively under `tests/`:
feature files in `tests/features/**/*.feature`, step definitions in `tests/steps/**/*.ts`,
shared hooks and World/support code in `tests/support/**/*.ts`. Product code MUST NOT
import from `tests/`; test code MUST import product code only through its public exports.
Public module names and exported signatures fixed by a requirement document MUST be
used verbatim and MUST NOT be renamed.
Rationale: `cucumber.cjs` and `tsconfig.json` are wired to these paths; renaming breaks
the harness and the external grader.

### IV. Shared-Store Correctness

When a feature runs on multiple servers that share only a `Store`, every invariant
(no oversell, per-customer limits, idempotent replays) MUST hold under concurrent
interleaving of store operations, server crashes between any two store calls, and
delayed resumption of a stalled server. State MUST NOT be kept in module-level variables
or per-instance memory that other servers would need; it MUST be derived from the store.
Each such invariant MUST have at least one scenario that exercises the adverse case
(two servers interleaving, a replayed request, a crash mid-operation).
Rationale: the requirement is explicit that correctness under contention and failure is
the product; a happy-path-only test suite proves nothing.

### V. Simplicity and Determinism

Start with the simplest design that satisfies the specification; add abstraction only
when a second concrete use exists (YAGNI). All time MUST come from the injected `now()`
clock and all identifiers MUST be deterministic or derivable from inputs, so that tests
are repeatable without retries or sleeps. Integer quantities MUST be validated as
integers at the boundary.
Rationale: determinism keeps the cucumber suite fast and flake-free; simplicity keeps the
concurrency reasoning auditable.

## Technology Constraints

- Language/runtime: TypeScript 5.x on Node.js (ESM, `"type": "module"`), executed via `tsx`.
- Test runner: `@cucumber/cucumber` 11.x; configuration in `cucumber.cjs`; run with `npm test`.
- Type checking: `tsc --noEmit` via `npm run typecheck`.
- No additional runtime dependencies MAY be added without an amendment to this constitution;
  dev-dependencies MAY be added only when required by the test harness.
- No real databases, message brokers, or network calls in any code path exercised by tests.

## Development Workflow & Quality Gates

- Spec Kit phases are followed in order: constitution → specify → clarify → plan → tasks →
  implement → converge. A phase MUST NOT start until its predecessor's artifact exists.
- Gate for "implementation complete": `npm run typecheck` passes AND `npm test` passes with
  all scenarios green AND every functional requirement in the spec maps to at least one
  scenario.
- Open questions that need a product decision MUST be surfaced to the requirement owner;
  the implementer MUST NOT invent business answers. Purely technical environment decisions
  MAY be made by the implementer and MUST be recorded.
- Commits are made only at the end of the workflow unless the operator instructs otherwise.

## Governance

This constitution supersedes any other convention in the repository. Amendments MUST be
recorded in this file with an incremented semantic version (MAJOR for removed or redefined
principles, MINOR for new principles or materially expanded guidance, PATCH for wording
fixes), an updated `Last Amended` date, and a Sync Impact Report comment at the top of the
file. Every plan and task list MUST include a Constitution Check that verifies compliance
with Principles I–V; any violation MUST be justified in writing in the plan's Complexity
Tracking table or the plan MUST be revised.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
