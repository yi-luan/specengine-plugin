<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification; all template placeholders filled)
- Added sections:
  - Core Principles I–V (TypeScript-Only, Behaviour Tests With cucumber-js,
    Test-First, Single Test Entry Point `npm test`, Fixed Layout src/ + tests/)
  - Technology Constraints
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: none
- Templates requiring updates: none (plan/spec/tasks templates read the
  constitution at runtime; no placeholder references needed changing)
- Follow-up TODOs: none
-->
# bench-points Constitution

## Core Principles

### I. TypeScript-Only
All product code and all test code MUST be written in TypeScript (`.ts`) under
`strict` mode as configured in `tsconfig.json`. JavaScript source files MUST NOT
be added to `src/` or `tests/`. Public interfaces whose signatures are fixed by a
requirement document MUST be exported exactly as specified (same names, same
types), because downstream callers and tests depend on them verbatim.

Rationale: a single typed language keeps the contract between specification,
tests and implementation checkable by the compiler.

### II. Behaviour Tests With cucumber-js
Acceptance behaviour MUST be expressed as Gherkin `.feature` files executed by
cucumber-js. Step definitions MUST live in `tests/steps/` and shared support code
in `tests/support/`, as wired in `cucumber.cjs`. Each functional requirement in a
feature specification MUST be covered by at least one scenario.

Rationale: Gherkin scenarios are the executable form of the specification; they
are the acceptance criteria the business can read.

### III. Test-First (NON-NEGOTIABLE)
Scenarios and step definitions MUST be written before the implementation that
makes them pass. The red-green cycle is enforced: new scenarios MUST fail first,
then implementation is added until `npm test` is fully green. Tests MUST NOT be
weakened, skipped or deleted to achieve green.

Rationale: writing tests first guarantees the tests describe required behaviour
rather than whatever the code happens to do.

### IV. Single Test Entry Point: `npm test`
`npm test` is the one and only command that defines "the tests pass". It MUST
run every feature file and every step definition and MUST exit non-zero on any
failure or undefined/pending step. Any new test MUST be discoverable by
`npm test` without extra flags.

Rationale: one unambiguous gate lets humans and automation agree on done.

### V. Fixed Layout: Product Code in `src/`, Tests in `tests/`
Product code MUST reside in `src/`. Tests (features, steps, support) MUST reside
in `tests/`. Product modules MUST NOT import from `tests/`, and `src/` MUST NOT
contain test-only helpers. Business logic SHOULD be pure functions with no
database, network or filesystem access unless a requirement explicitly demands
it.

Rationale: a stable, predictable layout keeps tooling (`cucumber.cjs`,
`tsconfig.json`) simple and prevents test code from leaking into shipped code.

## Technology Constraints

- Runtime: Node.js (ES modules, `"type": "module"`), executed via `tsx` loader.
- Language: TypeScript 5.x, `strict: true`, `module: NodeNext`.
- Test framework: `@cucumber/cucumber` 11.x; configuration in `cucumber.cjs`.
- Type checking: `npm run typecheck` (`tsc --noEmit`) MUST pass alongside
  `npm test`.
- Dependencies: no new runtime dependencies MAY be added without a documented
  justification in the feature plan.

## Development Workflow & Quality Gates

- Every feature follows the Spec Kit cycle: constitution → specify → clarify →
  plan → tasks → implement → converge.
- A feature is complete only when: (1) every functional requirement maps to at
  least one passing scenario, (2) `npm test` is green with zero undefined or
  pending steps, (3) `npm run typecheck` is clean.
- Ambiguities discovered during specification MUST be resolved with the
  requirement owner and recorded in the spec; the implementer MUST NOT silently
  invent business rules.

## Governance

This constitution supersedes all other project practices. Amendments MUST be
made by editing this file, bumping the version according to semantic versioning
(MAJOR for incompatible principle removal/redefinition, MINOR for new or
materially expanded principles, PATCH for clarifications), and updating the
"Last Amended" date. Every plan MUST include a Constitution Check that verifies
compliance with Principles I–V; violations MUST be justified in writing or
removed. Reviews of pull requests and converge runs MUST verify that `npm test`
is green and that the fixed layout and public interfaces are intact.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
