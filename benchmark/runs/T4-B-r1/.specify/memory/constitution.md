<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all five placeholders filled)
- Added sections: Core Principles (I–V), Technology Constraints, Development Workflow, Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read the constitution at runtime; no edits required
- Follow-up TODOs: none
-->

# bench-points Constitution

## Core Principles

### I. Specification-First

Every feature MUST begin with a written specification (`specs/<feature>/spec.md`) before any
product code is written. The specification MUST describe observable behaviour in terms of user
scenarios and acceptance criteria, and MUST NOT prescribe implementation details. Open questions
MUST be surfaced as explicit clarification items rather than silently resolved by assumption.

Rationale: the project is a benchmark of spec-driven development; the specification is the
contract against which the implementation is judged.

### II. Behaviour-Driven Tests (NON-NEGOTIABLE)

Acceptance behaviour MUST be expressed as Gherkin feature files executed by cucumber-js. Each
acceptance scenario in the specification MUST map to at least one Gherkin scenario. Step
definitions MUST exercise the public interface of the product code only; they MUST NOT reach into
private state. Tests MUST be written before or alongside implementation and MUST fail before the
implementation that makes them pass exists (red → green).

Rationale: executable specifications keep the spec, tests, and code converged.

### III. Single Verification Command

`npm test` MUST run the entire cucumber-js suite and MUST exit non-zero on any failing, pending,
or undefined step. No work item is complete while `npm test` is not fully green. `npm run
typecheck` (tsc --noEmit, strict) MUST also pass before completion.

Rationale: one unambiguous gate avoids "works on my machine" and partial deliveries.

### IV. Fixed Public Interfaces

When a requirement declares a technical interface (exported names, type shapes, function
signatures), that interface MUST be implemented exactly as declared and MUST NOT be renamed,
reshaped, or extended with required parameters. Additional helpers MAY be exported only when they
do not conflict with the declared interface.

Rationale: external graders and consumers rely on the declared contract verbatim.

### V. Simplicity and Determinism

Implementations MUST stay in-memory, synchronous, and dependency-free beyond the devDependencies
already present (TypeScript, tsx, cucumber-js). No database, network, timers, or randomness MAY
be introduced. Behaviour MUST be deterministic for a given sequence of inputs. YAGNI applies: do
not add abstractions, configuration, or layers that the specification does not require.

Rationale: deterministic, minimal code is easier to verify against the specification and keeps
the test suite reliable.

## Technology Constraints

- Language: TypeScript (strict mode, ES2022 target, NodeNext modules, ESM `"type": "module"`).
- Test framework: cucumber-js (`@cucumber/cucumber`) loaded via `tsx`.
- Product code lives in `src/`; the requirement-declared entry point is `src/shop.ts`.
- Tests live in `tests/`: feature files in `tests/features/**/*.feature`, step definitions in
  `tests/steps/**/*.ts`, shared hooks/world in `tests/support/**/*.ts`.
- Configuration files `cucumber.cjs`, `tsconfig.json`, and `package.json` scripts MUST NOT be
  changed in ways that alter where tests or code are discovered.
- Runtime: Node.js 24; no Python or other toolchains are available or permitted.

## Development Workflow

1. `/speckit-constitution` → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
   `/speckit-tasks` → `/speckit-implement` → `/speckit-converge`, in that order.
2. Questions that require a decision from the requirement owner MUST be collected and asked in
   the prescribed format; the agent MUST NOT invent the owner's answers.
3. Every assumption made without the owner's answer MUST be recorded in the specification's
   Assumptions section and in `BENCH-LOG.md`.
4. Implementation is complete only when `/speckit-converge` reports Converged, `npm test` is
   green, and `npm run typecheck` passes.
5. All work is committed to the repository at the end of the run.

## Governance

This constitution supersedes all other project practices. Amendments MUST be made by editing
`.specify/memory/constitution.md`, recording the change in the Sync Impact Report comment, and
bumping the version according to semantic versioning: MAJOR for removing or redefining a
principle, MINOR for adding a principle or materially expanding guidance, PATCH for wording and
clarifications. Every plan MUST include a Constitution Check that verifies compliance with
Principles I–V before design proceeds; any violation MUST be justified in the plan's Complexity
Tracking table or removed.

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
