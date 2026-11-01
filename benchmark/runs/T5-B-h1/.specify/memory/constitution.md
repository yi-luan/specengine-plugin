<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Initial ratification of the project constitution from the placeholder template.
- Modified principles: all template placeholders replaced (initial version, no prior titles).
- Added sections: Technology Stack and Constraints; Development Workflow.
- Removed sections: none.
- Deferred TODOs: none.
-->

# bench-points Constitution

## Core Principles

### I. TypeScript Strict Typing
All product code under `src/` MUST be written in TypeScript with `strict` compiler mode enabled.
Exported public APIs MUST match the signatures fixed in the feature request exactly (names, parameter
and return types). `any` MUST NOT appear in exported signatures. Rationale: the exported contract is
consumed by other code and by tests; compile-time checks catch contract drift early.

### II. Test-First (NON-NEGOTIABLE)
Behavior MUST be specified as Gherkin scenarios before implementation. Step definitions and tests MUST
be written and observed failing (red) before the production code that makes them pass (green). The
Red-Green-Refactor cycle MUST be followed. Rationale: every behavior claimed by the spec is backed by a
test that was proven capable of failing.

### III. No Shared Process State
Production modules MUST NOT keep mutable module-level state that is meant to be shared between
instances or servers. All state that multiple server instances must observe MUST go through the injected
storage abstraction. Time MUST be obtained only from the injected clock function; wall-clock calls such
as `Date.now()` or `new Date()` MUST NOT be used in production logic. Rationale: multi-server correctness
and deterministic testing both depend on this.

### IV. Hermetic Tests
Automated tests MUST NOT touch a real database, network service, or external system. Tests MUST use
in-memory fakes injected through the public interfaces. Every test MUST be deterministic and
independent of execution order. Rationale: the suite must be fast, reproducible, and runnable anywhere.

### V. Simplicity and Traceability
Implementations MUST follow the minimum necessary design (YAGNI). New runtime dependencies MUST be
justified in the plan. Every requirement in the spec MUST map to at least one Gherkin scenario, and
every scenario MUST map to a passing test. Rationale: small, traceable code is cheaper to verify and
to change.

## Technology Stack and Constraints

- Language and runtime: TypeScript on Node.js, with the TypeScript compiler (`tsc`) used for type checks.
- Behavior tests: Cucumber.js (`@cucumber/cucumber`), run through `npm test`. Feature files live under
  `.specengine/spec/features/` and `tests/features/`; step definitions and support code live under
  `tests/steps/` and `tests/support/`.
- Product code lives in `src/`. Test code lives in `tests/`. Generated reports (for example
  `reports/`) MUST NOT be committed.
- `npm test` is the single authoritative test command. It MUST exit successfully before any feature is
  considered complete.
- No database, cache, or message broker client is bundled in the product code; storage is always provided
  by the caller through an interface.

## Development Workflow

- Work proceeds in the Spec Kit order: constitution, specify, clarify, plan, tasks, implement, converge.
- Ambiguous requirements MUST be resolved through the clarify step with the requirement owner, or recorded
  as explicit assumptions in the spec. Assumptions MUST NOT be silently invented.
- A task is complete only when its tests pass under `npm test` and the relevant principles above still
  hold.
- Tests MUST NOT be weakened, deleted, or rewritten merely to make a failing implementation pass. Changing
  a test requires a corresponding change to the spec.
- Converge checks MUST confirm that every spec requirement is covered by a passing scenario before the
  feature is declared converged.

## Governance

This constitution supersedes other practices within this repository. Amendments MUST be recorded in this
file with an updated version and an explanation of the change. Versioning follows semantic versioning:
MAJOR for removals or incompatible redefinitions of principles, MINOR for new principles or materially
expanded guidance, PATCH for clarifications and wording fixes. Every plan and converge review MUST verify
compliance with the principles above; any violation MUST be either fixed or explicitly justified in the
plan's complexity or deviation section.

**Version**: 1.0.0 | **Ratified**: 2026-11-02 | **Last Amended**: 2026-11-02
